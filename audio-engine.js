let ctx = null;
let active = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function makePinkNoiseBuffer(seconds = 10) {
  const c = getCtx();
  const rate = c.sampleRate;
  const buf = c.createBuffer(2, rate * seconds, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + white*0.0555179;
      b1 = 0.99332*b1 + white*0.0750759;
      b2 = 0.96900*b2 + white*0.1538520;
      b3 = 0.86650*b3 + white*0.3104856;
      b4 = 0.55000*b4 + white*0.5329522;
      b5 = -0.7616*b5 - white*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buf;
}

function buildAM({ carrierHz, modHz, modDepth }) {
  const c = getCtx();
  const carrier = c.createOscillator();
  carrier.frequency.value = carrierHz;
  const mod = c.createOscillator();
  mod.frequency.value = modHz;
  const modGain = c.createGain();
  modGain.gain.value = modDepth;
  const out = c.createGain();
  out.gain.value = 1 - modDepth;
  mod.connect(modGain).connect(out.gain);
  carrier.connect(out).connect(c.destination);
  carrier.start(); mod.start();
  return { nodes: [carrier, mod, modGain, out], outGain: out };
}

function buildBinaural({ baseHz, beatHz }) {
  const c = getCtx();
  const left = c.createOscillator();
  const right = c.createOscillator();
  left.frequency.value = baseHz;
  right.frequency.value = baseHz + beatHz;
  const merger = c.createChannelMerger(2);
  const lGain = c.createGain(); lGain.gain.value = 0.25;
  const rGain = c.createGain(); rGain.gain.value = 0.25;
  left.connect(lGain).connect(merger, 0, 0);
  right.connect(rGain).connect(merger, 0, 1);
  const out = c.createGain(); out.gain.value = 1;
  merger.connect(out).connect(c.destination);
  left.start(); right.start();
  return { nodes: [left, right, lGain, rGain, merger, out], outGain: out };
}

function buildNotch({ centerHz, notchBandwidthOctaves }) {
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = makePinkNoiseBuffer(10);
  src.loop = true;
  const notch = c.createBiquadFilter();
  notch.type = 'notch';
  notch.frequency.value = centerHz;
  notch.Q.value = Math.sqrt(2) / (Math.pow(2, notchBandwidthOctaves) - 1) * Math.pow(2, notchBandwidthOctaves/2);
  const out = c.createGain(); out.gain.value = 0.5;
  src.connect(notch).connect(out).connect(c.destination);
  src.start();
  return { nodes: [src, notch, out], outGain: out };
}

function fadeIn(gainNode, seconds) {
  const c = getCtx();
  const target = gainNode.gain.value;
  gainNode.gain.cancelScheduledValues(c.currentTime);
  gainNode.gain.setValueAtTime(0, c.currentTime);
  gainNode.gain.linearRampToValueAtTime(target, c.currentTime + seconds);
}

function scheduleFadeOut(gainNode, startAt, endAt) {
  const c = getCtx();
  if (startAt <= c.currentTime) return;
  gainNode.gain.setValueAtTime(gainNode.gain.value, startAt);
  gainNode.gain.linearRampToValueAtTime(0, endAt);
}

export function play(spec, durationSec, onEnd) {
  stop();
  let graph;
  if (spec.modality === 'am') graph = buildAM(spec.synthesis);
  else if (spec.modality === 'binaural') graph = buildBinaural(spec.synthesis);
  else if (spec.modality === 'notch') {
    if (!spec.synthesis.centerHz) throw new Error('tinnitus pitch required');
    graph = buildNotch({ centerHz: spec.synthesis.centerHz, notchBandwidthOctaves: spec.synthesis.notchBandwidthOctaves });
  } else {
    throw new Error(`unknown modality: ${spec.modality}`);
  }
  fadeIn(graph.outGain, 1.0);
  const c = getCtx();
  const endAt = c.currentTime + durationSec;
  scheduleFadeOut(graph.outGain, Math.max(c.currentTime + 1, endAt - 5), endAt);
  active = {
    graph, endAt, spec,
    stopTimer: setTimeout(() => { stop(); onEnd && onEnd(); }, durationSec * 1000)
  };
}

export function stop() {
  if (!active) return;
  clearTimeout(active.stopTimer);
  const c = getCtx();
  const g = active.graph.outGain.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(g.value, c.currentTime);
  g.linearRampToValueAtTime(0, c.currentTime + 1);
  const nodes = active.graph.nodes;
  setTimeout(() => nodes.forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch {} }), 1100);
  active = null;
}

export function isPlaying() { return active !== null; }

export function getRemaining() {
  if (!active) return 0;
  return Math.max(0, active.endAt - getCtx().currentTime);
}
