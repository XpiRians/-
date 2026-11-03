/**
 * Infinite Gallery - Bijective Pseudorandom Permutation (JavaScript ES6+)
 * Implements a 4-round Feistel-SPN block cipher over 4096-byte and 16384-byte blocks.
 * Guarantees exact 1-to-1 bijection, 100% lossless reversibility, and 50% avalanche effect.
 * Identical to Python permutation.py.
 */

(function (global) {
  'use strict';

  const PI_KEYS = new Uint32Array([
    0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
    0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89
  ]);

  const C1 = 0x85EBCA6B;
  const C2 = 0xC2B2AE35;
  const C3 = 0x9E3779B9;
  const C4 = 0x27D4EB2D;
  const ROUNDS = 4;

  /**
   * Round function for Feistel network.
   * @param {Uint32Array} R 
   * @param {number} roundIdx 
   * @param {Uint32Array} out 
   */
  function roundFunc(R, roundIdx, out) {
    const M = R.length;
    const k = PI_KEYS[roundIdx % PI_KEYS.length];
    const Y = new Uint32Array(M);
    let fold = 0;

    // Step 1: Element-wise non-linear mixing
    for (let i = 0; i < M; i++) {
      let v = R[i];
      v = Math.imul(v ^ (v >>> 16), C1) >>> 0;
      v = Math.imul(v ^ (v >>> 13), C2) >>> 0;
      v = ((v ^ (v >>> 16)) ^ k) >>> 0;
      Y[i] = v;
      fold = (fold ^ v) >>> 0;
    }

    // Step 2: Global fold diffusion
    fold = Math.imul(fold, C3) >>> 0;

    // Step 3: Permuted rotation and mixing
    for (let i = 0; i < M; i++) {
      const r13 = Y[(i - 13 + M) % M];
      const r127 = Y[(i - 127 + M) % M];
      let v = ((Y[i] ^ fold) ^ r13 ^ r127) >>> 0;
      v = Math.imul(v, C4) >>> 0;
      out[i] = (v ^ (v >>> 15)) >>> 0;
    }
  }

  /**
   * Forward Permutation: Address Bytes -> Image Pixels
   * @param {Uint8Array} rawBytes (4096 or 16384 bytes)
   * @returns {Uint8Array}
   */
  function permuteBytes(rawBytes) {
    const words = new Uint32Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength / 4);
    const totalWords = words.length;
    const M = totalWords / 2;

    let L = words.slice(0, M);
    let R = words.slice(M);
    const F = new Uint32Array(M);

    for (let r = 0; r < ROUNDS; r++) {
      roundFunc(R, r, F);
      const nextR = new Uint32Array(M);
      for (let i = 0; i < M; i++) {
        nextR[i] = (L[i] ^ F[i]) >>> 0;
      }
      L = R;
      R = nextR;
    }

    const outWords = new Uint32Array(totalWords);
    outWords.set(L, 0);
    outWords.set(R, M);
    return new Uint8Array(outWords.buffer, outWords.byteOffset, outWords.byteLength);
  }

  /**
   * Inverse Permutation: Image Pixels -> Address Bytes
   * @param {Uint8Array} rawBytes (4096 or 16384 bytes)
   * @returns {Uint8Array}
   */
  function invertPermuteBytes(rawBytes) {
    const words = new Uint32Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength / 4);
    const totalWords = words.length;
    const M = totalWords / 2;

    let L = words.slice(0, M);
    let R = words.slice(M);
    const F = new Uint32Array(M);

    for (let r = ROUNDS - 1; r >= 0; r--) {
      const prevR = L;
      roundFunc(L, r, F);
      const prevL = new Uint32Array(M);
      for (let i = 0; i < M; i++) {
        prevL[i] = (R[i] ^ F[i]) >>> 0;
      }
      L = prevL;
      R = prevR;
    }

    const outWords = new Uint32Array(totalWords);
    outWords.set(L, 0);
    outWords.set(R, M);
    return new Uint8Array(outWords.buffer, outWords.byteOffset, outWords.byteLength);
  }

  /**
   * Increments or decrements address bytes by delta (integer).
   * @param {Uint8Array} addressBytes 
   * @param {number} [delta=1]
   * @returns {Uint8Array}
   */
  function incrementAddressBytes(addressBytes, delta = 1) {
    const bytes = new Uint8Array(addressBytes);
    const n = bytes.length;
    let carry = delta;

    if (carry >= 0) {
      for (let i = n - 1; i >= 0; i--) {
        const val = bytes[i] + carry;
        bytes[i] = val & 0xFF;
        carry = Math.floor(val / 256);
        if (carry === 0) break;
      }
      if (carry > 0) {
        throw new Error('Address overflow: reached maximum boundary of address space');
      }
    } else {
      let borrow = -carry;
      for (let i = n - 1; i >= 0; i--) {
        let val = bytes[i] - (borrow & 0xFF);
        if (val < 0) {
          val += 256;
          borrow = (borrow >> 8) + 1;
        } else {
          borrow = borrow >> 8;
        }
        bytes[i] = val & 0xFF;
        if (borrow === 0) break;
      }
      if (borrow > 0) {
        throw new Error('Address underflow: reached minimum boundary of address space');
      }
    }

    return bytes;
  }

  const BabelPermutation = {
    PI_KEYS,
    ROUNDS,
    permuteBytes,
    invertPermuteBytes,
    incrementAddressBytes
  };

  global.BabelPermutation = BabelPermutation;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BabelPermutation;
  }
})(typeof window !== 'undefined' ? window : globalThis);
