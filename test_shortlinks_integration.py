import urllib.request
import json
import re
import sys

SUPABASE_URL = "https://hxdwavbtjhxbyfcimctz.supabase.co"
SUPABASE_KEY = "sb_publishable_uWgTHdlA9dZeOQhgaL36Nw_GgVH5LvI"

HEADERS_JSON = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

HEADERS_GET = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Accept": "application/json"
}

# 1. Load Real Musya (32x32) and Keti (64x64) IDs from cat_data.js
with open("docs/cat_data.js", "r", encoding="utf-8") as f:
    cat_code = f.read().strip()

prefix = "window.CAT_EXHIBITS = "
if cat_code.startswith(prefix):
    json_text = cat_code[len(prefix):].rstrip(";")
    cat_data = json.loads(json_text)
else:
    cat_data = json.loads(cat_code)

musya_32_id = cat_data["musya"]["id_32"]
# In cat_data, let's see if keti or musya has 64
musya_64_id = cat_data["musya"].get("id_64")
if not musya_64_id and "keti" in cat_data:
    musya_64_id = cat_data["keti"].get("id_64")
if not musya_64_id:
    # Use standard 64x64 vector from test_vectors.json
    with open("docs/test_vectors.json", "r", encoding="utf-8") as f:
        t_vec = json.load(f)
    for v in t_vec:
        if v.get("resolution") == 64:
            musya_64_id = v["id"]
            break

keti_64_id = musya_64_id

print(f"[+] Loaded Musya 32x32 ID (length: {len(musya_32_id)})")
print(f"[+] Loaded 64x64 ID (length: {len(keti_64_id)})")

def rpc_create(cand_id, full_id, res):
    url = f"{SUPABASE_URL}/rest/v1/rpc/get_or_create_short_link"
    data = json.dumps({
        "p_id": cand_id,
        "p_full_image_id": full_id,
        "p_resolution": res
    }).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS_JSON)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def query_by_id(short_id):
    url = f"{SUPABASE_URL}/rest/v1/gallery_links?id=eq.{short_id}&select=id,full_image_id,resolution"
    req = urllib.request.Request(url, headers=HEADERS_GET)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

# Test 1: Create Short Link for Musya 32x32
print("\n--- TEST 1: Create Short Link for Musya 32x32 ---")
res1 = rpc_create("m32cat", musya_32_id, 32)
print("Result 1:", res1)
short_id_m32 = res1[0]["short_id"]
assert short_id_m32, "short_id must not be empty"

# Test 2: Deduplication Test - Call with different candidate ID for same Musya 32x32
print("\n--- TEST 2: Deduplication for Musya 32x32 ---")
res2 = rpc_create("m32dup", musya_32_id, 32)
print("Result 2:", res2)
assert res2[0]["short_id"] == short_id_m32, f"Expected {short_id_m32}, got {res2[0]['short_id']}"
assert res2[0]["is_existing"] == True, "Expected is_existing == True"
print("[+] Deduplication PASSED: Returned existing short_id without creating duplicate!")

# Test 3: Create Short Link for Keti 64x64
print("\n--- TEST 3: Create Short Link for Keti 64x64 ---")
res3 = rpc_create("k64cat", keti_64_id, 64)
print("Result 3:", res3)
short_id_k64 = res3[0]["short_id"]
assert short_id_k64, "short_id must not be empty"

# Test 4: Query Link Musya 32x32 by Short ID
print(f"\n--- TEST 4: Query Musya Link by Short ID ({short_id_m32}) ---")
q1 = query_by_id(short_id_m32)
print("Query output:", len(q1), "rows")
assert len(q1) == 1, "Must find exactly 1 row"
assert q1[0]["full_image_id"] == musya_32_id, "Returned full_image_id must match Musya 32x32 exactly"
assert q1[0]["resolution"] == 32, "Resolution must be 32"
print("[+] Query PASSED: 100% exact match of full ID and resolution!")

# Test 5: Query Link Keti 64x64 by Short ID
print(f"\n--- TEST 5: Query Keti Link by Short ID ({short_id_k64}) ---")
q2 = query_by_id(short_id_k64)
assert len(q2) == 1, "Must find exactly 1 row"
assert q2[0]["full_image_id"] == keti_64_id, "Returned full_image_id must match Keti 64x64 exactly"
assert q2[0]["resolution"] == 64, "Resolution must be 64"
print("[+] Query PASSED: 100% exact match of 21KB 64x64 full ID!")

# Test 6: Query Non-existent Code
print("\n--- TEST 6: Query Non-existent Code ---")
q_none = query_by_id("non_existent_99")
assert len(q_none) == 0, "Non-existent code must return empty array"
print("[+] Non-existent code returned empty array correctly!")

# Test 7: Malformed Input Rejection
print("\n--- TEST 7: Malformed Input Rejection ---")
try:
    rpc_create("bad", "invalid_short_junk", 128)
    print("FAILED: Expected HTTP error for invalid input")
    sys.exit(1)
except urllib.error.HTTPError as e:
    assert e.code == 400, f"Expected 400, got {e.code}"
    print(f"[+] Rejection PASSED: Server rejected invalid payload with HTTP {e.code}")

print("\n" + "=" * 60)
print("ALL 7 SUPABASE SHORT LINK INTEGRATION TESTS PASSED 100%!")
print("=" * 60)
