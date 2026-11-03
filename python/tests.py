"""
Infinite Gallery - Comprehensive Automated Test Suite
Verifies Bijective Pseudorandom Permutation (Babel PRP), 50% avalanche effect,
stepping navigation, 32x32 and 64x64 roundtrips, and Flask API.
"""

import unittest
import base64
import os
import sys
from io import BytesIO
from PIL import Image
import numpy as np

from encoder import (
    RESOLUTIONS, get_resolution_spec, image_to_rgba_bytes, bytes_to_id, encode_image,
    TOTAL_BYTES, EXPECTED_ID_LENGTH
)
from decoder import (
    validate_id, detect_resolution, id_to_bytes, id_to_bytes_and_resolution,
    bytes_to_image, bytes_to_numpy, decode_id, id_to_png_bytes, InvalidIDError
)
from generator import (
    generate_random_bytes, generate_random_id, generate_random_image,
    generate_batch, generate_solid_image, step_address
)
from permutation import permute_bytes, invert_permute_bytes, increment_address_bytes


class TestInfiniteGalleryMath(unittest.TestCase):

    def test_constants_32_and_64(self):
        """Verify mathematical dimension constants for both resolutions."""
        spec32 = get_resolution_spec(32)
        self.assertEqual(spec32["width"], 32)
        self.assertEqual(spec32["total_bytes"], 4096)
        self.assertEqual(spec32["total_bits"], 32768)
        self.assertEqual(spec32["id_length"], 5462)

        spec64 = get_resolution_spec(64)
        self.assertEqual(spec64["width"], 64)
        self.assertEqual(spec64["total_bytes"], 16384)
        self.assertEqual(spec64["total_bits"], 131072)
        self.assertEqual(spec64["id_length"], 21846)

    def test_feistel_permutation_bijection(self):
        """Ensure Feistel permutation is 100% bijective and lossless."""
        for res in [32, 64]:
            total = RESOLUTIONS[res]["total_bytes"]
            raw = np.random.randint(0, 256, size=total, dtype=np.uint8).tobytes()
            permuted = permute_bytes(raw)
            restored = invert_permute_bytes(permuted)
            self.assertEqual(raw, restored)

    def test_avalanche_effect(self):
        """Verify adjacent addresses produce visually dispersed, chaotic output."""
        addr1 = generate_random_id(resolution=32, seed=42)
        addr2 = step_address(addr1, 1)

        pixels1 = np.frombuffer(id_to_bytes(addr1), dtype=np.uint8)
        pixels2 = np.frombuffer(id_to_bytes(addr2), dtype=np.uint8)

        diff_count = np.count_nonzero(pixels1 != pixels2)
        total = len(pixels1)
        diff_ratio = diff_count / total
        self.assertGreater(diff_ratio, 0.90, f"Avalanche effect insufficient: {diff_ratio*100:.1f}%")

    def test_stepping_inversion(self):
        """Stepping +delta then -delta returns exact identical address."""
        start_id = generate_random_id(resolution=32, seed=777)
        next_id = step_address(start_id, 10)
        back_id = step_address(next_id, -10)
        self.assertEqual(start_id, back_id)

    def test_solid_color_roundtrip_both_resolutions(self):
        """Test roundtrip of solid color images with 100% pixel matching."""
        colors = [
            (0, 0, 0, 255),       # Black
            (255, 255, 255, 255), # White
            (255, 0, 0, 255),     # Red
            (0, 255, 0, 255),     # Green
            (0, 0, 255, 255),     # Blue
        ]
        for res in [32, 64]:
            for r, g, b, a in colors:
                with self.subTest(color=(r, g, b, a), res=res):
                    orig_id, orig_img = generate_solid_image(r, g, b, a, resolution=res)
                    decoded_img = decode_id(orig_id)
                    self.assertEqual(decoded_img.size, (res, res))
                    orig_arr = np.array(orig_img)
                    decoded_arr = np.array(decoded_img)
                    self.assertTrue(np.array_equal(orig_arr, decoded_arr))

    def test_legacy_raw_compatibility(self):
        """Test that legacy raw Base64 IDs decode losslessly."""
        raw_pixels = bytes([120, 140, 160, 255]) * 1024
        legacy_id = bytes_to_id(raw_pixels, resolution=32, use_permutation=False)
        self.assertEqual(len(legacy_id), 5462)

        # Decoder should detect legacy mode
        dec_pixels, res, is_babel = id_to_bytes_and_resolution(legacy_id)
        self.assertEqual(res, 32)
        self.assertFalse(is_babel)
        self.assertEqual(dec_pixels, raw_pixels)

    def test_validation_and_errors(self):
        """Test error detection on malformed IDs."""
        v1, _, _ = validate_id("")
        self.assertFalse(v1)

        v2, _, _ = validate_id("b32_" + "A" * 5461) # off by 1
        self.assertFalse(v2)

        v3, _, _ = validate_id("b32_" + "A" * 5460 + "!!")
        self.assertFalse(v3)


class TestInfiniteGalleryFlaskAPI(unittest.TestCase):

    def setUp(self):
        sys.path.insert(0, os.path.dirname(__file__))
        from app import app
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_static_routes(self):
        r = self.client.get("/")
        self.assertEqual(r.status_code, 200)

    def test_api_step(self):
        rand_id = generate_random_id(resolution=32, seed=123)
        res = self.client.get(f"/api/step?id={rand_id}&delta=1")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertNotEqual(data["id"], rand_id)

    def test_api_random_and_decode(self):
        r = self.client.get("/api/random?resolution=32")
        self.assertEqual(r.status_code, 200)
        rand_id = r.get_json()["id"]

        r_dec = self.client.get(f"/api/decode/{rand_id}")
        self.assertEqual(r_dec.status_code, 200)
        self.assertEqual(r_dec.get_json()["width"], 32)

    def test_api_encode_file(self):
        img = Image.new("RGBA", (64, 64), (100, 150, 200, 255))
        bio = BytesIO()
        img.save(bio, format="PNG")
        bio.seek(0)

        r = self.client.post(
            "/api/encode",
            data={"file": (bio, "test.png"), "resolution": 32},
            content_type="multipart/form-data"
        )
        self.assertEqual(r.status_code, 200)
        data = r.get_json()
        self.assertTrue(data["id"].startswith("b32_"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
