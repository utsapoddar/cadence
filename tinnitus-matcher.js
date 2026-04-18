const KEY = 'cadence.tinnitusHz';
let probeCtx = null, probeOsc = null, probeGain = null;

function startProbe(hz) {
  if (!probeCtx) probeCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (probeCtx.state === 'suspended') probeCtx.resume();
  stopProbe();
  probeOsc = probeCtx.createOscillator();
  probeGain = probeCtx.createGain();
  probeGain.gain.value = 0.05;
  probeOsc.frequency.value = hz;
  probeOsc.connect(probeGain).connect(probeCtx.destination);
  probeOsc.start();
}

function stopProbe() {
  if (probeOsc) { try { probeOsc.stop(); probeOsc.disconnect(); } catch {} probeOsc = null; }
  if (probeGain) { try { probeGain.disconnect(); } catch {} probeGain = null; }
}

export function getSavedPitch() {
  const v = localStorage.getItem(KEY);
  return v ? Number(v) : null;
}

export function openMatcher() {
  const dlg = document.getElementById('tinnitus-modal');
  const slider = document.getElementById('tinnitus-slider');
  const readout = document.getElementById('tinnitus-freq');
  const save = document.getElementById('tinnitus-save');
  const cancel = document.getElementById('tinnitus-cancel');

  slider.value = getSavedPitch() || 4000;
  readout.textContent = `${slider.value} Hz`;
  startProbe(Number(slider.value));

  const onInput = () => {
    readout.textContent = `${slider.value} Hz`;
    startProbe(Number(slider.value));
  };
  slider.addEventListener('input', onInput);

  return new Promise(resolve => {
    const cleanup = () => {
      stopProbe();
      slider.removeEventListener('input', onInput);
      save.onclick = cancel.onclick = null;
      dlg.close();
    };
    save.onclick = () => {
      const hz = Number(slider.value);
      localStorage.setItem(KEY, hz);
      cleanup(); resolve(hz);
    };
    cancel.onclick = () => { cleanup(); resolve(null); };
    dlg.showModal();
  });
}
