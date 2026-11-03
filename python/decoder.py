"""
Infinite Gallery - Decoder Module
Decodes unique mathematical IDs back into exact 32x32 or 64x64 RGBA pixel images.
Seamlessly handles both Babel Permutation IDs (b32_/b64_) and legacy direct Base64 IDs.
"""

import base64
from io import BytesIO
import re
from typing import Tuple, Optional, Dict, Any
from PIL import Image
import numpy as np

try:
    from .permutation import permute_bytes
except (ImportError, ValueError):
    from permutation import permute_bytes

# Resolution Specifications
RESOLUTIONS: Dict[int, Dict[str, Any]] = {
    32: {
        "width": 32,
        "height": 32,
        "channels": 4,  # RGBA
        "total_bytes": 4096,
        "total_bits": 32768,
        "id_length": 5462,
        "padded_id_length": 5464,
        "prefix": "b32_",
        "name": "32x32 Standard"
    },
    64: {
        "width": 64,
        "height": 64,
        "channels": 4,  # RGBA
        "total_bytes": 16384,
        "total_bits": 131072,
        "id_length": 21846,
        "padded_id_length": 21848,
        "prefix": "b64_",
        "name": "64x64 Enhanced"
    }
}

# Legacy constants
IMAGE_WIDTH = 32
IMAGE_HEIGHT = 32
CHANNELS = 4
TOTAL_BYTES = 4096
EXPECTED_UNPADDED_LENGTH = 5462
EXPECTED_PADDED_LENGTH = 5464

# Regex for valid Base64URL string
BASE64URL_PATTERN = re.compile(r"^[A-Za-z0-9\-_]+={0,2}$")


class InvalidIDError(ValueError):
    """Raised when an ID is corrupted, contains invalid characters, or has wrong length."""
    pass


def parse_id_prefix(id_str: str) -> Tuple[Optional[int], bool, str]:
    """
    Parses ID prefixes:
    - 'b32_' / 'babel32_' -> (32, True, stripped)
    - 'b64_' / 'babel64_' -> (64, True, stripped)
    - '32_' / 'ig32_' -> (32, False, stripped)
    - '64_' / 'ig64_' -> (64, False, stripped)
    - None -> (None, False, id_str)
    """
    clean = id_str.strip()
    if clean.startswith("babel32_"):
        return 32, True, clean[8:]
    if clean.startswith("b32_"):
        return 32, True, clean[4:]
    if clean.startswith("babel64_"):
        return 64, True, clean[8:]
    if clean.startswith("b64_"):
        return 64, True, clean[4:]
    if clean.startswith("ig32_"):
        return 32, False, clean[5:]
    if clean.startswith("32_"):
        return 32, False, clean[3:]
    if clean.startswith("ig64_"):
        return 64, False, clean[5:]
    if clean.startswith("64_"):
        return 64, False, clean[3:]
    return None, False, clean


def detect_resolution(id_str: str) -> Tuple[int, str, bool]:
    """
    Detects the image resolution (32 or 64) and whether it uses Babel Permutation.
    Returns (resolution, clean_base64_id, is_babel_permutation).
    """
    if not isinstance(id_str, str):
        raise InvalidIDError("ID must be a string.")
    
    clean = id_str.strip()
    if not clean:
        raise InvalidIDError("ID cannot be empty.")

    explicit_res, is_babel, stripped = parse_id_prefix(clean)
    length = len(stripped)

    if explicit_res is not None:
        spec = RESOLUTIONS[explicit_res]
        if length not in (spec["id_length"], spec["padded_id_length"]):
            raise InvalidIDError(
                f"ID specifies {explicit_res}x{explicit_res}, but has invalid "
                f"payload length: {length} characters. Expected {spec['id_length']} "
                f"(or {spec['padded_id_length']} with '=' padding)."
            )
        return explicit_res, stripped, is_babel

    # Automatic detection by length (legacy raw Base64)
    if length in (RESOLUTIONS[32]["id_length"], RESOLUTIONS[32]["padded_id_length"]):
        return 32, stripped, False
    elif length in (RESOLUTIONS[64]["id_length"], RESOLUTIONS[64]["padded_id_length"]):
        return 64, stripped, False
    else:
        raise InvalidIDError(
            f"Invalid ID length: {length} characters. "
            f"Expected 5,462 (32×32) or 21,846 (64×64)."
        )


def validate_id(id_str: str) -> Tuple[bool, str, Optional[int]]:
    """
    Validates a mathematical ID string.
    Returns (is_valid, error_message, detected_resolution).
    """
    try:
        res, stripped, _ = detect_resolution(id_str)
        if not BASE64URL_PATTERN.match(stripped):
            return False, "ID contains invalid characters. Only URL-safe Base64 ([A-Za-z0-9-_]) is permitted.", None
        return True, "", res
    except InvalidIDError as e:
        return False, str(e), None
    except Exception as e:
        return False, f"Validation error: {str(e)}", None


def id_to_bytes(id_str: str) -> bytes:
    """
    Decodes an unpadded or padded URL-safe Base64 ID into raw RGBA pixel bytes
    (4096 bytes for 32x32, or 16384 bytes for 64x64).
    Applies forward permutation if ID is a Babel Address.
    """
    is_valid, error_msg, res = validate_id(id_str)
    if not is_valid or res is None:
        raise InvalidIDError(error_msg)

    res, stripped, is_babel = detect_resolution(id_str)
    spec = RESOLUTIONS[res]
    
    missing_padding = (4 - len(stripped) % 4) % 4
    padded_id = stripped + ("=" * missing_padding)

    try:
        raw_bytes = base64.urlsafe_b64decode(padded_id.encode("ascii"))
    except Exception as e:
        raise InvalidIDError(f"Base64 decoding failed: {str(e)}") from e

    expected_bytes = spec["total_bytes"]
    if len(raw_bytes) != expected_bytes:
        raise InvalidIDError(
            f"Decoded byte length mismatch: expected {expected_bytes} bytes for {res}x{res}, "
            f"got {len(raw_bytes)} bytes."
        )

    if is_babel:
        # Address bytes -> Image Pixels via forward permutation
        return permute_bytes(raw_bytes)
    return raw_bytes


def id_to_bytes_and_resolution(id_str: str) -> Tuple[bytes, int, bool]:
    """Returns (pixel_bytes, resolution, is_babel_permutation)."""
    res, _, is_babel = detect_resolution(id_str)
    pixel_bytes = id_to_bytes(id_str)
    return pixel_bytes, res, is_babel


def bytes_to_image(raw_bytes: bytes, resolution: Optional[int] = None) -> Image.Image:
    """Reconstructs a PIL Image (32x32 or 64x64 RGBA) from pixel bytes."""
    byte_len = len(raw_bytes)
    if resolution is None:
        if byte_len == RESOLUTIONS[32]["total_bytes"]:
            resolution = 32
        elif byte_len == RESOLUTIONS[64]["total_bytes"]:
            resolution = 64
        else:
            raise ValueError(f"Unknown byte array size: {byte_len} bytes")

    spec = RESOLUTIONS[resolution]
    if byte_len != spec["total_bytes"]:
        raise ValueError(f"Expected {spec['total_bytes']} bytes for {resolution}x{resolution}")

    return Image.frombytes("RGBA", (spec["width"], spec["height"]), raw_bytes)


def bytes_to_numpy(raw_bytes: bytes, resolution: Optional[int] = None) -> np.ndarray:
    """Reconstructs a NumPy array from raw pixel bytes."""
    image = bytes_to_image(raw_bytes, resolution=resolution)
    return np.array(image)


def decode_id(id_str: str) -> Image.Image:
    """Decodes an ID directly to a PIL RGBA Image."""
    pixel_bytes, res, _ = id_to_bytes_and_resolution(id_str)
    return bytes_to_image(pixel_bytes, resolution=res)


def id_to_png_bytes(id_str: str, scale: int = 1) -> bytes:
    """Decodes an ID and returns PNG file bytes with optional nearest-neighbor upscaling."""
    image = decode_id(id_str)
    if scale > 1:
        image = image.resize(
            (image.width * scale, image.height * scale),
            resample=Image.Resampling.NEAREST
        )
    bio = BytesIO()
    image.save(bio, format="PNG")
    return bio.getvalue()
