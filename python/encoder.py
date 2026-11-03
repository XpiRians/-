"""
Infinite Gallery - Encoder Module
Encodes 32x32 and 64x64 RGBA images into deterministic, reversible Babel Address IDs
using Bijective Pseudorandom Permutation (Feistel-SPN).
"""

import base64
from io import BytesIO
from typing import Union, Optional, Dict, Any
from PIL import Image
import numpy as np

try:
    from .permutation import invert_permute_bytes
except (ImportError, ValueError):
    from permutation import invert_permute_bytes

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
BYTES_PER_CHANNEL = 1
TOTAL_BYTES = 4096
TOTAL_BITS = 32768
EXPECTED_ID_LENGTH = 5462


def get_resolution_spec(resolution: int = 32) -> Dict[str, Any]:
    """Retrieves metadata and specifications for a given resolution (32 or 64)."""
    if resolution not in RESOLUTIONS:
        raise ValueError(
            f"Unsupported resolution: {resolution}x{resolution}. "
            f"Supported resolutions are: {list(RESOLUTIONS.keys())}"
        )
    return RESOLUTIONS[resolution]


def image_to_rgba_bytes(
    image: Image.Image,
    resolution: int = 32,
    resample=Image.Resampling.LANCZOS
) -> bytes:
    """
    Normalizes an image to specified resolution (32x32 or 64x64) RGBA
    and extracts the raw byte sequence (4096 or 16384 bytes).
    """
    spec = get_resolution_spec(resolution)
    target_size = (spec["width"], spec["height"])
    
    if image.size != target_size:
        image = image.resize(target_size, resample=resample)
    
    if image.mode != "RGBA":
        image = image.convert("RGBA")
        
    raw_bytes = image.tobytes()
    expected_bytes = spec["total_bytes"]
    if len(raw_bytes) != expected_bytes:
        raise ValueError(
            f"Extracted byte length mismatch: expected {expected_bytes}, got {len(raw_bytes)}"
        )
    
    return raw_bytes


def bytes_to_id(
    raw_bytes: Union[bytes, bytearray, np.ndarray],
    resolution: Optional[int] = None,
    prefix: Optional[str] = None,
    use_permutation: bool = False
) -> str:
    """
    Encodes raw bytes into Base64URL string.
    If use_permutation is True, treats raw_bytes as image pixels and applies inverse
    permutation to obtain the canonical Babel address bytes before encoding.
    """
    if isinstance(raw_bytes, np.ndarray):
        raw_bytes = raw_bytes.tobytes()
    elif isinstance(raw_bytes, bytearray):
        raw_bytes = bytes(raw_bytes)

    byte_len = len(raw_bytes)
    if resolution is None:
        if byte_len == RESOLUTIONS[32]["total_bytes"]:
            resolution = 32
        elif byte_len == RESOLUTIONS[64]["total_bytes"]:
            resolution = 64
        else:
            raise ValueError(f"Invalid byte length: {byte_len}")

    spec = get_resolution_spec(resolution)
    if byte_len != spec["total_bytes"]:
        raise ValueError(f"Expected {spec['total_bytes']} bytes for {resolution}x{resolution}")

    if use_permutation:
        # Invert permutation: image pixels -> address bytes
        payload_bytes = invert_permute_bytes(raw_bytes)
        effective_prefix = prefix if prefix is not None else spec["prefix"]
    else:
        payload_bytes = raw_bytes
        effective_prefix = prefix

    encoded = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    if effective_prefix:
        return f"{effective_prefix}{encoded}"
    return encoded


def encode_image(
    image: Image.Image,
    resolution: int = 32,
    prefix: Optional[str] = None,
    use_permutation: bool = True
) -> str:
    """
    Encodes a PIL Image into its canonical Babel address ID.
    By default applies the Bijective Pseudorandom Permutation with 'b32_' / 'b64_' prefix.
    """
    raw_bytes = image_to_rgba_bytes(image, resolution=resolution)
    return bytes_to_id(
        raw_bytes,
        resolution=resolution,
        prefix=prefix,
        use_permutation=use_permutation
    )


def encode_image_file(
    file_or_path: Union[str, BytesIO, bytes],
    resolution: int = 32,
    prefix: Optional[str] = None,
    use_permutation: bool = True
) -> str:
    """Opens an image and computes its Babel mathematical address ID."""
    if isinstance(file_or_path, bytes):
        file_or_path = BytesIO(file_or_path)
    with Image.open(file_or_path) as img:
        return encode_image(img, resolution=resolution, prefix=prefix, use_permutation=use_permutation)
