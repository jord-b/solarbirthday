/* ============================================================
   Solar Birthday
   A "solar birthday" is one true lap around the Sun, measured
   against the fixed stars (a sidereal year) rather than the
   human calendar. Everything runs locally in the browser.
   ============================================================ */

'use strict';

/* --- Astronomical constants --------------------------------
   Sidereal year: 365 d 6 h 9 m 10 s = 365.25636 days.
   The time for Earth to return to the same position relative
   to the distant stars — a genuine lap around the Sun.        */
const SIDEREAL_YEAR_MS =
  (365 * 24 * 60 * 60 + 6 * 60 * 60 + 9 * 60 + 10) * 1000; // 365.25636 days

/* Length of Earth's orbital path per lap (~2·π·1 AU). */
const ORBIT_PATH_KM = 939_886_400;      // ≈ 940 million km per lap
const KM_PER_MILE   = 1.609344;

const ARC_CIRCUMFERENCE = 2 * Math.PI * 170; // matches the SVG radius

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

const els = {
  form: $('form'),
  name: $('name'),
  birthday: $('birthday'),
  birthtime: $('birthtime'),
  error: $('error'),
  results: $('results'),
  roValue: $('roValue'),
  roLabel: $('roLabel'),
  earthGroup: $('earthGroup'),
  arc: $('progressArc'),
  cdEyebrow: $('cdEyebrow'),
  cdLaps: $('cdLaps'),
  cdD: $('cdD'), cdH: $('cdH'), cdM: $('cdM'), cdS: $('cdS'),
  cdDate: $('cdDate'),
  stAge: $('stAge'),
  stDist: $('stDist'), stDistSub: $('stDistSub'),
  stProg: $('stProg'), stProgSub: $('stProgSub'),
  stDrift: $('stDrift'), stDriftSub: $('stDriftSub'),
  tbody: document.querySelector('#results-table tbody'),
  tableScroll: document.querySelector('.table-scroll'),
  expandBtn: $('expandEarlier'),
  expandLabel: $('expandLabel'),
  shareBtn: $('shareBtn'),
  shareLabel: document.querySelector('#shareBtn .share-label'),
  toast: $('toast'),
};

let countdownTimer = null;   // live 1s tick
let ambientRAF = null;       // decorative pre-calc orbit
let currentAngle = 0;        // earth angle in degrees

/* === Ambient orbit (before a calculation) ================= */
function setEarthAngle(deg) {
  currentAngle = deg;
  els.earthGroup.setAttribute('transform', `rotate(${deg} 230 230)`);
}
function startAmbient() {
  if (reduceMotion) { setEarthAngle(58); return; }
  let last = null;
  const step = (t) => {
    if (last !== null) currentAngle = (currentAngle + (t - last) * 0.012) % 360;
    last = t;
    setEarthAngle(currentAngle);
    ambientRAF = requestAnimationFrame(step);
  };
  ambientRAF = requestAnimationFrame(step);
}

/* Tween earth from its current angle to the true progress angle */
function tweenEarthTo(targetDeg, duration = 1400) {
  if (ambientRAF) { cancelAnimationFrame(ambientRAF); ambientRAF = null; }
  els.earthGroup.classList.add('earth-group-live');

  if (reduceMotion) { setEarthAngle(targetDeg); return; }

  const start = currentAngle % 360;
  let delta = ((targetDeg - start) % 360 + 360) % 360;
  delta += 360; // one extra full lap for a satisfying spin-in
  const t0 = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1);
    setEarthAngle(start + delta * ease(p));
    if (p < 1) requestAnimationFrame(step);
    else setEarthAngle(targetDeg);
  };
  requestAnimationFrame(step);
}

/* === Number helpers ======================================= */
function countUp(el, to, { decimals = 0, suffix = '', duration = 1200 } = {}) {
  if (reduceMotion) { el.textContent = to.toFixed(decimals) + suffix; return; }
  const t0 = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1);
    const v = to * ease(p);
    el.textContent = v.toLocaleString('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const pad = (n) => String(n).padStart(2, '0');
const DATE_OPTS = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
const WEEKDAY = { weekday: 'short' };

/* === Main calculation ===================================== */
function calculate() {
  const dateVal = els.birthday.value;
  const timeVal = els.birthtime.value || '12:00';

  els.error.hidden = true;
  if (!dateVal) {
    showError('Please enter your birth date to chart your orbit.');
    return;
  }

  const birth = new Date(`${dateVal}T${timeVal}:00`);
  if (isNaN(birth.getTime())) {
    showError('That date doesn’t look right — please check and try again.');
    return;
  }

  const now = new Date();
  const elapsed = now.getTime() - birth.getTime();
  if (elapsed < 0) {
    showError('That’s in the future — you haven’t begun your first lap around the Sun yet!');
    return;
  }

  const lapsExact    = elapsed / SIDEREAL_YEAR_MS;
  const lapsDone     = Math.floor(lapsExact);
  const nextLap      = lapsDone + 1;
  const progress     = lapsExact - lapsDone;            // 0..1 through current lap
  const nextBirthday = new Date(birth.getTime() + nextLap * SIDEREAL_YEAR_MS);
  const person       = els.name.value.trim().replace(/\s+/g, ' ').slice(0, 40);

  renderResults({ birth, lapsExact, lapsDone, nextLap, progress, nextBirthday, person });
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function renderResults(data) {
  const { birth, lapsExact, lapsDone, nextLap, progress, nextBirthday, person = '' } = data;

  // Orbit centre readout + arc + earth
  els.roValue.textContent = Math.round(progress * 100) + '%';
  els.roLabel.textContent = `through lap ${nextLap}`;
  els.arc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - progress);
  tweenEarthTo(progress * 360);

  // Countdown headline
  els.cdEyebrow.textContent = person ? `${person}’s next solar birthday` : 'Your next solar birthday';
  const lapWord = nextLap === 1 ? 'lap' : 'laps';
  els.cdLaps.textContent = `${nextLap.toLocaleString()} ${lapWord} around the Sun`;
  els.cdDate.textContent = nextBirthday.toLocaleString('en-US', DATE_OPTS);

  // Stats
  countUp(els.stAge, lapsExact, { decimals: 2 });
  const distKm = lapsExact * ORBIT_PATH_KM;
  const distBillionKm = distKm / 1e9;
  const distBillionMi = distKm / KM_PER_MILE / 1e9;
  countUp(els.stDist, distBillionKm, { decimals: 2, suffix: 'B km' });
  els.stDistSub.textContent = `≈ ${distBillionMi.toFixed(2)} billion miles through space`;

  countUp(els.stProg, progress * 100, { decimals: 0, suffix: '%' });
  els.stProgSub.textContent = `of lap ${nextLap} complete`;

  renderDrift(birth, nextBirthday, nextLap);
  renderTable(birth, nextLap);
  prepareShare({ person, nextLap, nextBirthday, progress });

  // Reveal + live countdown
  els.results.hidden = false;
  startCountdown(nextBirthday);
  els.results.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

/* Drift: how far the solar birthday has slid from the plain
   calendar anniversary of the birth date. */
function renderDrift(birth, nextBirthday, nextLap) {
  const calAnniv = new Date(birth.getTime());
  calAnniv.setFullYear(nextBirthday.getFullYear());
  let driftDays = (nextBirthday.getTime() - calAnniv.getTime()) / 86_400_000;

  const absDays = Math.abs(driftDays);
  const rounded = Math.round(absDays);
  els.stDrift.textContent = (driftDays >= 0 ? '+' : '−') + rounded + (rounded === 1 ? ' day' : ' days');
  els.stDriftSub.textContent = driftDays >= 0
    ? 'later than your calendar birthday by now'
    : 'earlier than your calendar birthday by now';
}

/* Table of solar birthdays — upcoming by default, with the option to
   expand backwards through every lap already completed. */
let tableBirth = null;    // birth Date for the currently rendered table
let tableNextLap = 0;     // the next upcoming lap number
let earlierShown = false; // whether past laps are expanded

function makeRow(birth, lap, { next = false, past = false } = {}) {
  const when = new Date(birth.getTime() + lap * SIDEREAL_YEAR_MS);
  const tr = document.createElement('tr');
  if (next) tr.classList.add('next');
  if (past) tr.classList.add('past');
  if (lap % 10 === 0) tr.classList.add('milestone');

  const c1 = document.createElement('td');
  c1.textContent = lap.toLocaleString();
  const c2 = document.createElement('td');
  c2.textContent = lap === 0 ? when.toLocaleString('en-US', DATE_OPTS) + ' · born'
                             : when.toLocaleString('en-US', DATE_OPTS);
  const c3 = document.createElement('td');
  c3.className = 'col-day';
  c3.textContent = when.toLocaleDateString('en-US', WEEKDAY);

  tr.append(c1, c2, c3);
  return tr;
}

function renderTable(birth, nextLap) {
  tableBirth = birth;
  tableNextLap = nextLap;
  earlierShown = false;
  els.tbody.innerHTML = '';

  const frag = document.createDocumentFragment();
  for (let i = 0; i < 40; i++) {
    frag.appendChild(makeRow(birth, nextLap + i, { next: i === 0 }));
  }
  els.tbody.appendChild(frag);

  // nextLap doubles as the count of laps already completed (laps 0 … nextLap-1)
  els.expandBtn.hidden = nextLap === 0;
  els.expandBtn.classList.remove('open');
  els.expandBtn.setAttribute('aria-expanded', 'false');
  els.expandLabel.textContent =
    `Show ${nextLap.toLocaleString()} earlier ${nextLap === 1 ? 'lap' : 'laps'}`;
}

function toggleEarlier() {
  if (!tableBirth) return;

  if (earlierShown) {
    els.tbody.querySelectorAll('tr.past').forEach((r) => r.remove());
    earlierShown = false;
    els.expandBtn.classList.remove('open');
    els.expandBtn.setAttribute('aria-expanded', 'false');
    els.expandLabel.textContent =
      `Show ${tableNextLap.toLocaleString()} earlier ${tableNextLap === 1 ? 'lap' : 'laps'}`;
    els.tableScroll.scrollTop = 0;
    return;
  }

  const frag = document.createDocumentFragment();
  for (let lap = 0; lap < tableNextLap; lap++) {
    frag.appendChild(makeRow(tableBirth, lap, { past: true }));
  }
  els.tbody.insertBefore(frag, els.tbody.firstChild);
  earlierShown = true;
  els.expandBtn.classList.add('open');
  els.expandBtn.setAttribute('aria-expanded', 'true');
  els.expandLabel.textContent = 'Hide earlier laps';

  // Reveal a few past rows above the highlighted next birthday, scrolling
  // only inside the table (never the page).
  const nextRow = els.tbody.querySelector('tr.next');
  if (nextRow) {
    const delta = nextRow.getBoundingClientRect().top
                - els.tableScroll.getBoundingClientRect().top;
    els.tableScroll.scrollTop += delta - 132;
  }
}

els.expandBtn.addEventListener('click', toggleEarlier);

/* === Live countdown ======================================= */
function startCountdown(target) {
  if (countdownTimer) clearInterval(countdownTimer);
  const tick = () => {
    let diff = target.getTime() - Date.now();
    if (diff <= 0) diff = 0;
    const s = Math.floor(diff / 1000);
    els.cdD.textContent = Math.floor(s / 86400);
    els.cdH.textContent = pad(Math.floor((s % 86400) / 3600));
    els.cdM.textContent = pad(Math.floor((s % 3600) / 60));
    els.cdS.textContent = pad(s % 60);
    if (diff === 0) { clearInterval(countdownTimer); celebrate(); }
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function celebrate() {
  els.cdLaps.textContent = '🌞 Happy Solar Birthday! Another lap complete.';
  // Recompute from the fresh moment on the next interaction.
}

/* ============================================================
   Shareable card — draws a 1200×630 image and hands it to the
   native share sheet (or downloads it + copies a caption).
   ============================================================ */
const SITE_URL = 'https://solarbirthday.jordanbuchanan.dev';
const DATE_DAY_OPTS = { month: 'long', day: 'numeric', year: 'numeric' };
let sharePayload = null;

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function prepareShare({ person, nextLap, nextBirthday, progress }) {
  const dateText = nextBirthday.toLocaleDateString('en-US', DATE_DAY_OPTS);
  const who = person || '';
  sharePayload = {
    cardOpts: { mode: 'personal', name: who, lapText: ordinal(nextLap), dateText, lapCount: nextLap, progress },
    text: who
      ? `${who}’s next solar birthday — their ${ordinal(nextLap)} lap around the Sun — is ${dateText}. 🌞`
      : `My next solar birthday — my ${ordinal(nextLap)} lap around the Sun — is ${dateText}. 🌞`,
  };
  els.shareLabel.textContent = who ? `Share ${who}’s birthday` : 'Share this birthday';
}

async function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load('700 96px "Space Grotesk"'),
      document.fonts.load('500 40px "Space Grotesk"'),
      document.fonts.load('700 28px "Roboto Mono"'),
      document.fonts.load('400 24px "Roboto Mono"'),
    ]);
  } catch (_) { /* use whatever is available */ }
}

/* tiny seeded RNG so the starfield on the card is stable */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function setFont(ctx, weight, size, family) {
  ctx.font = `${weight} ${size}px "${family}", ${family.includes('Mono') ? 'monospace' : 'sans-serif'}`;
}
function fitFont(ctx, text, maxWidth, weight, size, family, min) {
  let s = size;
  setFont(ctx, weight, s, family);
  while (ctx.measureText(text).width > maxWidth && s > min) { s -= 2; setFont(ctx, weight, s, family); }
  return s;
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, y); line = w; y += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, x, y);
}

function drawShareCard(canvas, opts) {
  const { mode = 'personal', name = '', lapText = '', dateText = '', lapCount = 0, progress = 0.66 } = opts;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // background + halo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b1226'); bg.addColorStop(1, '#05060d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W * 0.28, H * 0.5, 0, W * 0.28, H * 0.5, H * 0.8);
  halo.addColorStop(0, 'rgba(32,48,96,0.55)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  // starfield
  const rnd = mulberry(20260719);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 130; i++) {
    ctx.globalAlpha = 0.12 + rnd() * 0.6;
    ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 1.6 + 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // orbit motif (left half)
  const cx = H * 0.5, cy = H * 0.5, R = H * 0.30;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

  const p = Math.max(0.02, Math.min(progress || 0.66, 0.999));
  const ag = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  ag.addColorStop(0, '#ffcf5c'); ag.addColorStop(0.6, '#ff9a3c'); ag.addColorStop(1, '#5de4ff');
  ctx.strokeStyle = ag; ctx.lineWidth = 7; ctx.lineCap = 'round';
  const a0 = -Math.PI / 2, a1 = a0 + p * Math.PI * 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
  ctx.lineCap = 'butt';

  const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.95);
  sg.addColorStop(0, 'rgba(255,170,60,0.5)'); sg.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, Math.PI * 2); ctx.fill();

  const sun = ctx.createRadialGradient(cx - R * 0.12, cy - R * 0.12, R * 0.05, cx, cy, R * 0.36);
  sun.addColorStop(0, '#fff6d5'); sun.addColorStop(0.5, '#ffc24a'); sun.addColorStop(1, '#ff7a18');
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, cy, R * 0.36, 0, Math.PI * 2); ctx.fill();

  const ex = cx + Math.cos(a1) * R, ey = cy + Math.sin(a1) * R;
  ctx.fillStyle = 'rgba(93,228,255,0.22)';
  ctx.beginPath(); ctx.arc(ex, ey, 26, 0, Math.PI * 2); ctx.fill();
  const eg = ctx.createRadialGradient(ex - 5, ey - 5, 2, ex, ey, 15);
  eg.addColorStop(0, '#cdf3ff'); eg.addColorStop(0.55, '#4fc8ff'); eg.addColorStop(1, '#1566c8');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.fill();

  // text block (right half)
  const tx = mode === 'brand' ? 540 : H + 24;
  const tw = W - tx - 70;

  ctx.fillStyle = '#ffca62';
  setFont(ctx, 700, 26, 'Roboto Mono');
  ctx.letterSpacing = '6px';
  ctx.fillText(mode === 'brand' ? 'MEASURED BY THE STARS' : 'SOLAR BIRTHDAY', tx, 148);
  ctx.letterSpacing = '0px';

  if (mode === 'brand') {
    ctx.fillStyle = '#ffffff';
    setFont(ctx, 700, fitFont(ctx, 'Solar Birthday', tw, 700, 100, 'Space Grotesk', 60), 'Space Grotesk');
    ctx.fillText('Solar Birthday', tx, 268);
    ctx.fillStyle = '#aeb6cc';
    setFont(ctx, 500, 40, 'Space Grotesk');
    wrapText(ctx, 'Your birthday is one true lap around the Sun.', tx, 345, tw, 52);
  } else {
    ctx.fillStyle = '#e9edf7';
    const l2 = `${name ? name + '’s' : 'Your'} ${lapText} lap`;
    setFont(ctx, 700, fitFont(ctx, l2, tw, 700, 62, 'Space Grotesk', 32), 'Space Grotesk');
    ctx.fillText(l2, tx, 238);

    const dg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    dg.addColorStop(0, '#ffe9b0'); dg.addColorStop(1, '#ffb347');
    ctx.fillStyle = dg;
    setFont(ctx, 700, fitFont(ctx, dateText, tw, 700, 94, 'Space Grotesk', 46), 'Space Grotesk');
    ctx.fillText(dateText, tx, 340);

    ctx.fillStyle = '#8f98b3';
    setFont(ctx, 500, 28, 'Roboto Mono');
    ctx.fillText(`${lapCount.toLocaleString()} ${lapCount === 1 ? 'lap' : 'laps'} around the Sun`, tx, 398);
  }

  ctx.fillStyle = '#5c6580';
  setFont(ctx, 400, 24, 'Roboto Mono');
  ctx.fillText('solarbirthday.jordanbuchanan.dev', tx, H - 48);
}
window.__drawShareCard = drawShareCard; // exposed for one-off OG-image generation

let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 300);
  }, 3800);
}

async function shareCard() {
  if (!sharePayload) return;
  const original = els.shareLabel.textContent;
  els.shareBtn.disabled = true;
  els.shareLabel.textContent = 'Preparing card…';
  try {
    await ensureFonts();
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    drawShareCard(canvas, sharePayload.cardOpts);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('render failed');

    const file = new File([blob], 'solar-birthday.png', { type: 'image/png' });
    const caption = `${sharePayload.text} ${SITE_URL}`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: caption });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'solar-birthday.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      let copied = false;
      try { await navigator.clipboard.writeText(caption); copied = true; } catch (_) {}
      showToast(copied ? 'Card saved to your device · caption copied to clipboard'
                       : 'Card saved to your device.');
    }
  } catch (err) {
    if (!err || err.name !== 'AbortError') showToast('Couldn’t create the share card — please try again.');
  } finally {
    els.shareBtn.disabled = false;
    els.shareLabel.textContent = original;
  }
}

/* === Wire up ============================================== */
els.form.addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
els.shareBtn.addEventListener('click', shareCard);

// Ambient orbit until the first calculation.
startAmbient();

/* ============================================================
   Starfield canvas — twinkling stars + gentle parallax
   ============================================================ */
(function starfield() {
  const canvas = $('stars');
  const ctx = canvas.getContext('2d');
  let w, h, stars = [], px = 0, py = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.width = Math.floor(innerWidth * DPR);
    h = canvas.height = Math.floor(innerHeight * DPR);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.min(260, Math.floor((innerWidth * innerHeight) / 6500));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.3 + 0.3) * DPR,
      base: Math.random() * 0.5 + 0.3,
      tw: Math.random() * Math.PI * 2,
      sp: Math.random() * 0.02 + 0.006,
      depth: Math.random() * 0.6 + 0.2,
      hue: Math.random() < 0.15 ? 'sun' : (Math.random() < 0.2 ? 'earth' : 'white'),
    }));
  }

  const colorFor = (hue, a) =>
    hue === 'sun'   ? `rgba(255, 214, 140, ${a})` :
    hue === 'earth' ? `rgba(150, 224, 255, ${a})` :
                      `rgba(255, 255, 255, ${a})`;

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.tw += s.sp;
      const a = reduceMotion ? s.base : s.base + Math.sin(s.tw) * 0.35;
      const ox = px * s.depth * 26 * DPR;
      const oy = py * s.depth * 26 * DPR;
      ctx.beginPath();
      ctx.arc(s.x + ox, s.y + oy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(s.hue, Math.max(0, Math.min(1, a)));
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  resize();
  draw();
  if (reduceMotion) { // draw one static frame
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(s.hue, s.base); ctx.fill();
    }
  }
})();
