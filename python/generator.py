"""
Infinite Gallery - Generator & Navigation Module
Generates random mathematical image IDs and enables navigation between adjacent coordinates.
"""

import os
import secrets
import base64
from typing import List, Dict, Optional, Tuple, Any
from PIL import Image
import numpy as np

try:
    from .encoder import bytes_to_id, get_resolution_spec, RESOLUTIONS
    from .decoder import bytes_to_image, detect_resolution, decode_id
    from .permutation import increment_address_bytes, permute_bytes
except (ImportError, ValueError):
    from encoder import bytes_to_id, get_resolution_spec, RESOLUTIONS
    from decoder import bytes_to_image, detect_resolution, decode_id
    from permutation import increment_address_bytes, permute_bytes


def generate_random_bytes(resolution: int = 32, seed: Optional[int] = None) -> bytes:
    """
    Generates cryptographically strong random bytes for the given resolution.
    """
    spec = get_resolution_spec(resolution)
    total_bytes = spec["total_bytes"]
    
    if seed is not None:
        rng = np.random.default_rng(seed)
        return rng.integers(0, 256, size=total_bytes, dtype=np.uint8).tobytes()
    return secrets.token_bytes(total_bytes)


def generate_random_id(
    resolution: int = 32,
    seed: Optional[int] = None,
    use_babel: bool = True
) -> str:
    """
    Generates a random Babel Address ID directly from pure mathematical entropy.
    """
    spec = get_resolution_spec(resolution)
    raw_addr = generate_random_bytes(resolution=resolution, seed=seed)
    prefix = spec["prefix"] if use_babel else None
    return bytes_to_id(raw_addr, resolution=resolution, prefix=prefix, use_permutation=False)


def step_address(id_str: str, delta: int = 1) -> str:
    """
    Steps to an adjacent address by delta (+1 for Next, -1 for Previous).
    Preserves prefix and resolution format.
    """
    res, stripped, is_babel = detect_resolution(id_str)
    spec = get_resolution_spec(res)
    
    missing_padding = (4 - len(stripped) % 4) % 4
    raw_bytes = base64.urlsafe_b64decode((stripped + "=" * missing_padding).encode("ascii"))
    
    stepped_bytes = increment_address_bytes(raw_bytes, delta=delta)
    prefix = spec["prefix"] if is_babel else None
    return bytes_to_id(stepped_bytes, resolution=res, prefix=prefix, use_permutation=False)


def generate_random_image(
    resolution: int = 32,
    seed: Optional[int] = None,
    use_babel: bool = True
) -> Tuple[str, Image.Image]:
    """
    Generates a random address ID and decodes its materialization as a PIL Image.
    """
    img_id = generate_random_id(resolution=resolution, seed=seed, use_babel=use_babel)
    img = decode_id(img_id)
    return img_id, img


def generate_batch(
    count: int = 12,
    resolution: int = 32,
    seed: Optional[int] = None,
    use_babel: bool = True
) -> List[Dict[str, Any]]:
    """
    Generates a batch of N random images for gallery exploration at requested resolution.
    """
    spec = get_resolution_spec(resolution)
    batch = []
    base_seed = seed
    for i in range(count):
        curr_seed = None if base_seed is None else base_seed + i
        img_id = generate_random_id(resolution=resolution, seed=curr_seed, use_babel=use_babel)
        batch.append({
            "index": i,
            "id": img_id,
            "resolution": resolution,
            "width": spec["width"],
            "height": spec["height"],
            "channels": "RGBA",
            "bytes": spec["total_bytes"],
            "bits": spec["total_bits"]
        })
    return batch


def generate_solid_image(
    r: int, g: int, b: int, a: int = 255,
    resolution: int = 32
) -> Tuple[str, Image.Image]:
    """Generates a solid color image and its exact Babel address ID."""
    from encoder import encode_image
    spec = get_resolution_spec(resolution)
    pixel = bytes([r & 0xFF, g & 0xFF, b & 0xFF, a & 0xFF])
    raw_bytes = pixel * (spec["width"] * spec["height"])
    img = bytes_to_image(raw_bytes, resolution=resolution)
    img_id = encode_image(img, resolution=resolution)
    return img_id, img
