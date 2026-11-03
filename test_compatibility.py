"""
Test Compatibility & Verification Script
Verifies test vectors for both Babel Permutation and Legacy Direct IDs.
"""

import os
import json
import numpy as np
from PIL import Image

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "python"))

from encoder import bytes_to_id, encode_image, RESOLUTIONS
from decoder import id_to_bytes, decode_id, validate_id, bytes_to_image, detect_resolution
from generator import step_address


def verify_vectors():
    vectors_file = os.path.join(os.path.dirname(__file__), "docs", "test_vectors.json")
    with open(vectors_file, "r") as f:
        data = json.load(f)

    print(f"Loaded {len(data['vectors'])} vectors from {vectors_file}")
    
    for v in data["vectors"]:
        name = v["name"]
        raw_id = v["id"]
        expected_res = v["resolution"]
        spec = RESOLUTIONS[expected_res]
        
        # 1. Validation and resolution detection
        valid, msg, res = validate_id(raw_id)
        assert valid, f"Validation failed for {name}: {msg}"
        assert res == expected_res, f"Resolution mismatch for {name}: expected {expected_res}, got {res}"
        
        # 2. Decode ID to image pixels
        pixel_bytes = id_to_bytes(raw_id)
        assert len(pixel_bytes) == spec["total_bytes"], f"Pixel bytes length mismatch for {name}"
        
        # 3. Check sample pixels against ground truth
        sample = v["sample_pixel_bytes"]
        assert list(pixel_bytes[:len(sample)]) == sample, f"Sample pixels mismatch in {name}"
        
        # 4. Check PIL Image reconstruction
        img = bytes_to_image(pixel_bytes, resolution=expected_res)
        assert img.size == (expected_res, expected_res)
        assert img.mode == "RGBA"
        
        # 5. Check reversibility
        reencoded_id = encode_image(img, resolution=expected_res)
        re_pixels = id_to_bytes(reencoded_id)
        assert re_pixels == pixel_bytes, f"Roundtrip failed for {name}"
        
        # 6. Test stepping +1 and -1
        next_id = step_address(raw_id, 1)
        prev_id = step_address(next_id, -1)
        assert prev_id == raw_id, f"Stepping inversion failed for {name}"
        
        print(f"  [+] {name:<28} -> Passed ({expected_res}x{expected_res}, ID: {raw_id[:16]}...)")

    print("\nAll Babel Permutation and Legacy vectors verified with 100% precision!")


if __name__ == "__main__":
    verify_vectors()
