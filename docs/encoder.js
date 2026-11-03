/**
 * Infinite Gallery - Encoder Module (JavaScript ES6+)
 * Encodes 32x32 and 64x64 RGBA pixels into deterministic, reversible Babel Address IDs
 * using Bijective Pseudorandom Permutation (Feistel-SPN).
 */

(function (global) {
  'use strict';

  const RESOLUTIONS = {
    32: {
      width: 32,
      height: 32,
      channels: 4,
      totalBytes: 4096,
      totalBits: 32768,
      idLength: 5462,
      paddedIdLength: 5464,
      prefix: "b32_",
      name: "32x32 Standard"
    },
    64: {
      width: 64,
      height: 64,
      channels: 4,
      totalBytes: 16384,
      totalBits: 131072,
      idLength: 21846,
      paddedIdLength: 21848,
      prefix: "b64_",
      name: "64x64 Enhanced"
    }
  };

  const IMAGE_WIDTH = 32;
  const IMAGE_HEIGHT = 32;
  const CHANNELS = 4;
  const TOTAL_BYTES = 4096;
  const TOTAL_BITS = 32768;
  const EXPECTED_ID_LENGTH = 5462;

  const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  function getResolutionSpec(res = 32) {
    const spec = RESOLUTIONS[res];
    if (!spec) {
      throw new Error(`Unsupported resolution: ${res}. Must be 32 or 64.`);
    }
    return spec;
  }

  /**
   * Encodes a Uint8Array into an unpadded Base64URL string.
   */
  function bytesToId(uint8Array, resolution = null, prefix = null, usePermutation = false) {
    if (!uint8Array) {
      throw new Error('Uint8Array is required.');
    }

    const byteLen = uint8Array.length;
    let res = resolution;
    if (res === null) {
      if (byteLen === RESOLUTIONS[32].totalBytes) res = 32;
      else if (byteLen === RESOLUTIONS[64].totalBytes) res = 64;
      else {
        throw new Error(`Invalid byte length ${byteLen}. Expected 4096 (for 32x32) or 16384 (for 64x64).`);
      }
    }

    const spec = getResolutionSpec(res);
    if (byteLen !== spec.totalBytes) {
      throw new Error(`Expected ${spec.totalBytes} bytes for ${res}x${res}, got ${byteLen}.`);
    }

    let payloadBytes = uint8Array;
    let effectivePrefix = prefix;

    if (usePermutation) {
      const perm = global.BabelPermutation;
      if (!perm) {
        throw new Error('BabelPermutation module is required for permutation encoding.');
      }
      payloadBytes = perm.invertPermuteBytes(uint8Array);
      if (effectivePrefix === null) {
        effectivePrefix = spec.prefix;
      }
    }

    const fullBlocks = Math.floor(spec.totalBytes / 3);
    const chunks = [];
    let chunk = '';
    let byteIdx = 0;

    for (let i = 0; i < fullBlocks; i++) {
      const b0 = payloadBytes[byteIdx++];
      const b1 = payloadBytes[byteIdx++];
      const b2 = payloadBytes[byteIdx++];

      chunk += B64_CHARS[b0 >> 2] +
               B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
               B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] +
               B64_CHARS[b2 & 63];

      if (chunk.length >= 1024) {
        chunks.push(chunk);
        chunk = '';
      }
    }

    const b0 = payloadBytes[byteIdx];
    chunk += B64_CHARS[b0 >> 2] +
             B64_CHARS[(b0 & 3) << 4];
    chunks.push(chunk);

    const id = chunks.join('');
    if (id.length !== spec.idLength) {
      throw new Error(`Encoding failed: produced ${id.length} chars (expected ${spec.idLength})`);
    }

    return effectivePrefix ? `${effectivePrefix}${id}` : id;
  }

  function imageDataToBytes(imageData) {
    if (!imageData || (imageData.width !== 32 && imageData.width !== 64) || imageData.width !== imageData.height) {
      throw new Error(`ImageData must be square 32x32 or 64x64, got ${imageData ? `${imageData.width}x${imageData.height}` : 'null'}`);
    }
    return new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength);
  }

  async function encodeImageSource(imageSource, options = {}) {
    const res = (options.resolution === 64) ? 64 : 32;
    const spec = getResolutionSpec(res);
    const fit = options.fit || 'cover';
    const prefix = options.prefix !== undefined ? options.prefix : spec.prefix;
    const usePermutation = options.usePermutation !== undefined ? options.usePermutation : true;

    let imgElement;
    let origWidth = 0;
    let origHeight = 0;

    if (imageSource instanceof HTMLImageElement) {
      imgElement = imageSource;
      origWidth = imgElement.naturalWidth || imgElement.width;
      origHeight = imgElement.naturalHeight || imgElement.height;
    } else if (imageSource instanceof File || imageSource instanceof Blob) {
      const url = URL.createObjectURL(imageSource);
      try {
        imgElement = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image file.'));
          img.src = url;
        });
        origWidth = imgElement.naturalWidth;
        origHeight = imgElement.naturalHeight;
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      throw new Error('Unsupported imageSource type.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    ctx.clearRect(0, 0, spec.width, spec.height);

    let sx = 0, sy = 0, sWidth = origWidth, sHeight = origHeight;
    let dx = 0, dy = 0, dWidth = spec.width, dHeight = spec.height;

    if (fit === 'cover') {
      const origAspect = origWidth / origHeight;
      const targetAspect = 1;
      if (origAspect > targetAspect) {
        sWidth = origHeight * targetAspect;
        sx = (origWidth - sWidth) / 2;
      } else {
        sHeight = origWidth / targetAspect;
        sy = (origHeight - sHeight) / 2;
      }
    } else if (fit === 'contain') {
      const scale = Math.min(spec.width / origWidth, spec.height / origHeight);
      dWidth = Math.round(origWidth * scale);
      dHeight = Math.round(origHeight * scale);
      dx = Math.round((spec.width - dWidth) / 2);
      dy = Math.round((spec.height - dHeight) / 2);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgElement, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    const imageData = ctx.getImageData(0, 0, spec.width, spec.height);
    const bytes = imageDataToBytes(imageData);
    const id = bytesToId(bytes, res, prefix, usePermutation);

    return {
      id,
      canvas,
      resolution: res,
      originalWidth: origWidth,
      originalHeight: origHeight,
      wasDownscaled: origWidth !== spec.width || origHeight !== spec.height,
      totalBytes: spec.totalBytes,
      totalBits: spec.totalBits
    };
  }

  const InfiniteGalleryEncoder = {
    RESOLUTIONS,
    getResolutionSpec,
    IMAGE_WIDTH,
    IMAGE_HEIGHT,
    CHANNELS,
    TOTAL_BYTES,
    TOTAL_BITS,
    EXPECTED_ID_LENGTH,
    B64_CHARS,
    bytesToId,
    imageDataToBytes,
    encodeImageSource
  };

  global.InfiniteGalleryEncoder = InfiniteGalleryEncoder;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfiniteGalleryEncoder;
  }
})(typeof window !== 'undefined' ? window : globalThis);
