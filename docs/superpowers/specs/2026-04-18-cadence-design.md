# Cadence — Evidence-Based Therapeutic Tone App

**Status:** Design — awaiting approval
**Date:** 2026-04-18

## Purpose

A single-file web app that plays only those therapeutic frequencies backed by published peer-reviewed research, with the citation inline on every card. Explicitly excludes solfeggio, chakra, and other frequencies lacking clinical evidence. Differentiator vs existing apps (Soaak, myNoise, JTruax/resonance): per-frequency evidence transparency, validated delivery method per frequency (not user-chosen), and study-matched session durations.

## Success Criteria

- Every playable frequency has at least one peer-reviewed citation visible on its card.
- Delivery method (AM-modulated / binaural / notched) is locked to whatever the cited study used — user cannot swap arbitrarily.
- Session duration presets match study protocols; user can override only with an explicit "non-protocol" warning.
- No layering, no visualizer, no ornamental features. Cut if not backed.
- Loads and plays on mobile Safari + desktop Chrome with zero install.

## Non-Goals

- Not a medical device. Not a treatment recommendation tool.
- Not an exhaustive research library (the existing JTruax knowledge base covers that breadth; Cadence is the filtered, evidence-gated subset).
- No account system, history, or session tracking in v1.
- No EEG integration, biometric input, or phase-locked stimulation (those require hardware).

## v1 Frequency Cards

| # | Frequency | Modality | Dose | Primary evidence | Tier |
|---|-----------|----------|------|------------------|------|
| 1 | 40Hz gamma | AM-modulated tone (1kHz carrier × 40Hz modulation) | 1 hr/day | MIT GENUS (Alzheimer's/MCI multi-trial); healthy-adult attention + cognition RCTs (meta-analysis effect size ~0.58) | A |
| 2 | Tinnitus notch | Pink noise with 1-octave notch centered at user's tinnitus pitch | 2 hr/day, ≥3 mo | Münster TMNMT RCT (n=100); PNAS notched-music study | A |
| 3 | 3Hz delta | Binaural beat | 90 min pre-sleep | 2022 pilot (Dabiri et al) — increased stage-3 sleep, sleep-quality improvement | B |
| 4 | 6Hz theta | Binaural beat + ambient sound layer | 20–30 min | Frontiers 2017 (theta induction ~10 min), military stress RCT (music-embedded) | B |
| 5 | 10Hz alpha | Binaural beat | 10–20 min | MDD adjunct RCT (ScienceDirect 2021); 2025 IAF-customized studies | B |
| 6 | 15Hz beta — "Adult ADHD study support" | Binaural beat | 8 min per session | Adult-ADHD add-on pilot RCT (subjective study-performance improvement; objective attention unchanged); working-memory RCT | B |
| 7 | 40Hz vibroacoustic (info-only, no playback) | — | — | Naghdi 2015 fibromyalgia RCT — **tactile modality; headphone delivery not equivalent; requires vibroacoustic hardware** | C |

**Evidence tiers:**
- **A** — multiple RCTs or landmark clinical trial
- **B** — pilot or small RCT
- **C** — tactile modality only; no audio playback — informational card with hardware disclosure

**Explicitly excluded:** solfeggio (174/396/528/…/963Hz), chakra frequencies, 7.83Hz Schumann/cosmic resonance, un-phase-locked pink noise for sleep (validated protocol requires real-time EEG phase-locking), sub-delta 0.25Hz.

## Architecture

**Single-file static web app.**

- `index.html` — markup + embedded `<script type="module">` + inline `<style>`. Zero build step.
- `frequencies.json` — data file with per-card metadata: id, label, modality, default dose, carrier Hz, modulation Hz, binaural L/R Hz, tier, study citations (title, journal, year, DOI/URL), disclosure text.
- `audio-engine.js` — Web Audio API synthesis. One `AudioContext`, reusable oscillator/gain graph per active card. Supports:
  - AM-modulated tone (carrier OscillatorNode × modulation GainNode driven by a second Oscillator)
  - Binaural (two OscillatorNodes panned hard L / R via ChannelMergerNode; merged to a stereo destination)
  - Notched noise (AudioBufferSourceNode with pink-noise buffer → BiquadFilterNode in notch mode, bandwidth = 1 octave at user's tinnitus pitch)
- `ui.js` — card rendering, play/pause, timer display, fade-out, tinnitus-pitch-matcher modal.
- `tinnitus-matcher.js` — pitch-matching flow: user adjusts a slider (100Hz–8000Hz), hears a tone, indicates "matches my tinnitus"; app stores the frequency in `localStorage` and uses it as the notch center.

**Data flow:**
1. On load: fetch `frequencies.json`, render cards.
2. User clicks play on a card → `audio-engine.play(cardId, dose)` builds the right audio graph, starts a timer, schedules auto-fade at `dose - 5s`.
3. Single active card at a time (no layering). Starting a new card stops the current.
4. Pause/stop fades out over 1s.

## Key Interfaces

```js
// audio-engine.js
play(cardSpec, durationSec)  // builds & starts audio graph; schedules fadeout
stop()                        // fades active graph over 1s, tears down nodes
isPlaying()
getElapsed()

// tinnitus-matcher.js
openMatcher() -> Promise<Hz>  // modal; resolves with user's matched pitch
getSavedPitch() -> Hz | null  // reads localStorage

// ui.js
renderCards(freqData)
bindControls()
```

## Error Handling (boundary only)

- **AudioContext unavailable / blocked:** show a one-time banner "Tap any card to enable audio" (Safari autoplay policy). No silent failures.
- **User navigates away:** `AudioContext.suspend()` on `visibilitychange`; resume on return only if user had an active session.
- **Tinnitus notch but no saved pitch:** prompt matcher before first play.
- **No fallbacks for "scenarios that can't happen."** Trust Web Audio support on mobile Safari 14+ / Chrome 90+ (browsers below that are out of scope).

## Testing

- **Audio correctness:** Python offline script (`scripts/verify_tones.py`) generates reference WAVs for each card's synthesis spec; manual A/B against the in-browser output with a reference meter. Verifies: 40Hz modulation envelope depth, binaural L–R frequency delta, notch depth at matched pitch.
- **UI smoke test:** manual — load on desktop Chrome + mobile Safari, verify each card plays, fade-out triggers at dose completion, only one card active at a time.
- No unit-test framework for v1 — ships too few units to justify.

## Out of Scope for v1 (future)

- Port the audio engine into Sift (Flutter). Tracked in user memory `project_sound_rx_into_sift.md`.
- Pulsed-haptic 40Hz experimental mode on mobile (rejected for v1; can't replicate vibroacoustic protocol faithfully).
- User-customizable IAF-aligned alpha (2025 literature supports it; adds calibration flow complexity).
- Persistent session history / streaks.

## Disclosures on Every Page

- "Not a medical device. Not a substitute for professional care."
- Evidence tier badge on every card.
- For card #7: no play button, only study link + hardware requirement statement.
