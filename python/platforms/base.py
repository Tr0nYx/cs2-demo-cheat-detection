#!/usr/bin/env python3
"""Abstract base class for platform-specific demo fetchers."""

from abc import ABC, abstractmethod
from typing import TypedDict


class DemoMetadata(TypedDict, total=False):
    """Demo metadata extracted from platform API response."""
    match_id: int
    reservation_id: int
    tv_port: int
    demo_url: str
    file_size: int
    created_at: str  # ISO 8601
    expires_at: str  # ISO 8601


class PlatformError(Exception):
    """Base exception for platform fetch errors."""
    pass


class RetryableError(PlatformError):
    """Raised when error is transient (429, 5xx, timeout)."""
    pass


class FatalError(PlatformError):
    """Raised when error is permanent (404, 403, invalid sharecode)."""
    pass


class PlatformDemoFetcher(ABC):
    """Abstract base for platform-specific demo fetchers."""

    @abstractmethod
    async def fetch_demo(self, sharecode: str) -> bytes:
        """
        Fetch demo file bytes from platform.

        Args:
            sharecode: 24-character sharecode (e.g., CSGO-XXXXX-...)

        Returns:
            bytes: Raw demo file content

        Raises:
            RetryableError: Transient error (rate limit, timeout, 5xx)
            FatalError: Permanent error (expired, not found, auth failed)
        """
        pass

    @abstractmethod
    async def get_metadata(self, sharecode: str) -> DemoMetadata:
        """
        Get demo metadata (creation date, file size) from platform.
        Used for age validation (D-16) before downloading.

        Raises:
            FatalError: If demo not found or expired
            RetryableError: If platform API timeout
        """
        pass
