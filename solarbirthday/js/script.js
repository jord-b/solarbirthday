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
  birthday: $('birthday'),
  birthtime: $('birthtime'),
  error: $('error'),
  results: $('results'),
  roValue: $('roValue'),
  roLabel: $('roLabel'),
  earthGroup: $('earthGroup'),
  arc: $('progressArc'),
  cdLaps: $('cdLaps'),
  cdD: $('cdD'), cdH: $('cdH'), cdM: $('cdM'), cdS: $('cdS'),
  cdDate: $('cdDate'),
  stAge: $('stAge'),
  stDist: $('stDist'), stDistSub: $('stDistSub'),
  stProg: $('stProg'), stProgSub: $('stProgSub'),
  stDrift: $('stDrift'), stDriftSub: $('stDriftSub'),
  tbody: document.querySelector('#results-table tbody'),
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

  renderResults({ birth, lapsExact, lapsDone, nextLap, progress, nextBirthday });
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function renderResults(data) {
  const { birth, lapsExact, lapsDone, nextLap, progress, nextBirthday } = data;

  // Orbit centre readout + arc + earth
  els.roValue.textContent = Math.round(progress * 100) + '%';
  els.roLabel.textContent = `through lap ${nextLap}`;
  els.arc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - progress);
  tweenEarthTo(progress * 360);

  // Countdown headline
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

/* Table of upcoming solar birthdays */
function renderTable(birth, nextLap) {
  els.tbody.innerHTML = '';
  const COUNT = 40;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < COUNT; i++) {
    const lap = nextLap + i;
    const when = new Date(birth.getTime() + lap * SIDEREAL_YEAR_MS);
    const tr = document.createElement('tr');
    if (i === 0) tr.classList.add('next');
    if (lap % 10 === 0) tr.classList.add('milestone');

    const c1 = document.createElement('td');
    c1.textContent = lap.toLocaleString();
    const c2 = document.createElement('td');
    c2.textContent = when.toLocaleString('en-US', DATE_OPTS);
    const c3 = document.createElement('td');
    c3.className = 'col-day';
    c3.textContent = when.toLocaleDateString('en-US', WEEKDAY);

    tr.append(c1, c2, c3);
    frag.appendChild(tr);
  }
  els.tbody.appendChild(frag);
}

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

/* === Wire up ============================================== */
els.form.addEventListener('submit', (e) => { e.preventDefault(); calculate(); });

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
