import { play, stop, getRemaining } from './audio-engine.js';
import { openMatcher, getSavedPitch } from './tinnitus-matcher.js';

const state = { data: [], activeId: null, timerInterval: null };

function fmtDose(sec) {
  if (sec == null) return '';
  if (sec >= 3600) return `${sec/3600} hr`;
  if (sec >= 60) return `${sec/60} min`;
  return `${sec} s`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderCard(card, index) {
  const slotNum = String((index || 0) + 1).padStart(3, '0');
  let freqHz = '';
  let specialReadout = '';
  if (card.synthesis) {
    freqHz = card.synthesis.modHz || card.synthesis.beatHz || card.synthesis.centerHz || '';
  }
  
  if (card.id === 'tinnitus-notch') {
    freqHz = '';
    specialReadout = `
      <div class="freq-readout special">
        <div class="special-graphic" aria-hidden="true">
          <svg viewBox="0 0 100 40" class="notch-svg" preserveAspectRatio="none">
            <path d="M0,20 L30,20 C40,20 45,35 50,35 C55,35 60,20 70,20 L100,20" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="50" cy="35" r="3" fill="currentColor"/>
          </svg>
        </div>
      </div>`;
  } else if (card.id === 'white-noise-adhd') {
    freqHz = '';
    specialReadout = `
      <div class="freq-readout special">
        <div class="special-graphic" aria-hidden="true">
          <div class="spectrogram">
            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
      </div>`;
  } else if (card.id === 'vibroacoustic-40') {
    freqHz = '40';
  }

  const freqReadoutHTML = specialReadout || (freqHz 
    ? `<div class="freq-readout"><span class="value">${freqHz}</span><span class="unit">${typeof freqHz === 'number' || freqHz === '40' ? 'Hz' : ''}</span></div>`
    : '');

  const modalityLabel = card.modality ? `<span class="mode">${escapeHtml(card.modality)}</span>` : '';

  const slot = `<div class="slot">
    <span class="glyph">✧</span>
    <span class="mono">MODULE · ${slotNum}</span>
    ${card.icon ? `<span class="icon" aria-hidden="true">${escapeHtml(card.icon)}</span>` : ''}
  </div>`;

  const cites = card.citations.map(c =>
    `<a class="cite" target="_blank" rel="noopener" href="${escapeHtml(c.url)}">${escapeHtml(c.title)} — ${escapeHtml(c.journal)}, ${c.year}</a>`
  ).join('');
  const disclosure = card.tier === 'C'
    ? `<div class="disclosure">${escapeHtml(card.notes)}</div>` : '';
  const playBtn = card.tier === 'C'
    ? '' : `<button class="play" data-play="${card.id}"><div class="led"></div><span class="label">Play</span><span class="dose-txt">${fmtDose(card.doseSec)}</span></button>`;
  const progress = card.tier === 'C' ? '' : `
    <div class="progress"><div class="fill" data-fill="${card.id}"></div></div>
    <div class="remaining" data-remaining="${card.id}"></div>`;
  const infoClass = card.tier === 'C' ? ' info-only' : '';
  const headline = escapeHtml(card.headline || card.label);
  const blurb = card.blurb ? `<p class="blurb">${escapeHtml(card.blurb)}</p>` : '';
  const icon = card.icon ? `<div class="icon" aria-hidden="true">${escapeHtml(card.icon)}</div>` : '';
  const details = `
    <div class="details" data-details="${card.id}" hidden>
      <div class="tech-label">${escapeHtml(card.label)}</div>
      <div class="tech-note">${escapeHtml(card.notes)}</div>
      <div class="dose">Protocol dose: ${fmtDose(card.doseSec) || '—'}</div>
      <div class="citations">${cites}</div>
    </div>`;
    
  const controls = card.tier === 'C' ? '' : `
    <div class="controls">
      ${progress}
      ${playBtn}
    </div>`;

  return `
    <section class="card${infoClass}" data-id="${card.id}">
      <div class="card-head">
        <div class="card-head-left">
          ${slot}
          ${freqReadoutHTML}
          <h2>${headline}</h2>
        </div>
        <div class="card-head-right">
          <button class="info" data-info="${card.id}" aria-label="Show technical details and studies">i</button>
          ${modalityLabel}
          <span class="tier ${card.tier}">Tier ${card.tier}</span>
        </div>
      </div>
      ${blurb}
      ${disclosure}
      ${details}
      ${controls}
    </section>`;
}

async function onPlayClick(id) {
  if (state.activeId === id) {
    stop();
    state.activeId = null;
    stopCountdown();
    updateButtons();
    return;
  }
  const card = state.data.find(d => d.id === id);
  if (!card) return;
  let spec = card;
  if (card.modality === 'notch') {
    let pitch = getSavedPitch();
    if (!pitch) pitch = await openMatcher();
    if (!pitch) return;
    spec = { ...card, synthesis: { ...card.synthesis, centerHz: pitch } };
  }
  play(spec, card.doseSec, () => {
    state.activeId = null;
    stopCountdown();
    updateButtons();
  });
  state.activeId = id;
  updateButtons();
  startCountdown();
  animateFreqLock(id);
}

function animateFreqLock(id) {
  if (!window.gsap) return;
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;
  gsap.fromTo(card,
    { scale: 1 },
    { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  const readout = card.querySelector('.freq-readout');
  if (readout) {
    gsap.fromTo(readout,
      { opacity: 0.1, filter: 'blur(10px)', scale: 1.15 },
      { opacity: 1, filter: 'blur(0)', scale: 1, duration: 0.7, ease: 'power2.out' });
  }
  const value = card.querySelector('.freq-readout .value');
  if (value) {
    const target = parseFloat(value.textContent);
    if (!isNaN(target)) {
      const obj = { n: 0 };
      const originalText = value.textContent;
      gsap.to(obj, {
        n: target,
        duration: 0.9,
        ease: 'power3.out',
        onUpdate: () => { value.textContent = target < 10 ? obj.n.toFixed(1) : Math.round(obj.n); },
        onComplete: () => { value.textContent = originalText; }
      });
    }
  }
  const notch = card.querySelector('.notch-svg path');
  if (notch) {
    const len = notch.getTotalLength ? notch.getTotalLength() : 200;
    gsap.fromTo(notch,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' });
  }
  const bars = card.querySelectorAll('.spectrogram span');
  if (bars.length) {
    gsap.fromTo(bars,
      { scaleY: 0.1, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.4, stagger: 0.02, ease: 'back.out(2)' });
  }
}

function animateEntrance() {
  if (!window.gsap) { console.warn('[cadence] GSAP not loaded'); return; }
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.mast-meta', { y: -20, opacity: 0, duration: 0.6 })
    .from('.wordmark', { y: -80, opacity: 0, scale: 0.85, duration: 1.1, ease: 'elastic.out(1, 0.65)' }, '-=0.25')
    .from('.tagline', { y: 20, opacity: 0, duration: 0.6 }, '-=0.5')
    .from('.legend-item', { y: 16, opacity: 0, duration: 0.45, stagger: 0.08 }, '-=0.3')
    .from('.card', {
      y: 60, opacity: 0, scale: 0.9,
      duration: 0.75, stagger: 0.09,
      ease: 'back.out(1.4)'
    }, '-=0.2');
}

function attachCardHover() {
  if (!window.gsap) return;
  document.querySelectorAll('.card').forEach(card => {
    const head = card.querySelector('.card-head-left') || card.querySelector('.card-head');
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -6, scale: 1.015, duration: 0.3, ease: 'power2.out' });
      if (head) gsap.to(head, { x: 2, duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
      if (head) gsap.to(head, { x: 0, duration: 0.4, ease: 'power2.out' });
    });
  });
}

function updateButtons() {
  document.querySelectorAll('button[data-play]').forEach(btn => {
    const id = btn.getAttribute('data-play');
    const label = btn.querySelector('.label');
    if (label) {
      label.textContent = id === state.activeId ? 'Stop' : 'Play';
    }
  });
  document.querySelectorAll('.card').forEach(el => {
    el.classList.toggle('playing', el.getAttribute('data-id') === state.activeId);
  });
}

function startCountdown() {
  stopCountdown();
  const card = state.data.find(d => d.id === state.activeId);
  const total = card ? card.doseSec : 0;
  state.timerInterval = setInterval(() => {
    const el = document.querySelector(`[data-remaining="${state.activeId}"]`);
    const fill = document.querySelector(`[data-fill="${state.activeId}"]`);
    const r = Math.ceil(getRemaining());
    if (el) el.textContent = r > 0 ? `${Math.floor(r/60)}:${String(r%60).padStart(2,'0')} remaining` : '';
    if (fill && total) fill.style.width = `${Math.min(100, ((total - r) / total) * 100)}%`;
  }, 500);
}

function stopCountdown() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  document.querySelectorAll('.remaining').forEach(el => el.textContent = '');
  document.querySelectorAll('.progress .fill').forEach(el => el.style.width = '0%');
}

async function init() {
  state.data = await fetch('./frequencies.json').then(r => r.json());
  const host = document.getElementById('cards');
  const banner = document.getElementById('audio-banner');
  host.insertAdjacentHTML('beforeend', state.data.map(renderCard).join(''));
  host.addEventListener('click', e => {
    const playBtn = e.target.closest('button[data-play]');
    if (playBtn) { onPlayClick(playBtn.getAttribute('data-play')); return; }
    const infoBtn = e.target.closest('button[data-info]');
    if (infoBtn) {
      const id = infoBtn.getAttribute('data-info');
      const panel = document.querySelector(`[data-details="${id}"]`);
      if (panel) panel.hidden = !panel.hidden;
      infoBtn.classList.toggle('open', panel && !panel.hidden);
    }
  });
  try {
    const testCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (testCtx.state === 'suspended') banner.hidden = false;
    testCtx.close && testCtx.close();
  } catch {}
  document.addEventListener('click', () => { banner.hidden = true; }, { once: true });
  animateEntrance();
  attachCardHover();
}
init();
