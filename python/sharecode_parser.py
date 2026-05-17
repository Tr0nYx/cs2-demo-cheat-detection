#!/usr/bin/env python3
import logging
from csgo_sharecode import decode

logger = logging.getLogger(__name__)


class SharecodeDecodeError(Exception):
    """Raised when sharecode cannot be decoded."""
    pass


def parse_sharecode(sharecode: str) -> dict:
    """
    Decode CS2 sharecode to match ID, reservation ID, and TV port.

    Args:
        sharecode: 24-character sharecode (e.g., CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)

    Returns:
        {
            'match_id': int,
            'reservation_id': int,
            'tv_port': int,
        }

    Raises:
        SharecodeDecodeError: If sharecode is invalid or cannot be decoded.
    """
    try:
        match_info = decode(sharecode.upper().strip())

        return {
            'match_id': match_info.match_id,
            'reservation_id': match_info.reservation_id,
            'tv_port': match_info.tv_port,
        }
    except Exception as e:
        logger.error(f"Failed to decode sharecode {sharecode}: {e}")
        raise SharecodeDecodeError(f"Invalid sharecode format: {sharecode}") from e


def validate_sharecode_format(sharecode: str) -> bool:
    """
    Quick format check before attempting decode.
    Regex pattern: CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}
    """
    import re
    pattern = r'^CSGO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$'
    return bool(re.match(pattern, sharecode.upper().strip()))
