/**
 * Infinite Gallery - Generator & Navigation Module (JavaScript ES6+)
 * Generates random images and enables navigation between adjacent Babel coordinates.
 */

(function (global) {
  'use strict';

  const RESOLUTIONS = {
    32: { totalBytes: 4096, width: 32, height: 32, totalBits: 32768, prefix: 'b32_' },
    64: { totalBytes: 16384, width: 64, height: 64, totalBits: 131072, prefix: 'b64_' }
  };

  const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const REV_LOOKUP = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64_CHARS.length; i++) {
    REV_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
  }

  function generateRandomBytes(resolution = 32) {
    const res = (resolution === 64) ? 64 : 32;
    const totalBytes = RESOLUTIONS[res].totalBytes;
    const bytes = new Uint8Array(totalBytes);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < totalBytes; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return bytes;
  }

  /**
   * Generates a random Babel Address ID.
   * @param {number} [resolution=32] 
   * @param {boolean} [useBabel=true]
   * @returns {string} ID
   */
  function generateRandomId(resolution = 32, useBabel = true) {
    const encoder = global.InfiniteGalleryEncoder;
    if (!encoder) {
      throw new Error('InfiniteGalleryEncoder is required for ID generation.');
    }
    const res = (resolution === 64) ? 64 : 32;
    const bytes = generateRandomBytes(res);
    const prefix = useBabel ? RESOLUTIONS[res].prefix : null;
    return encoder.bytesToId(bytes, res, prefix, false);
  }

  /**
   * Steps to an adjacent address by delta (+1 for Next, -1 for Previous).
   * @param {string} idStr 
   * @param {number} [delta=1]
   * @returns {string} New adjacent address ID
   */
  function stepAddress(idStr, delta = 1) {
    const decoder = global.InfiniteGalleryDecoder;
    const encoder = global.InfiniteGalleryEncoder;
    const perm = global.BabelPermutation;

    if (!decoder || !encoder || !perm) {
      throw new Error('Decoder, Encoder, and Permutation modules are required for stepping.');
    }

    const { resolution, strippedId, isBabel } = decoder.detectResolution(idStr);
    const spec = RESOLUTIONS[resolution];

    // Decode base64 to address bytes
    let clean = strippedId;
    if (clean.length === spec.paddedIdLength && clean.endsWith('==')) {
      clean = clean.slice(0, spec.idLength);
    }

    const addressBytes = new Uint8Array(spec.totalBytes);
    const fullBlocks = Math.floor(spec.totalBytes / 3);
    let charIdx = 0;
    let byteIdx = 0;

    for (let i = 0; i < fullBlocks; i++) {
      const c0 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c1 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c2 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      const c3 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
      addressBytes[byteIdx++] = (c0 << 2) | (c1 >> 4);
      addressBytes[byteIdx++] = ((c1 & 15) << 4) | (c2 >> 2);
      addressBytes[byteIdx++] = ((c2 & 3) << 6) | c3;
    }
    const c0 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
    const c1 = REV_LOOKUP[clean.charCodeAt(charIdx++)];
    addressBytes[byteIdx++] = (c0 << 2) | (c1 >> 4);

    // Apply big-endian integer step
    const steppedBytes = perm.incrementAddressBytes(addressBytes, delta);
    const prefix = isBabel ? spec.prefix : null;
    return encoder.bytesToId(steppedBytes, resolution, prefix, false);
  }

  function generateBatch(count = 12, resolution = 32, useBabel = true) {
    const res = (resolution === 64) ? 64 : 32;
    const spec = RESOLUTIONS[res];
    const items = [];

    for (let i = 0; i < count; i++) {
      const id = generateRandomId(res, useBabel);
      items.push({
        index: i,
        id,
        resolution: res,
        width: spec.width,
        height: spec.height,
        channels: 'RGBA',
        bytes: spec.totalBytes,
        bits: spec.totalBits
      });
    }
    return items;
  }

  const InfiniteGalleryGenerator = {
    generateRandomBytes,
    generateRandomId,
    stepAddress,
    generateBatch
  };

  global.InfiniteGalleryGenerator = InfiniteGalleryGenerator;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfiniteGalleryGenerator;
  }
})(typeof window !== 'undefined' ? window : globalThis);
