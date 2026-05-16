#!/usr/bin/env python3
"""Worker for consuming sharecode import jobs from Redis queue."""

import asyncio
import json
import logging
import os
import signal
import uuid
from datetime import datetime, timezone
from typing import Dict

import redis
from psycopg2 import connect as pg_connect
from psycopg2.errors import Error as PgError

# Local imports
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sharecode_parser import parse_sharecode, SharecodeDecodeError
from platforms.steam import SteamDemoFetcher
from platforms.faceit import FaceitDemoFetcher
from platforms.esea import EseaDemoFetcher
from platforms.base import RetryableError, FatalError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Global state
shutdown_requested = False
in_flight_count = 0
in_flight_lock = __import__('threading').Lock()


def signal_handler(signum, frame):
    """Handle SIGTERM for graceful shutdown."""
    global shutdown_requested
    shutdown_requested = True
    logger.info(f'Received signal {signum}, initiating graceful shutdown')


def init_fetchers() -> Dict[str, object]:
    """Initialize platform-specific demo fetchers."""
    try:
        fetchers = {
            'steam': SteamDemoFetcher(os.getenv('STEAM_API_KEY')),
            'faceit': FaceitDemoFetcher(os.getenv('FACEIT_API_KEY')),
            'esea': EseaDemoFetcher(os.getenv('ESEA_API_KEY')),
        }
        logger.info('Demo fetchers initialized')
        return fetchers
    except ValueError as e:
        logger.error(f'Failed to initialize fetchers: {e}')
        raise


def get_db_connection():
    """Get PostgreSQL connection."""
    return pg_connect(
        host=os.getenv('DB_HOST', 'postgres'),
        port=int(os.getenv('DB_PORT', 5432)),
        database=os.getenv('DB_NAME', 'cs2_analysis'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres'),
    )


def get_redis_connection():
    """Get Redis connection."""
    return redis.from_url(
        os.getenv('REDIS_URL', 'redis://redis:6379'),
        decode_responses=True,
    )


async def process_job(job_data: dict, fetchers: Dict[str, object], db_conn, redis_conn):
    """Process a single import job (download, validate, save)."""
    global in_flight_count

    with in_flight_lock:
        in_flight_count += 1

    cursor = None
    try:
        sharecode = job_data['sharecode']
        user_id = job_data['user_id']
        import_id = job_data['sharecodedImportId']
        platform = job_data['platform']
        attempt_count = job_data.get('attemptCount', 0)

        logger.info(
            'Processing import job',
            extra={
                'sharecode': sharecode,
                'user_id': user_id,
                'import_id': import_id,
                'platform': platform,
                'attempt': attempt_count + 1,
            },
        )

        # Update status to downloading
        cursor = db_conn.cursor()
        cursor.execute(
            "UPDATE sharecode_imports SET status = %s WHERE id = %s",
            ('downloading', import_id),
        )
        db_conn.commit()

        # Get platform fetcher
        fetcher = fetchers.get(platform)
        if fetcher is None:
            raise FatalError(f'Unknown platform: {platform}')

        # Download demo with retry (D-15)
        try:
            demo_bytes = await fetcher.fetch_demo(sharecode)
        except Exception as e:
            logger.error(
                'Failed to download demo',
                extra={
                    'sharecode': sharecode,
                    'platform': platform,
                    'error': str(e),
                    'attempt': attempt_count + 1,
                },
            )
            raise

        # Update status to parsing
        cursor.execute(
            "UPDATE sharecode_imports SET status = %s WHERE id = %s",
            ('parsing', import_id),
        )
        db_conn.commit()

        # Save demo file to disk
        demo_id = str(uuid.uuid4())
        demo_dir = os.getenv('DEMO_STORAGE_DIR', '/storage/demos')
        os.makedirs(demo_dir, exist_ok=True)
        demo_path = os.path.join(demo_dir, f'{demo_id}.dem')

        with open(demo_path, 'wb') as f:
            f.write(demo_bytes)

        logger.info(f'Demo saved: {demo_path} ({len(demo_bytes)} bytes)')

        # Create Demo record (status: uploaded to match existing pattern)
        cursor.execute(
            """
            INSERT INTO demo (id, sharecode_import_id, file_path, storage_disk, uploaded_at, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                demo_id,
                import_id,
                demo_path,
                'local',
                datetime.now(timezone.utc),
                'uploaded',
            ),
        )
        db_conn.commit()

        # Update sharecode_imports to complete
        cursor.execute(
            """
            UPDATE sharecode_imports
            SET status = %s, demo_id = %s, completed_at = %s
            WHERE id = %s
            """,
            ('complete', demo_id, datetime.now(timezone.utc), import_id),
        )
        db_conn.commit()

        # Dispatch to analysis queue (D-09: continue pipeline)
        redis_conn.lpush('cs2.analysis', json.dumps({
            'demo_id': demo_id,
            'file_path': demo_path,
        }))

        logger.info(
            'Import succeeded',
            extra={
                'sharecode': sharecode,
                'demo_id': demo_id,
                'import_id': import_id,
            },
        )

    except FatalError as e:
        # Permanent error — don't retry (D-14 expiration, D-13 invalid format, etc)
        logger.error(f'Fatal import error: {e}')
        cursor = db_conn.cursor()
        cursor.execute(
            """
            UPDATE sharecode_imports
            SET status = %s, error_message = %s, completed_at = %s
            WHERE id = %s
            """,
            ('failed', str(e), datetime.now(timezone.utc), import_id),
        )
        db_conn.commit()

    except RetryableError as e:
        # Transient error — retry up to 3 times (D-15)
        if attempt_count < 2:
            logger.warning(f'Transient error, retrying: {e}')
            job_data['attemptCount'] = attempt_count + 1
            redis_conn.lpush('cs2.import', json.dumps(job_data))
        else:
            logger.error(f'Max retries exceeded: {e}')
            cursor = db_conn.cursor()
            cursor.execute(
                """
                UPDATE sharecode_imports
                SET status = %s, error_message = %s, completed_at = %s
                WHERE id = %s
                """,
                ('failed', f'Network timeout after 3 retries: {e}', datetime.now(timezone.utc), import_id),
            )
            db_conn.commit()

    except Exception as e:
        # Unexpected error
        logger.exception(f'Unexpected error processing import: {e}')
        cursor = db_conn.cursor()
        cursor.execute(
            """
            UPDATE sharecode_imports
            SET status = %s, error_message = %s, completed_at = %s
            WHERE id = %s
            """,
            ('failed', f'Unexpected error: {e}', datetime.now(timezone.utc), import_id),
        )
        db_conn.commit()

    finally:
        with in_flight_lock:
            in_flight_count -= 1


def main():
    """Main worker loop."""
    logger.info('Starting import worker')

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Initialize connections
    fetchers = init_fetchers()
    redis_conn = get_redis_connection()
    db_conn = get_db_connection()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        while not shutdown_requested:
            try:
                # Block until job available (timeout 5s)
                job = redis_conn.brpop('cs2.import', timeout=5)

                if job is None:
                    continue

                _, job_json = job
                job_data = json.loads(job_json)

                # Process job asynchronously
                loop.run_until_complete(process_job(job_data, fetchers, db_conn, redis_conn))

            except Exception as e:
                logger.exception(f'Error in main loop: {e}')
                # Continue processing next job

    finally:
        logger.info(f'Shutdown initiated, waiting for {in_flight_count} in-flight jobs...')

        # Wait for in-flight jobs (max 15 seconds)
        grace_period = 15
        elapsed = 0
        while in_flight_count > 0 and elapsed < grace_period:
            logger.info(f'Waiting for in-flight jobs: {in_flight_count} remaining ({grace_period - elapsed}s)')
            __import__('time').sleep(1)
            elapsed += 1

        if in_flight_count == 0:
            logger.info('All in-flight jobs completed gracefully')
        else:
            logger.warning(f'Grace period expired, {in_flight_count} jobs still in flight')

        # Cleanup
        db_conn.close()
        redis_conn.close()
        loop.close()
        logger.info('Worker shutdown complete')


if __name__ == '__main__':
    main()
