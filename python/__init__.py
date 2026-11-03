"""
Infinite Gallery Python Package
Supports 32x32 and 64x64 resolutions via Bijective Pseudorandom Permutation (Babel PRP).
"""
from .encoder import (
    RESOLUTIONS, get_resolution_spec, image_to_rgba_bytes,
    bytes_to_id, encode_image, encode_image_file,
    TOTAL_BYTES, EXPECTED_ID_LENGTH
)
from .decoder import (
    validate_id, detect_resolution, id_to_bytes, id_to_bytes_and_resolution,
    bytes_to_image, bytes_to_numpy, decode_id, id_to_png_bytes, InvalidIDError
)
from .generator import (
    generate_random_bytes, generate_random_id, generate_random_image,
    generate_batch, generate_solid_image, step_address
)
from .permutation import (
    permute_bytes, invert_permute_bytes, increment_address_bytes
)

__all__ = [
    "RESOLUTIONS",
    "get_resolution_spec",
    "image_to_rgba_bytes",
    "bytes_to_id",
    "encode_image",
    "encode_image_file",
    "TOTAL_BYTES",
    "EXPECTED_ID_LENGTH",
    "validate_id",
    "detect_resolution",
    "id_to_bytes",
    "id_to_bytes_and_resolution",
    "bytes_to_image",
    "bytes_to_numpy",
    "decode_id",
    "id_to_png_bytes",
    "InvalidIDError",
    "generate_random_bytes",
    "generate_random_id",
    "generate_random_image",
    "generate_batch",
    "generate_solid_image",
    "step_address",
    "permute_bytes",
    "invert_permute_bytes",
    "increment_address_bytes"
]
