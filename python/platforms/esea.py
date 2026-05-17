#!/usr/bin/env python3
"""ESEA demo fetcher with retry and timeout handling."""

import os
import logging
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


class EseaDemoFetcher(PlatformDemoFetcher):
    """Fetches demos from ESEA (web scraping or API)."""

    def __init__(self, api_key: Optional[str] = None):
        # ESEA API availability unclear; see research section Open Questions #1
        # For now, assume web scraping or future official API
        self.api_key = api_key or os.getenv('ESEA_API_KEY')

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
        """Download demo file from ESEA with retry."""
        metadata = await self.get_metadata(sharecode)

        demo_url = metadata.get('demo_url')
        if not demo_url:
            raise FatalError(f'ESEA did not return demo_url for {sharecode}')

        logger.info(f'Downloading demo from ESEA: {demo_url}')

        try:
            response = await self.client.get(demo_url)
        except httpx.TimeoutException as e:
            raise RetryableError(f'Download timeout (will retry): {e}')

        if response.status_code == 429:
            raise RetryableError('ESEA rate limited (429)')
        if response.status_code in (500, 502, 503, 504):
            raise RetryableError(f'ESEA server error ({response.status_code})')
        if response.status_code == 404:
            raise FatalError(f'Demo not found on ESEA (404)')
        if response.status_code == 403:
            raise FatalError(f'Access denied to ESEA (403)')

        response.raise_for_status()

        demo_bytes = response.content

        # Validate file size
        if len(demo_bytes) < 1024:
            raise FatalError(f'Downloaded file too small ({len(demo_bytes)} bytes)')
        if len(demo_bytes) > 500 * 1024 * 1024:
            raise FatalError(f'Downloaded file too large ({len(demo_bytes)} bytes)')

        logger.info(f'Demo downloaded: {len(demo_bytes)} bytes')
        return demo_bytes

    async def get_metadata(self, sharecode: str) -> DemoMetadata:
        """Get demo metadata from ESEA."""
        # PLACEHOLDER: Implement once ESEA API availability is confirmed
        # See research section: ESEA API availability unclear (A3)
        # Options:
        # 1. Contact ESEA support for official API
        # 2. Reverse-engineer ESEA web UI for demo URLs
        # 3. Defer ESEA support to Phase 8.2 with user confirmation

        raise FatalError(
            'ESEA demo import not yet implemented. '
            'See research/CONTEXT for API availability status. '
            'Consider deferring to Phase 8.2.'
        )
