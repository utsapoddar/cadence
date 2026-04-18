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
        ${slot}
        ${modalityLabel}
        ${freqReadoutHTML}
        <h2>${headline}<span class="tier ${card.tier}">Tier ${card.tier}</span></h2>
        <button class="info" data-info="${card.id}" aria-label="Show technical details and studies">i</button>
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
}
init();
