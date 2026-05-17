#!/usr/bin/env python3
"""Steam Community API demo fetcher with retry and timeout handling."""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from .base import PlatformDemoFetcher, DemoMetadata, RetryableError, FatalError

logger = logging.getLogger(__name__)


class SteamDemoFetcher(PlatformDemoFetcher):
    """Fetches demos from Steam Community API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('STEAM_API_KEY')
        if not self.api_key:
            raise ValueError('STEAM_API_KEY not provided')

        # Separate timeout: 5s connect, 300s read (for large file downloads)
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(5.0, read=300.0),
            limits=httpx.Limits(max_connections=5),
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((RetryableError, httpx.TimeoutException)),
        reraise=True,
    )
    async def fetch_demo(self, sharecode: str) -> bytes:
        """Download demo file from Steam Community API with retry."""
        from ..sharecode_parser import parse_sharecode

        try:
            # Decode sharecode to match IDs
            ids = parse_sharecode(sharecode)

            # Get demo metadata (checks expiration)
            metadata = await self.get_metadata(sharecode)

            # Download demo file
            demo_url = metadata.get('demo_url')
            if not demo_url:
                raise FatalError(f'Steam API did not return demo_url for {sharecode}')

            logger.info(f'Downloading demo from Steam: {demo_url}')

            try:
                response = await self.client.get(demo_url)
            except httpx.TimeoutException as e:
                raise RetryableError(f'Download timeout (will retry): {e}')

            if response.status_code == 429:
                raise RetryableError('Steam API rate limited (429)')
            if response.status_code in (500, 502, 503, 504):
                raise RetryableError(f'Steam API server error ({response.status_code})')
            if response.status_code == 404:
                raise FatalError(f'Demo not found on Steam (404) — likely expired')
            if response.status_code == 403:
                raise FatalError(f'Access denied to Steam API (403)')

            response.raise_for_status()

            demo_bytes = response.content

            # Validate file size (1KB - 500MB)
            if len(demo_bytes) < 1024:
                raise FatalError(f'Downloaded file too small ({len(demo_bytes)} bytes)')
            if len(demo_bytes) > 500 * 1024 * 1024:
                raise FatalError(f'Downloaded file too large ({len(demo_bytes)} bytes)')

            logger.info(f'Demo downloaded: {len(demo_bytes)} bytes')
            return demo_bytes

        except (RetryableError, FatalError):
            raise
        except Exception as e:
            logger.exception(f'Unexpected error fetching from Steam: {e}')
            raise FatalError(f'Unexpected error: {e}')

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(RetryableError),
        reraise=True,
    )
    async def get_metadata(self, sharecode: str) -> DemoMetadata:
        """Get demo metadata from Steam Community API."""
        from ..sharecode_parser import parse_sharecode

        try:
            ids = parse_sharecode(sharecode)

            # Call Steam API to get demo URL and metadata
            response = await self.client.get(
                'https://api.steampowered.com/ICSGOServers_730/GetGameServersStatus/v1',
                params={
                    'key': self.api_key,
                    'match_id': ids['match_id'],
                    'reservation_id': ids['reservation_id'],
                },
            )

            if response.status_code == 429:
                raise RetryableError('Steam API rate limited (429)')
            if response.status_code in (500, 502, 503, 504):
                raise RetryableError(f'Steam API server error ({response.status_code})')
            if response.status_code == 404:
                raise FatalError(f'Demo not found on Steam (404)')

            response.raise_for_status()

            data = response.json()

            # Extract demo URL from response
            # Note: Actual Steam API response format may vary; adjust based on API docs
            try:
                demo_info = data.get('demo', {})
                demo_url = demo_info.get('url')
                created_at = demo_info.get('created_at')

                if not demo_url:
                    raise FatalError('Steam API returned no demo_url')

                # Validate demo age (D-16: reject >30 days old)
                if created_at:
                    demo_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    age = datetime.now(timezone.utc) - demo_date

                    if age > timedelta(days=30):
                        raise FatalError(
                            f'Demo is {age.days} days old; demos >30 days old are no longer available'
                        )

                return {
                    'demo_url': demo_url,
                    'created_at': created_at,
                    'match_id': ids['match_id'],
                    'reservation_id': ids['reservation_id'],
                    'tv_port': ids['tv_port'],
                }

            except KeyError as e:
                raise FatalError(f'Steam API response missing field: {e}')

        except (RetryableError, FatalError):
            raise
        except Exception as e:
            logger.exception(f'Error getting metadata from Steam: {e}')
            raise FatalError(f'Unexpected error: {e}')
