"""Generate reference WAV files for each card's synthesis spec.
Manual A/B against the browser output to verify JS synthesis is correct.

Usage:
    python3 -m venv scripts/.venv
    source scripts/.venv/bin/activate
    pip install -r scripts/requirements.txt
    python3 scripts/verify_tones.py
"""
import json
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import iirnotch, lfilter

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(__file__), 'reference_wavs')
os.makedirs(OUT_DIR, exist_ok=True)
DURATION = 10


def am(carrier_hz, mod_hz, mod_depth):
    t = np.arange(SR * DURATION) / SR
    env = (1 - mod_depth) + mod_depth * np.sin(2 * np.pi * mod_hz * t)
    sig = env * np.sin(2 * np.pi * carrier_hz * t)
    return np.stack([sig, sig], axis=-1)


def binaural(base_hz, beat_hz):
    t = np.arange(SR * DURATION) / SR
    left = np.sin(2 * np.pi * base_hz * t)
    right = np.sin(2 * np.pi * (base_hz + beat_hz) * t)
    return np.stack([left, right], axis=-1)


def pink_noise(n):
    ncols = 16
    arr = np.random.randn(n, ncols)
    arr = np.cumsum(arr, axis=1) / np.arange(1, ncols + 1)
    return arr.mean(axis=1)


def notch(center_hz, octaves=1.0):
    n = SR * DURATION
    pink_l = pink_noise(n)
    pink_r = pink_noise(n)
    Q = np.sqrt(2) / (2 ** octaves - 1) * 2 ** (octaves / 2)
    b, a = iirnotch(center_hz / (SR / 2), Q)
    return np.stack([lfilter(b, a, pink_l), lfilter(b, a, pink_r)], axis=-1)


def to_int16(sig):
    peak = max(1e-9, float(np.max(np.abs(sig))))
    return (sig / peak * 0.5 * 32767).astype(np.int16)


def main():
    here = os.path.dirname(__file__)
    data = json.load(open(os.path.join(here, '..', 'frequencies.json')))
    for card in data:
        mod = card['modality']
        if mod == 'am':
            s = card['synthesis']
            sig = am(s['carrierHz'], s['modHz'], s['modDepth'])
        elif mod == 'binaural':
            s = card['synthesis']
            sig = binaural(s['baseHz'], s['beatHz'])
        elif mod == 'notch':
            sig = notch(4000, card['synthesis']['notchBandwidthOctaves'])
        else:
            continue
        path = os.path.join(OUT_DIR, f"{card['id']}.wav")
        wavfile.write(path, SR, to_int16(sig))
        print(f"wrote {path}")


if __name__ == '__main__':
    main()
