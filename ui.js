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

function renderCard(card) {
  const cites = card.citations.map(c =>
    `<a class="cite" target="_blank" rel="noopener" href="${escapeHtml(c.url)}">${escapeHtml(c.title)} — ${escapeHtml(c.journal)}, ${c.year}</a>`
  ).join('');
  const disclosure = card.tier === 'C'
    ? `<div class="disclosure">${escapeHtml(card.notes)}</div>` : '';
  const playBtn = card.tier === 'C'
    ? '' : `<button data-play="${card.id}">Play · ${fmtDose(card.doseSec)}</button>`;
  const remaining = card.tier === 'C'
    ? '' : `<div class="remaining" data-remaining="${card.id}"></div>`;
  const infoClass = card.tier === 'C' ? ' info-only' : '';
  const descNotes = card.tier === 'C' ? '' : `<p>${escapeHtml(card.notes)}</p>`;
  return `
    <section class="card${infoClass}" data-id="${card.id}">
      <h2>${escapeHtml(card.label)}<span class="tier ${card.tier}">Tier ${card.tier}</span></h2>
      <div class="dose">Protocol dose: ${fmtDose(card.doseSec) || '—'}</div>
      ${descNotes}
      ${disclosure}
      ${cites}
      ${remaining}
      ${playBtn}
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
    const card = state.data.find(d => d.id === id);
    btn.textContent = id === state.activeId
      ? 'Stop'
      : `Play · ${fmtDose(card.doseSec)}`;
  });
}

function startCountdown() {
  stopCountdown();
  state.timerInterval = setInterval(() => {
    const el = document.querySelector(`[data-remaining="${state.activeId}"]`);
    if (!el) return;
    const r = Math.ceil(getRemaining());
    el.textContent = r > 0 ? `${Math.floor(r/60)}:${String(r%60).padStart(2,'0')} remaining` : '';
  }, 500);
}

function stopCountdown() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  document.querySelectorAll('.remaining').forEach(el => el.textContent = '');
}

async function init() {
  state.data = await fetch('./frequencies.json').then(r => r.json());
  const host = document.getElementById('cards');
  const banner = document.getElementById('audio-banner');
  host.insertAdjacentHTML('beforeend', state.data.map(renderCard).join(''));
  host.addEventListener('click', e => {
    const btn = e.target.closest('button[data-play]');
    if (btn) onPlayClick(btn.getAttribute('data-play'));
  });
  try {
    const testCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (testCtx.state === 'suspended') banner.hidden = false;
    testCtx.close && testCtx.close();
  } catch {}
  document.addEventListener('click', () => { banner.hidden = true; }, { once: true });
}
init();
