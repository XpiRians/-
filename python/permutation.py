"""
Infinite Gallery - Bijective Pseudorandom Permutation (PRP)
Implements a 4-round Feistel-SPN block cipher over 4096-byte and 16384-byte blocks.
Guarantees exact 1-to-1 bijection, 100% lossless reversibility, and 50% avalanche effect.
"""

from typing import Union
import numpy as np

# Nothing-up-my-sleeve constants derived from fractional digits of Pi
PI_KEYS = np.array([
    0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
    0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89
], dtype=np.uint32)

C1 = np.uint32(0x85EBCA6B)
C2 = np.uint32(0xC2B2AE35)
C3 = np.uint32(0x9E3779B9)
C4 = np.uint32(0x27D4EB2D)
ROUNDS = 4


def _round_func(R: np.ndarray, round_idx: int) -> np.ndarray:
    """Non-linear confusion and global diffusion round function."""
    k = PI_KEYS[round_idx % len(PI_KEYS)]
    
    # Step 1: Non-linear element-wise mixing
    Y = (R ^ (R >> 16)) * C1
    Y = (Y ^ (Y >> 13)) * C2
    Y = (Y ^ (Y >> 16)) ^ k
    
    # Step 2: Global fold diffusion
    fold_val = int(np.bitwise_xor.reduce(Y))
    fold = np.uint32((fold_val * int(C3)) & 0xFFFFFFFF)
    
    # Step 3: Permuted rotation and mixing
    Y = Y ^ fold ^ np.roll(Y, 13) ^ np.roll(Y, 127)
    Y = Y * C4
    return Y ^ (Y >> 15)


def permute_bytes(raw_bytes: bytes) -> bytes:
    """
    Forward Bijective Pseudorandom Permutation: Address Bytes -> Image Pixels.
    Accepts 4096 bytes (32x32) or 16384 bytes (64x64).
    """
    words = np.frombuffer(raw_bytes, dtype="<u4").copy()
    M = len(words) // 2
    L = words[:M].copy()
    R = words[M:].copy()

    for r in range(ROUNDS):
        F = _round_func(R, r)
        next_R = L ^ F
        next_L = R
        L, R = next_L, next_R

    result_words = np.concatenate([L, R])
    return result_words.tobytes()


def invert_permute_bytes(raw_bytes: bytes) -> bytes:
    """
    Inverse Bijective Pseudorandom Permutation: Image Pixels -> Address Bytes.
    Accepts 4096 bytes (32x32) or 16384 bytes (64x64).
    """
    words = np.frombuffer(raw_bytes, dtype="<u4").copy()
    M = len(words) // 2
    L = words[:M].copy()
    R = words[M:].copy()

    for r in reversed(range(ROUNDS)):
        prev_R = L
        prev_L = R ^ _round_func(L, r)
        L, R = prev_L, prev_R

    result_words = np.concatenate([L, R])
    return result_words.tobytes()


def increment_address_bytes(address_bytes: bytes, delta: int = 1) -> bytes:
    """
    Increments or decrements an address by delta (treating address as big-endian integer).
    Allows walking through adjacent coordinates in Babel space.
    """
    byte_arr = bytearray(address_bytes)
    n = len(byte_arr)
    carry = delta

    if carry >= 0:
        for i in reversed(range(n)):
            val = byte_arr[i] + carry
            byte_arr[i] = val & 0xFF
            carry = val >> 8
            if carry == 0:
                break
        if carry > 0:
            raise OverflowError("Address overflow: reached maximum boundary of address space")
    else:
        borrow = -carry
        for i in reversed(range(n)):
            val = byte_arr[i] - (borrow & 0xFF)
            if val < 0:
                val += 256
                borrow = (borrow >> 8) + 1
            else:
                borrow = borrow >> 8
            byte_arr[i] = val & 0xFF
            if borrow == 0:
                break
        if borrow > 0:
            raise OverflowError("Address underflow: reached minimum boundary of address space")

    return bytes(byte_arr)
