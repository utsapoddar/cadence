# Cadence

Evidence-backed audio therapeutics, peer-reviewed. Eight sound "modules" — focus, sleep, tinnitus relief, ADHD support, relaxation, and more — each tied to a published clinical study. No solfeggio, no chakras, no cosmic resonance.

**[Launch Cadence →](https://utsapoddar.github.io/cadence/)**

## How It Works

A zero-build static web app served from GitHub Pages. Every sound is synthesized live in the browser with the Web Audio API — no audio files ever downloaded.

1. **Curate** — `frequencies.json` defines the module catalog. Every entry is gated on peer-reviewed support (RCT, pilot RCT, or systematic review) and tagged with an evidence tier (A/B/C)
2. **Synthesize** — The audio engine builds each tone on demand: amplitude modulation for 40 Hz GENUS, binaural beats for delta/theta/alpha/beta, notched pink noise for tinnitus, and white noise for ADHD
3. **Cite** — Each card surfaces its exact source (journal, year, DOI link) behind a `+INFO` panel, so nothing is asserted without a trail back to the literature
4. **Calibrate** — The tinnitus module opens a pitch-matching dialog the first time it plays and stores the user's pitch locally for a tailored notch filter
5. **Render** — A hand-built "laboratory-radio" interface (Fraunces + IBM Plex Mono + a phosphor-lime accent) animated with GSAP for entrance staggers and freq-lock transitions

## Modules

| # | Module | Evidence Tier | Synthesis |
|---|---|---|---|
| 001 | 40 Hz gamma — focus & memory | A | AM-modulated 1 kHz carrier |
| 002 | Tinnitus notched pink noise | A | User-tuned notch filter |
| 003 | 3 Hz delta — sleep support | B | Binaural beat (200 / 203 Hz) |
| 004 | 6 Hz theta — relaxation | B | Binaural beat (240 / 246 Hz) |
| 005 | 10 Hz alpha — mood lift | B | Binaural beat (220 / 230 Hz) |
| 006 | 15 Hz beta — adult ADHD study | B | Binaural beat (250 / 265 Hz) |
| 007 | White noise — ADHD / inattention | B | Broadband white noise |
| 008 | 40 Hz vibroacoustic — fibromyalgia | C | Tactile hardware only (info-only) |

## Evidence Policy

Included: only frequencies with published peer-reviewed clinical support — RCTs, pilot trials, or systematic reviews. Each card cites its primary source directly.

Excluded by design: solfeggio frequencies, chakra tuning, Schumann-resonance therapy claims, un-phase-locked pink noise for sleep (the Northwestern protocol requires real-time EEG locking that can't ship in-browser), and any "entrainment" claims not backed by neuroscience literature.

Two further rules follow from that policy. Delivery method is locked to whatever the cited
study used — AM-modulated, binaural, or notched — rather than left to the user, and session
durations default to the study protocol, with an explicit warning on override. Cadence is
not a medical device and does not make treatment recommendations.

## Project Structure

```
cadence/
├── index.html              # App shell, fonts, grain/scanline layers
├── style.css               # Laboratory-radio design system
├── ui.js                   # Card rendering, play controls, GSAP motion
├── audio-engine.js         # Web Audio graph builders (AM / binaural / notch / white noise)
├── tinnitus-matcher.js     # Pitch-matching modal with localStorage persistence
├── frequencies.json        # Module catalog (headline, blurb, synthesis, citations)
└── scripts/
    ├── verify_tones.py     # Offline WAV generator for A/B verification
    └── requirements.txt    # numpy, scipy
```

## Tech Stack

| Component | Tool |
|---|---|
| Synthesis | Web Audio API (AudioContext, OscillatorNode, BiquadFilterNode, ChannelMergerNode) |
| UI | Vanilla JavaScript ES modules — no framework, no build step |
| Animation | GSAP 3.12 (CDN) for entrance stagger, freq-lock, SVG path draw |
| Typography | Fraunces (display) + IBM Plex Mono / Sans (Google Fonts) |
| Hosting | GitHub Pages (static) |
| Verification | Python + numpy + scipy for offline tone generation |

## Run Locally

Open `index.html` in a modern browser, or:

    python3 -m http.server 8000

then visit http://localhost:8000.

No dependencies, no build step, no API keys.

## Verify the Tones

The `scripts/verify_tones.py` helper reproduces each module as a WAV file using numpy and scipy — useful for spectrum analysis or A/B comparison against the in-browser synthesis.

    cd scripts
    pip install -r requirements.txt
    python3 verify_tones.py

## Caveats

Cadence is not a medical device. The evidence tiers reflect the strength of the literature, not a guarantee of effect. Binaural beats in particular show strong subjective benefit in RCTs but mixed objective performance gains. The tinnitus notched-noise protocol requires months of consistent use (2+ hr/day) to show effect in the cited trials.
