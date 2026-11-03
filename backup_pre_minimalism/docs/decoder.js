/**
 * Infinite Gallery - Decoder Module (JavaScript ES6+)
 * Decodes Babel Address IDs (b32_/b64_) and legacy direct IDs back into exact 32x32 or 64x64 RGBA pixel images.
 * Runs 100% client-side with zero external dependencies.
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

  const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  const REV_LOOKUP = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64_CHARS.length; i++) {
    REV_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
  }

  const BASE64URL_REGEX = /^[A-Za-z0-9\-_]+={0,2}$/;

  /**
   * Detects resolution and checks if it uses Babel Permutation.
   * @param {string} idStr 
   * @returns {{ resolution: number, strippedId: string, isBabel: boolean }}
   */
  function detectResolution(idStr) {
    if (typeof idStr !== 'string') {
      throw new Error('ID must be a string.');
    }

    let clean = idStr.trim();
    if (!clean) {
      throw new Error('ID cannot be empty.');
    }

    let explicitRes = null;
    let isBabel = false;
    let stripped = clean;

    if (clean.startsWith('babel32_')) {
      explicitRes = 32; isBabel = true; stripped = clean.slice(8);
    } else if (clean.startsWith('b32_')) {
      explicitRes = 32; isBabel = true; stripped = clean.slice(4);
    } else if (clean.startsWith('babel64_')) {
      explicitRes = 64; isBabel = true; stripped = clean.slice(8);
    } else if (clean.startsWith('b64_')) {
      explicitRes = 64; isBabel = true; stripped = clean.slice(4);
    } else if (clean.startsWith('ig32_')) {
      explicitRes = 32; isBabel = false; stripped = clean.slice(5);
    } else if (clean.startsWith('32_')) {
      explicitRes = 32; isBabel = false; stripped = clean.slice(3);
    } else if (clean.startsWith('ig64_')) {
      explicitRes = 64; isBabel = false; stripped = clean.slice(5);
    } else if (clean.startsWith('64_')) {
      explicitRes = 64; isBabel = false; stripped = clean.slice(3);
    }

    const len = stripped.length;

    if (explicitRes !== null) {
      const spec = RESOLUTIONS[explicitRes];
      if (len !== spec.idLength && len !== spec.paddedIdLength) {
        throw new Error(`ID specifies ${explicitRes}x${explicitRes}, but length is ${len} (expected ${spec.idLength})`);
      }
      return { resolution: explicitRes, strippedId: stripped, isBabel };
    }

    // Auto-detection by length (legacy raw Base64)
    if (len === RESOLUTIONS[32].idLength || len === RESOLUTIONS[32].paddedIdLength) {
      return { resolution: 32, strippedId: stripped, isBabel: false };
    } else if (len === RESOLUTIONS[64].idLength || len === RESOLUTIONS[64].paddedIdLength) {
      return { resolution: 64, strippedId: stripped, isBabel: false };
    } else {
      throw new Error(
        `Invalid ID length: ${len} characters. Expected 5,462 (32×32) or 21,846 (64×64).`
      );
    }
  }

  /**
   * Validates a mathematical ID string.
   * @param {string} idStr 
   * @returns {{ valid: boolean, error: string|null, resolution: number|null, isBabel: boolean }}
   */
  function validateId(idStr) {
    try {
      const { resolution, strippedId, isBabel } = detectResolution(idStr);
      if (!BASE64URL_REGEX.test(strippedId)) {
        return {
          valid: false,
          error: "ID contains invalid characters. Only URL-safe Base64 ([A-Za-z0-9-_]) is allowed.",
          resolution: null,
          isBabel: false
        };
      }
      return { valid: true, error: null, resolution, isBabel };
    } catch (err) {
      return { valid: false, error: err.message, resolution: null, isBabel: false };
    }
  }

  /**
   * Decodes an ID into raw pixel bytes (4096 or 16384 bytes).
   * @param {string} idStr 
   * @returns {Uint8Array}
   */
  function idToBytes(idStr) {
    const { bytes } = idToBytesAndResolution(idStr);
    return bytes;
  }

  /**
   * Decodes an ID into pixel bytes and returns metadata.
   * @param {string} idStr 
   * @returns {{ bytes: Uint8Array, resolution: number, isBabel: boolean }}
   */
  function idToBytesAndResolution(idStr) {
    const validation = validateId(idStr);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { resolution, strippedId, isBabel } = detectResolution(idStr);
    const spec = RESOLUTIONS[resolution];

    let clean = strippedId;
    if (clean.length === spec.paddedIdLength && clean.endsWith('==')) {
      clean = clean.slice(0, spec.idLength);
    }

    const rawPayload = new Uint8Array(spec.totalBytes);
    const fullBlocks = Math.floor(spec.totalBytes / 3);
    let charIdx = 0;
    let byteIdx = 0;

    for (let i = 0; i < fullBlocks; i++) {
      const c0 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c1 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c2 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c3 = REV_LOOKUP[clean.charCodeAt(charIdx++)];

      if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) {
        throw new Error(`Corrupted ID: invalid character at index ${charIdx - 4}`);
      }

      rawPayload[byteIdx++] = (c0 << 2) | (c1 >> 4);
      rawPayload[byteIdx++] = ((c1 & 15) << 4) | (c2 >> 2);
      rawPayload[byteIdx++] = ((c2 & 3) << 6) | c3;
    }

    const c0 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
    const c1 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
    if (c0 < 0 || c1 < 0) {
      throw new Error('Corrupted ID: invalid character in final chunk.');
    }

    rawPayload[byteIdx++] = (c0 << 2) | (c1 >> 4);

    if (isBabel) {
      const perm = global.BabelPermutation;
      if (!perm) {
        throw new Error('BabelPermutation module is required for Babel Address decoding.');
      }
      const pixelBytes = perm.permuteBytes(rawPayload);
      return { bytes: pixelBytes, resolution, isBabel };
    }

    return { bytes: rawPayload, resolution, isBabel };
  }

  function bytesToImageData(bytes, resolution = null) {
    if (!bytes) {
      throw new Error('Bytes array is required.');
    }
    let res = resolution;
    if (res === null) {
      if (bytes.length === RESOLUTIONS[32].totalBytes) res = 32;
      else if (bytes.length === RESOLUTIONS[64].totalBytes) res = 64;
      else {
        throw new Error(`Unknown byte length: ${bytes.length}`);
      }
    }
    const spec = RESOLUTIONS[res];
    const clamped = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return new ImageData(clamped, spec.width, spec.height);
  }

  function decodeIdToImageData(idStr) {
    const { bytes, resolution, isBabel } = idToBytesAndResolution(idStr);
    const imageData = bytesToImageData(bytes, resolution);
    return { imageData, resolution, isBabel };
  }

  function renderIdToCanvas(idStr, targetCanvas, options = {}) {
    if (!targetCanvas) {
      throw new Error('Target canvas is required.');
    }

    const { imageData, resolution, isBabel } = decodeIdToImageData(idStr);
    const spec = RESOLUTIONS[resolution];
    
    const defaultScale = resolution === 32 ? 8 : 4;
    const scale = Math.max(1, options.scale || defaultScale);
    const targetW = spec.width * scale;
    const targetH = spec.height * scale;

    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
    const ctx = targetCanvas.getContext('2d');

    if (scale === 1) {
      ctx.putImageData(imageData, 0, 0);
    } else {
      const offscreen = document.createElement('canvas');
      offscreen.width = spec.width;
      offscreen.height = spec.height;
      const offCtx = offscreen.getContext('2d');
      offCtx.putImageData(imageData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, targetW, targetH);
    }

    return { resolution, width: spec.width, height: spec.height, isBabel };
  }

  function downloadIdAsPng(idStr, scale = 1, filename = null) {
    const canvas = document.createElement('canvas');
    const { resolution } = renderIdToCanvas(idStr, canvas, { scale });
    const name = filename || `infinite_gallery_${resolution}x${resolution}_${idStr.slice(0, 10)}_${canvas.width}x${canvas.height}.png`;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  const InfiniteGalleryDecoder = {
    RESOLUTIONS,
    detectResolution,
    validateId,
    idToBytes,
    idToBytesAndResolution,
    bytesToImageData,
    decodeIdToImageData,
    renderIdToCanvas,
    downloadIdAsPng
  };

  global.InfiniteGalleryDecoder = InfiniteGalleryDecoder;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfiniteGalleryDecoder;
  }
})(typeof window !== 'undefined' ? window : globalThis);
