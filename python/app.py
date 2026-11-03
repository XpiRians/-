"""
Infinite Gallery - Flask Web Application
Provides interactive API and local web server for 32x32 and 64x64 modes.
"""

import os
from io import BytesIO
from flask import Flask, request, jsonify, send_file, send_from_directory
from PIL import Image

try:
    from .encoder import encode_image, RESOLUTIONS
    from .decoder import decode_id, id_to_png_bytes, validate_id, detect_resolution, InvalidIDError
    from .generator import generate_random_id, generate_batch, step_address
except (ImportError, ValueError):
    from encoder import encode_image, RESOLUTIONS
    from decoder import decode_id, id_to_png_bytes, validate_id, detect_resolution, InvalidIDError
    from generator import generate_random_id, generate_batch, step_address

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

app = Flask(__name__, static_folder=DOCS_DIR, static_url_path="")


@app.route("/")
def serve_index():
    """Serves the main frontend page from docs/index.html if present, else fallback."""
    index_path = os.path.join(DOCS_DIR, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(DOCS_DIR, "index.html")
    return jsonify({
        "project": "Musya & Keti Gallery - Digital Museum of All Possible Images",
        "guardians": ["Musya (Guardian of Space)", "Keti (Guardian of Symmetry)"],
        "description": "Mathematical space of 2^32768 (32x32) and 2^131072 (64x64) possible RGBA images.",
        "api_endpoints": [
            "/api/encode (POST)",
            "/api/decode/<id> (GET)",
            "/api/image/<id>.png (GET)",
            "/api/random?resolution=32|64 (GET)",
            "/api/random-batch?count=12&resolution=32|64 (GET)",
            "/api/validate/<id> (GET)",
            "/api/cats (GET)"
        ]
    })


@app.route("/api/cats", methods=["GET"])
def api_cats():
    """Returns the pre-calculated Babel coordinates and metadata for Musya and Keti."""
    cat_json_path = os.path.join(DOCS_DIR, "cat_exhibits.json")
    if os.path.exists(cat_json_path):
        import json
        with open(cat_json_path, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Cat exhibits data not found"}), 404


@app.route("/<path:filename>")
def serve_static_docs(filename):
    """Serves static files (style.css, *.js, *.html) from docs directory."""
    if os.path.exists(os.path.join(DOCS_DIR, filename)):
        return send_from_directory(DOCS_DIR, filename)
    return jsonify({"error": f"File '{filename}' not found"}), 404


# --- REST API Endpoints ---

@app.route("/api/validate/<path:image_id>", methods=["GET"])
def api_validate(image_id):
    """Checks whether an ID is mathematically valid and detects its resolution."""
    is_valid, msg, detected_res = validate_id(image_id)
    return jsonify({
        "valid": is_valid,
        "id": image_id,
        "length": len(image_id),
        "resolution": detected_res,
        "message": msg or f"ID is mathematically valid ({detected_res}x{detected_res})."
    })


@app.route("/api/encode", methods=["POST"])
def api_encode():
    """
    Encodes an uploaded image to its reversible mathematical ID at 32x32 or 64x64.
    Accepts multipart 'file' or JSON 'image_base64', plus optional 'resolution' (32 or 64).
    """
    try:
        resolution = 32
        if "resolution" in request.form:
            resolution = int(request.form.get("resolution", 32))
        elif request.is_json and "resolution" in request.json:
            resolution = int(request.json.get("resolution", 32))

        if resolution not in (32, 64):
            return jsonify({"error": f"Unsupported resolution: {resolution}. Must be 32 or 64."}), 400

        if "file" in request.files:
            file = request.files["file"]
            if file.filename == "":
                return jsonify({"error": "No file selected"}), 400
            img = Image.open(file.stream)
        elif request.is_json and "image_base64" in request.json:
            import base64
            data = request.json["image_base64"]
            if "," in data:
                data = data.split(",", 1)[1]
            raw = base64.b64decode(data)
            img = Image.open(BytesIO(raw))
        else:
            return jsonify({"error": "Provide image file in multipart 'file' or JSON 'image_base64'"}), 400

        orig_w, orig_h = img.size
        has_downscale_loss = (orig_w != resolution or orig_h != resolution)
        
        image_id = encode_image(img, resolution=resolution)
        spec = RESOLUTIONS[resolution]
        
        return jsonify({
            "success": True,
            "id": image_id,
            "resolution": resolution,
            "original_dimensions": [orig_w, orig_h],
            "target_dimensions": [resolution, resolution],
            "channels": "RGBA",
            "total_bytes": spec["total_bytes"],
            "total_bits": spec["total_bits"],
            "downscale_loss_warning": has_downscale_loss,
            "length": len(image_id)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/decode/<path:image_id>", methods=["GET"])
def api_decode(image_id):
    """Decodes an ID and returns metadata and dimensions."""
    try:
        is_valid, msg, res = validate_id(image_id)
        if not is_valid or res is None:
            return jsonify({"error": msg, "valid": False}), 400
        
        img = decode_id(image_id)
        spec = RESOLUTIONS[res]
        return jsonify({
            "valid": True,
            "id": image_id,
            "resolution": res,
            "width": img.width,
            "height": img.height,
            "channels": "RGBA",
            "total_bytes": spec["total_bytes"],
            "total_bits": spec["total_bits"],
            "image_url": f"/api/image/{image_id}.png"
        })
    except InvalidIDError as e:
        return jsonify({"error": str(e), "valid": False}), 400


@app.route("/api/image/<path:image_id>.png", methods=["GET"])
def api_image_png(image_id):
    """
    Decodes an ID (32x32 or 64x64) and directly streams the PNG image.
    Supports ?scale=1..32 for crisp rendering.
    """
    try:
        scale = request.args.get("scale", default=1, type=int)
        scale = max(1, min(scale, 32))
        
        png_bytes = id_to_png_bytes(image_id, scale=scale)
        return send_file(
            BytesIO(png_bytes),
            mimetype="image/png",
            as_attachment=False,
            download_name=f"infinite_gallery_{image_id[:16]}.png"
        )
    except InvalidIDError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/step", methods=["GET"])
def api_step():
    """Steps to an adjacent address by delta (e.g., +1 for Next, -1 for Previous)."""
    try:
        image_id = request.args.get("id", "").strip()
        delta = request.args.get("delta", default=1, type=int)
        if not image_id:
            return jsonify({"error": "id parameter is required"}), 400

        is_valid, msg, res = validate_id(image_id)
        if not is_valid:
            return jsonify({"error": msg, "valid": False}), 400

        next_id = step_address(image_id, delta=delta)
        return jsonify({
            "success": True,
            "id": next_id,
            "previous_id": image_id,
            "delta": delta,
            "resolution": res,
            "image_url": f"/api/image/{next_id}.png"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/random", methods=["GET"])
def api_random():
    """Generates a random image ID at resolution 32 or 64 (default 32)."""
    resolution = request.args.get("resolution", default=32, type=int)
    if resolution not in (32, 64):
        resolution = 32
    rand_id = generate_random_id(resolution=resolution)
    return jsonify({
        "id": rand_id,
        "resolution": resolution,
        "width": resolution,
        "height": resolution,
        "channels": "RGBA",
        "image_url": f"/api/image/{rand_id}.png"
    })


@app.route("/api/random-batch", methods=["GET"])
def api_random_batch():
    """Generates a batch of random images (default 12) at resolution 32 or 64."""
    count = request.args.get("count", default=12, type=int)
    count = max(1, min(count, 48))
    resolution = request.args.get("resolution", default=32, type=int)
    if resolution not in (32, 64):
        resolution = 32
    batch = generate_batch(count=count, resolution=resolution)
    return jsonify({
        "count": len(batch),
        "resolution": resolution,
        "items": batch
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] Infinite Gallery Flask server running on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
