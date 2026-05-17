#!/usr/bin/env python3
"""Faceit API demo fetcher with retry and timeout handling."""

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


class FaceitDemoFetcher(PlatformDemoFetcher):
    """Fetches demos from Faceit API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('FACEIT_API_KEY')
        if not self.api_key:
            raise ValueError('FACEIT_API_KEY not provided')

        # Separate timeout: 5s connect, 300s read
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(5.0, read=300.0),
            limits=httpx.Limits(max_connections=5),
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json',
            },
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
        """Download demo file from Faceit API with retry."""
        # Get metadata (includes demo URL)
        metadata = await self.get_metadata(sharecode)

        demo_url = metadata.get('demo_url')
        if not demo_url:
            raise FatalError(f'Faceit API did not return demo_url for {sharecode}')

        logger.info(f'Downloading demo from Faceit: {demo_url}')

        try:
            response = await self.client.get(demo_url)
        except httpx.TimeoutException as e:
            raise RetryableError(f'Download timeout (will retry): {e}')

        if response.status_code == 429:
            raise RetryableError('Faceit API rate limited (429)')
        if response.status_code in (500, 502, 503, 504):
            raise RetryableError(f'Faceit API server error ({response.status_code})')
        if response.status_code == 404:
            raise FatalError(f'Demo not found on Faceit (404)')
        if response.status_code == 403:
            raise FatalError(f'Access denied to Faceit API (403)')

        response.raise_for_status()

        demo_bytes = response.content

        # Validate file size
        if len(demo_bytes) < 1024:
            raise FatalError(f'Downloaded file too small ({len(demo_bytes)} bytes)')
        if len(demo_bytes) > 500 * 1024 * 1024:
            raise FatalError(f'Downloaded file too large ({len(demo_bytes)} bytes)')

        logger.info(f'Demo downloaded: {len(demo_bytes)} bytes')
        return demo_bytes

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(RetryableError),
        reraise=True,
    )
    async def get_metadata(self, sharecode: str) -> DemoMetadata:
        """Get demo metadata from Faceit API."""
        # Note: sharecode format for Faceit may differ from Steam
        # This is a placeholder; actual Faceit API endpoint and response format TBD
        # See research section: Faceit API requires 30-day approval for Downloads API

        try:
            # Placeholder: Query Faceit match API using sharecode as match ID
            response = await self.client.get(
                f'https://api.faceit.com/data/v4/matches/{sharecode}',
            )

            if response.status_code == 429:
                raise RetryableError('Faceit API rate limited (429)')
            if response.status_code in (500, 502, 503, 504):
                raise RetryableError(f'Faceit API server error ({response.status_code})')
            if response.status_code == 404:
                raise FatalError(f'Match not found on Faceit (404)')

            response.raise_for_status()

            data = response.json()

            # Extract demo info from response
            try:
                demo_info = data.get('demo', {})
                demo_url = demo_info.get('download_url')
                created_at = data.get('finished_at')  # Faceit provides finished_at

                if not demo_url:
                    raise FatalError('Faceit API returned no download_url')

                # Validate demo age (D-16)
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
                }

            except KeyError as e:
                raise FatalError(f'Faceit API response missing field: {e}')

        except (RetryableError, FatalError):
            raise
        except Exception as e:
            logger.exception(f'Error getting metadata from Faceit: {e}')
            raise FatalError(f'Unexpected error: {e}')
