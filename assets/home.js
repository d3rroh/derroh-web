/**
 * DERRICK-OPS  |  script.js
 * Command Center Engine
 * ─ Boot sequence animation
 * ─ Live clock + uptime counter
 * ─ Animated resource bar metrics (live-updating)
 * ─ Radial SVG gauge animations + sparklines
 * ─ Canvas EKG heartbeat monitor
 * ─ GitHub-style contribution heatmap
 * ─ Scroll reveal + active nav
 * ─ Contact form validation
 * ─ Skill category filter
 * ─ Background particle grid
 */

'use strict';

/* ── HELPERS ──────────────────────────────────────────────────── */
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp  = (a, b, t)   => a + (b - a) * t;

/* ── BOOT SEQUENCE ────────────────────────────────────────────── */
const BOOT_LINES = [
  { t: 'DERRICK-OPS BIOS v2.4.1  (C) 2024 DevOps Systems', cls: '' },
  { t: '─────────────────────────────────────────────────', cls: 'bl-dim' },
  { t: 'CPU: Intel Xeon E5-2690 v4 @ 2.60GHz', ok: true },
  { t: 'RAM: 64 GB DDR4-2400 ECC',              ok: true },
  { t: 'DISK: 2TB NVMe SSD RAID-1',             ok: true },
  { t: 'NIC: Dual 10GbE (bonded)',              ok: true },
  { t: 'FIREWALL: UFW / iptables loaded',        ok: true },
  { t: 'SSL: Certificates valid',               ok: true },
  { t: 'DNS: Nameservers responding',           ok: true },
  { t: 'SMTP: Mail relay operational',          ok: true },
  { t: '─────────────────────────────────────────────────', cls: 'bl-dim' },
  { t: 'Mounting filesystems …',    ok: true },
  { t: 'Loading kernel modules …',  ok: true },
  { t: 'Starting system services …',ok: true },
  { t: 'Initializing network …',    ok: true },
  { t: '─────────────────────────────────────────────────', cls: 'bl-dim' },
  { t: '[ ALL SYSTEMS OPERATIONAL ]', cls: 'bl-ok' },
];

function renderBootLine(line, container) {
  const el = document.createElement('div');
  if (line.ok) {
    el.className = 'bl-line';
    el.innerHTML = `<span>${line.t}</span><span class="bl-dots"></span><span class="bl-ok">[ OK ]</span>`;
  } else {
    el.className = line.cls || '';
    el.textContent = line.t;
  }
  container.appendChild(el);
}

async function runBoot() {
  const overlay  = $('#boot-overlay');
  const log      = $('#boot-log');
  const bar      = $('#boot-bar');
  const pct      = $('#boot-pct');
  const heroOut  = $('#terminal-output');
  const heroId   = $('#hero-identity');

  if (!overlay) return;

  // Check reduced motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    overlay.classList.add('done');
    if (heroOut) heroOut.style.display = 'none';
    if (heroId)  heroId.style.display  = 'block';
    initHeroAnimations();
    initAll();
    return;
  }

  const total = BOOT_LINES.length;
  for (let i = 0; i < total; i++) {
    await delay(reduced ? 0 : rand(40, 95));
    renderBootLine(BOOT_LINES[i], log);
    const progress = Math.round(((i + 1) / total) * 100);
    bar.style.width = progress + '%';
    pct.textContent = progress + '%';
    log.scrollTop = log.scrollHeight;
  }

  await delay(420);

  // Fade out overlay
  overlay.classList.add('done');
  document.body.style.overflow = '';

  // Run terminal typewriter in hero
  await delay(350);
  runHeroTerminal(heroOut, heroId);

  initAll();
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── HERO TERMINAL TYPEWRITER ─────────────────────────────────── */
const HERO_SEQUENCE = [
  { type: 'cmd',  text: 'whoami',     delay: 300  },
  { type: 'out',  text: 'derrick — devops engineer · linux systems administrator', delay: 100 },
  { type: 'cmd',  text: 'uname -a',   delay: 400  },
  { type: 'out',  text: 'Linux devops-server 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux', delay: 80 },
  { type: 'cmd',  text: 'systemctl is-active infrastructure', delay: 500 },
  { type: 'out',  text: '<span class="tbo-ok">active</span>', delay: 80 },
  { type: 'cmd',  text: 'cat ~/.profile_summary', delay: 400 },
  { type: 'out',  text: '5+ yrs experience · 50+ servers managed · 99.9% uptime goal', delay: 80 },
  { type: 'ready' },
];

/* ── HERO ANIMATIONS (rotating role + activity ticker) ───────────
   Kicks off once the identity panel is revealed (after the boot
   typewriter finishes). Respects prefers-reduced-motion by just
   showing the first/static values with no cycling.
──────────────────────────────────────────────────────────────── */
function initHeroAnimations() {
  const roleEl = document.getElementById('hi-role-cycle');
  const actEl  = document.getElementById('hi-activity-text');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ROLES = ['DevOps Engineer', 'Linux Systems Administrator', 'Kubernetes Operator', 'Incident Responder'];
  const ACTIVITY = [
    'Deployed milestone-app · 2m ago',
    'SSL certificate renewed · 14m ago',
    'Kubernetes rollout completed · 26m ago',
    'Backup snapshot verified · 41m ago',
    'Firewall rules synced · 1h ago',
  ];

  if (roleEl && !reduced) {
    let idx = 0;
    const TYPE_MS = 55, DELETE_MS = 32, HOLD_MS = 2200, GAP_MS = 400;

    async function cycle() {
      const word = ROLES[idx];
      for (let i = 1; i <= word.length; i++) {
        roleEl.textContent = word.slice(0, i);
        await delay(TYPE_MS);
      }
      await delay(HOLD_MS);
      for (let i = word.length; i >= 0; i--) {
        roleEl.textContent = word.slice(0, i);
        await delay(DELETE_MS);
      }
      await delay(GAP_MS);
      idx = (idx + 1) % ROLES.length;
      cycle();
    }
    roleEl.textContent = '';
    cycle();
  } else if (roleEl) {
    roleEl.textContent = ROLES[0];
  }

  if (actEl) {
    if (reduced) {
      actEl.textContent = ACTIVITY[0];
    } else {
      let idx = 0;
      setInterval(() => {
        actEl.classList.add('is-fading');
        setTimeout(() => {
          idx = (idx + 1) % ACTIVITY.length;
          actEl.textContent = ACTIVITY[idx];
          actEl.classList.remove('is-fading');
        }, 350);
      }, 4200);
    }
  }
}

async function runHeroTerminal(container, identityEl) {
  if (!container) return;
  container.innerHTML = '';
  document.body.classList.add('js-booting'); // show typewriter, hide identity
  const PROMPT = 'derrick@server:~$';

  for (const step of HERO_SEQUENCE) {
    if (step.type === 'ready') {
      await delay(300);
      document.body.classList.remove('js-booting'); // swap back to identity
      container.style.display = 'none';
      if (identityEl) identityEl.style.display = 'block';
      initHeroAnimations();
      return;
    }

    if (step.type === 'cmd') {
      await delay(step.delay || 200);
      const line = document.createElement('div');
      line.className = 'tbo-line';
      const promptSpan = document.createElement('span');
      promptSpan.className = 'tbo-prompt';
      promptSpan.textContent = PROMPT;
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'tbo-cmd';
      line.appendChild(promptSpan);
      line.appendChild(cmdSpan);
      container.appendChild(line);
      await typeText(cmdSpan, step.text, 38);
    }

    if (step.type === 'out') {
      await delay(step.delay || 80);
      const out = document.createElement('div');
      out.className = 'tbo-out';
      out.innerHTML = step.text;
      container.appendChild(out);
    }
  }
}

async function typeText(el, text, speed = 40) {
  for (const char of text) {
    el.textContent += char;
    await delay(speed + rand(-10, 10));
  }
}

/* ── LIVE CLOCK ───────────────────────────────────────────────── */
function initClock() {
  const clockEl = $('#live-clock');
  const logTs   = $('#log-ts-live');
  if (!clockEl) return;

  function tick() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2,'0');
    const mm  = String(now.getMinutes()).padStart(2,'0');
    const ss  = String(now.getSeconds()).padStart(2,'0');
    clockEl.textContent = `${hh}:${mm}:${ss}`;
    if (logTs) {
      const mon = now.toLocaleString('en', { month: 'short' });
      const d   = String(now.getDate()).padStart(2,'0');
      logTs.textContent = `${mon} ${d} ${hh}:${mm}:${ss}`;
    }
  }

  tick();
  setInterval(tick, 1000);
}

/* ── UPTIME COUNTER ───────────────────────────────────────────── */
function initUptime() {
  const el = $('#uptime-counter');
  if (!el) return;
  const start = Date.now();

  setInterval(() => {
    const s = Math.floor((Date.now() - start) / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2,'0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2,'0');
    const sec = String(s % 60).padStart(2,'0');
    el.textContent = `${h}:${m}:${sec}`;
  }, 1000);
}

/* ── FOOTER YEAR ──────────────────────────────────────────────── */
function initFooterYear() {
  const el = $('#footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ── LIVE RESOURCE METRICS (hero) ─────────────────────────────── */
const metricTargets = {
  cpu:  { el: $('#cpu-bar'),  val: $('#cpu-val'),  wrap: $('#cpu-bar')?.closest('.metric-bar-wrap'),  base: 34, range: 18, suffix: '%' },
  ram:  { el: $('#ram-bar'),  val: $('#ram-val'),  wrap: $('#ram-bar')?.closest('.metric-bar-wrap'),  base: 62, range: 12, suffix: '%' },
  disk: { el: $('#disk-bar'), val: $('#disk-val'), wrap: $('#disk-bar')?.closest('.metric-bar-wrap'), base: 58, range:  5, suffix: '%' },
  net:  { el: $('#net-bar'),  val: $('#net-val'),  wrap: $('#net-bar')?.closest('.metric-bar-wrap'),  base: 22, range: 30, suffix: 'Mb/s' },
};

let metricCurrent = { cpu: 0, ram: 0, disk: 0, net: 0 };

function updateMetrics() {
  for (const [key, cfg] of Object.entries(metricTargets)) {
    if (!cfg.el) continue;
    const target = cfg.base + rand(-cfg.range, cfg.range);
    metricCurrent[key] = lerp(metricCurrent[key], target, 0.25);
    const v = clamp(metricCurrent[key], 0, 100);
    cfg.el.style.setProperty('--w', `${v.toFixed(1)}%`);
    const display = key === 'net'
      ? (metricCurrent[key] * 0.8).toFixed(1) + ' Mb/s'
      : Math.round(v) + '%';
    cfg.val.textContent = display;
    if (cfg.wrap) cfg.wrap.setAttribute('aria-valuenow', Math.round(v));
  }
}

function initMetrics() {
  // Warm-up values
  metricCurrent = { cpu: 34, ram: 62, disk: 58, net: 22 };
  updateMetrics();
  setInterval(updateMetrics, 2200);
}

/* ── STAT COUNTERS (hero) ─────────────────────────────────────── */
function initStatCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const dur    = 1600;
      const steps  = 50;
      const stepMs = dur / steps;
      let i = 0;
      const timer = setInterval(() => {
        i++;
        el.textContent = Math.round(target * (i / steps));
        if (i >= steps) { el.textContent = target; clearInterval(timer); }
      }, stepMs);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });

  $$('.stat-val').forEach(el => obs.observe(el));
}

/* ── RADIAL GAUGE ANIMATIONS ──────────────────────────────────── */
function initGauges() {
  const circumference = 2 * Math.PI * 50; // r=50

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const panel = entry.target;

      // Circular gauge (standard + featured cards)
      const circle = $('.gauge-fill', panel);
      const pctEl  = $('.gp-pct', panel);
      if (circle && pctEl) {
        const pct  = parseInt(circle.dataset.pct, 10) || 80;
        const dash = circumference - (pct / 100) * circumference;

        requestAnimationFrame(() => {
          circle.style.strokeDashoffset = dash;
          circle.classList.add('animated');
        });

        let current = 0;
        const steps = 60;
        const step  = pct / steps;
        const timer = setInterval(() => {
          current = Math.min(current + step, pct);
          pctEl.innerHTML = Math.round(current) + '<span class="gp-unit">%</span>';
          if (current >= pct) clearInterval(timer);
        }, 1400 / steps);
      }

      // Wide-card headline stat count-up
      const wideNum = $('.gp-wide-num', panel);
      if (wideNum) {
        const target = parseInt(wideNum.dataset.count, 10) || 0;
        let current = 0;
        const steps = 50;
        const step  = target / steps;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          wideNum.textContent = Math.round(current).toLocaleString();
          if (current >= target) clearInterval(timer);
        }, 1200 / steps);
      }

      // Sparkline — draws for any card that has one, gauge or not
      const canvas = $('.spark-canvas', panel);
      if (canvas) {
        const basePct = parseInt((circle && circle.dataset.pct) || canvas.dataset.pct, 10) || 70;
        drawSparkline(canvas, basePct);
      }

      obs.unobserve(panel);
    });
  }, { threshold: 0.2 });

  $$('.gauge-panel').forEach(p => obs.observe(p));
}

function drawSparkline(canvas, basePct) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 140;
  const H = canvas.offsetHeight || 28;
  canvas.width  = W;
  canvas.height = H;

  const points = 24;
  const data   = Array.from({ length: points }, (_, i) =>
    clamp(basePct + rand(-12, 12) + Math.sin(i * 0.4) * 5, 10, 100)
  );

  ctx.clearRect(0, 0, W, H);

  // Fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,212,200,0.3)');
  grad.addColorStop(1, 'rgba(0,212,200,0)');

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (points - 1)) * W;
    const y = H - (v / 100) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (points - 1)) * W;
    const y = H - (v / 100) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = 'rgba(0,212,200,0.75)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
}

/* ── HEARTBEAT / EKG CANVAS ───────────────────────────────────── */
function initHeartbeat() {
  const canvas = $('#heartbeat-canvas');
  if (!canvas) return;

  const wrap = canvas.parentElement;

  function resize() {
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const ctx = canvas.getContext('2d');

  // Generate waveform data: base noise + QRS spikes
  function generateWave(length) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // Base noise
      data[i] = Math.sin(i * 0.08) * 0.04 + (Math.random() - 0.5) * 0.06;
    }

    // Add commit-spike QRS complexes at random positions
    const spikeInterval = Math.floor(length / 18);
    for (let s = spikeInterval; s < length - 20; s += spikeInterval + Math.floor(rand(-8, 8))) {
      const intensity = rand(0.45, 1.0);
      data[s - 2] -= 0.10 * intensity;
      data[s - 1] -= 0.18 * intensity;
      data[s]      = intensity;          // peak
      data[s + 1] -= 0.30 * intensity;
      data[s + 2] -= 0.08 * intensity;
      data[s + 3] += 0.14 * intensity;
      data[s + 4] += 0.06 * intensity;
    }
    return data;
  }

  const WAVE_LEN = 1200;
  const wave = generateWave(WAVE_LEN);
  let offset = 0;
  let animId;

  function drawEKG() {
    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) { animId = requestAnimationFrame(drawEKG); return; }

    // Fade tail
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);

    const midY = H * 0.5;
    const amp  = H * 0.36;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += W / 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Draw waveform
    ctx.beginPath();
    const visiblePts = W;
    for (let px = 0; px < visiblePts; px++) {
      const idx = (offset + px) % WAVE_LEN;
      const v   = wave[idx];
      const y   = midY - v * amp;
      // Color based on amplitude: spikes = red, normal = green
      const intensity = Math.abs(v);
      if (intensity > 0.3) {
        if (px > 0) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0,212,200,${clamp(intensity * 1.5, 0.5, 1)})`;
        ctx.lineWidth = 2;
        ctx.moveTo(px - 1, midY - (wave[(offset + px - 1) % WAVE_LEN]) * amp);
      } else if (px === 0 || Math.abs(wave[(offset + px - 1) % WAVE_LEN]) > 0.3) {
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,230,118,0.7)';
        ctx.lineWidth = 1.5;
      }
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Moving bright tip
    const tipIdx = (offset + W - 1) % WAVE_LEN;
    const tipY   = midY - wave[tipIdx] * amp;
    ctx.beginPath();
    ctx.arc(W - 1, tipY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00e676';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00e676';
    ctx.fill();
    ctx.shadowBlur = 0;

    offset = (offset + 2) % WAVE_LEN;
    animId = requestAnimationFrame(drawEKG);
  }

  // Only run when visible
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) drawEKG();
      else cancelAnimationFrame(animId);
    });
  }, { threshold: 0.1 });
  obs.observe(canvas);

  // Month labels
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(months[d.getMonth()]);
  }
  const mEl = $('#hb-months');
  if (mEl) mEl.innerHTML = labels.map(m => `<span>${m}</span>`).join('');
}

/* ── CONTRIBUTION HEATMAP ─────────────────────────────────────── */
function initHeatmap() {
  const grid = $('#cs-grid');
  if (!grid) return;

  const weeks = 52;
  const days  = 7;

  // Generate semi-realistic activity pattern
  function genLevel() {
    const r = Math.random();
    if (r < 0.28) return 0;
    if (r < 0.50) return 1;
    if (r < 0.70) return 2;
    if (r < 0.85) return 3;
    return 4;
  }

  // Busier periods simulation
  const cells = [];
  for (let w = 0; w < weeks; w++) {
    const weekBias = Math.sin(w * 0.3) * 0.3 + 0.3; // wave pattern
    for (let d = 0; d < days; d++) {
      const r = Math.random() + weekBias * 0.4;
      let level;
      if (r < 0.30) level = 0;
      else if (r < 0.55) level = 1;
      else if (r < 0.75) level = 2;
      else if (r < 0.88) level = 3;
      else level = 4;
      cells.push(level);
    }
  }

  const frag = document.createDocumentFragment();
  cells.forEach(level => {
    const cell = document.createElement('div');
    cell.className = `cs-cell l${level}`;
    cell.setAttribute('role', 'img');
    cell.setAttribute('aria-label', `Activity level ${level}`);
    frag.appendChild(cell);
  });
  grid.appendChild(frag);
}

/* ── 3D TECH BACKGROUND (Three.js) ───────────────────────────────
   Rotating wireframe "core" node + a drifting 3D graph of server
   nodes with connective edges + traveling "data packet" pulses.
   Falls back to the 2D particle grid if WebGL/Three.js is
   unavailable, and respects prefers-reduced-motion.
──────────────────────────────────────────────────────────────── */
function init3DBgCanvas() {
  const canvas = $('#bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return false;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return false;
  }
  if (!renderer) return false;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CYAN   = 0x00d4c8;
  const CYAN_B = 0x00ffd4;
  const BLUE   = 0x40c4ff;
  const AMBER  = 0xffab00;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  const CAM_Z = 62;
  camera.position.set(0, 0, CAM_Z);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Frustum half-extents at z=0, so the node field always fills the
  // visible viewport instead of clumping in the middle on wide screens.
  let VOLX = 46, VOLY = 46, VOLZ = 27;
  function computeVolume() {
    const vFov = (camera.fov * Math.PI) / 180;
    const halfH = Math.tan(vFov / 2) * CAM_Z;
    const halfW = halfH * camera.aspect;
    VOLY = halfH * 0.98;
    VOLX = halfW * 0.98;
    VOLZ = Math.min(halfH, halfW) * 0.6;
  }
  computeVolume();

  // ── Rotating wireframe "core" (icosahedron) ──────────────────
  const coreGeo = new THREE.IcosahedronGeometry(11, 1);
  const coreEdges = new THREE.EdgesGeometry(coreGeo);
  const coreMat = new THREE.LineBasicMaterial({ color: CYAN_B, transparent: true, opacity: 0.35 });
  const core = new THREE.LineSegments(coreEdges, coreMat);
  scene.add(core);

  const coreInnerGeo = new THREE.IcosahedronGeometry(6.4, 0);
  const coreInner = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreInnerGeo),
    new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.22 })
  );
  scene.add(coreInner);

  // ── Node graph (server/service nodes drifting in a volume) ───
  const screenArea = window.innerWidth * window.innerHeight;
  const NODE_COUNT = Math.round(Math.max(40, Math.min(220, screenArea / 24000)));
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    let x, y, z, d;
    do {
      x = rand(-VOLX, VOLX); y = rand(-VOLY, VOLY); z = rand(-VOLZ, VOLZ);
      d = Math.sqrt(x * x + y * y + z * z);
    } while (d < 15);
    nodes.push({
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(rand(-0.012, 0.012), rand(-0.012, 0.012), rand(-0.008, 0.008)),
    });
  }

  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes.map(n => n.pos));
  const nodeSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(0,255,212,1)');
    grd.addColorStop(0.4, 'rgba(0,212,200,0.7)');
    grd.addColorStop(1, 'rgba(0,212,200,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const nodeMat = new THREE.PointsMaterial({
    size: 3.1, map: nodeSprite, transparent: true, depthWrite: false,
    color: CYAN_B, blending: THREE.AdditiveBlending,
  });
  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodePoints);

  // ── Edges between nearby nodes (rebuilt periodically) ─────────
  const edgeMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.22 });
  let edgeLines = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMat);
  scene.add(edgeLines);
  let edgePairs = []; // index pairs currently connected, used for packet travel

  let EDGE_DIST = Math.max(18, VOLX / 2.3);
  function rebuildEdges() {
    const positions = [];
    edgePairs = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d < EDGE_DIST) {
          positions.push(nodes[i].pos.x, nodes[i].pos.y, nodes[i].pos.z);
          positions.push(nodes[j].pos.x, nodes[j].pos.y, nodes[j].pos.z);
          edgePairs.push([i, j]);
        }
      }
    }
    edgeLines.geometry.dispose();
    edgeLines.geometry = new THREE.BufferGeometry();
    edgeLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  }
  rebuildEdges();

  // ── Traveling "data packet" pulses along edges ────────────────
  const PACKET_COUNT = reduced ? 0 : Math.round(Math.max(6, Math.min(26, NODE_COUNT / 6)));
  const packetGeo = new THREE.SphereGeometry(0.55, 6, 6);
  const packets = [];
  for (let i = 0; i < PACKET_COUNT; i++) {
    const mesh = new THREE.Mesh(
      packetGeo,
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? AMBER : CYAN_B, transparent: true, opacity: 0.9 })
    );
    scene.add(mesh);
    packets.push({ mesh, pair: null, t: 0, speed: rand(0.006, 0.014) });
  }
  function respawnPacket(p) {
    if (!edgePairs.length) return;
    p.pair = edgePairs[Math.floor(Math.random() * edgePairs.length)];
    p.t = 0;
  }
  packets.forEach(respawnPacket);

  // ── Mouse parallax ─────────────────────────────────────────────
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeVolume();
    EDGE_DIST = Math.max(18, VOLX / 2.3);
  }
  window.addEventListener('resize', onResize, { passive: true });

  let frame = 0;
  let animId;
  function animate() {
    frame++;

    if (!reduced) {
      core.rotation.y += 0.0016;
      core.rotation.x += 0.0007;
      coreInner.rotation.y -= 0.0021;
      coreInner.rotation.x += 0.0011;

      // drift nodes
      nodes.forEach(n => {
        n.pos.add(n.vel);
        if (Math.abs(n.pos.x) > VOLX) n.vel.x *= -1;
        if (Math.abs(n.pos.y) > VOLY) n.vel.y *= -1;
        if (Math.abs(n.pos.z) > VOLZ) n.vel.z *= -1;
        if (n.pos.length() < 14) n.pos.setLength(14);
      });
      nodeGeo.setFromPoints(nodes.map(n => n.pos));
      nodeGeo.attributes.position.needsUpdate = true;

      if (frame % 90 === 0) rebuildEdges();

      // animate packets along their edge
      packets.forEach(p => {
        if (!p.pair) { respawnPacket(p); return; }
        const a = nodes[p.pair[0]].pos, b = nodes[p.pair[1]].pos;
        p.t += p.speed;
        if (p.t >= 1) { respawnPacket(p); return; }
        p.mesh.position.lerpVectors(a, b, p.t);
      });

      // slow auto-rotation of whole scene + subtle mouse parallax
      tx += (my * 0.25 - tx) * 0.03;
      ty += (mx * 0.35 - ty) * 0.03;
      scene.rotation.x = tx;
      scene.rotation.y += 0.0009;
      scene.rotation.y = scene.rotation.y % (Math.PI * 2);
      camera.position.x += (ty * 6 - camera.position.x) * 0.02;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }
  animate();

  // Pause when tab hidden to save resources
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animId); }
    else { animate(); }
  });

  return true;
}

/* ── BACKGROUND PARTICLE GRID (2D fallback) ──────────────────── */
function initBgCanvas2D() {
  const canvas = $('#bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], edges = [];
  let animId;

  function setup() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;

    const count = Math.floor((W * H) / 22000);
    nodes = Array.from({ length: count }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.18, 0.18),
      r: rand(1, 2.5),
    }));
  }

  setup();
  window.addEventListener('resize', () => { setup(); }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Move
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
      if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
    });

    // Edges
    const DIST = 130;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < DIST) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,212,200,${(1 - d / DIST) * 0.1})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,200,0.22)';
      ctx.fill();
    });

    animId = requestAnimationFrame(draw);
  }

  draw();
}

/* ── INTERACTIVE INFRA TOPOLOGY MAP ──────────────────────────────
   Builds a layered SVG graph (Edge → Ingress → Services → Pods →
   Longhorn/DB) and lets visitors click a node to trace the full
   request path, dimming everything not on that path.
──────────────────────────────────────────────────────────────── */
function initTopologyMap() {
  const svgEl = document.getElementById('topo-svg');
  if (!svgEl) return;

  const NS = 'http://www.w3.org/2000/svg';
  const TYPE_META = {
    edge:    { label: 'EDGE',    color: 'var(--blue)' },
    ingress: { label: 'INGRESS', color: 'var(--red-bright)' },
    svc:     { label: 'SERVICE', color: 'var(--amber)' },
    pod:     { label: 'POD',     color: 'var(--green)' },
    storage: { label: 'STORAGE', color: '#b388ff' },
    db:      { label: 'DATABASE', color: 'var(--red)' },
  };

  const nodes = [
    { id: 'edge',       layer: 0, type: 'edge',    label: 'Cloudflare Edge', sub: 'DNS · TLS · CDN Proxy',
      desc: "All public traffic hits Cloudflare's edge first — DNS resolution, TLS termination, and DDoS mitigation happen before any packet reaches the cluster." },

    { id: 'ingress',    layer: 1, type: 'ingress', label: 'nginx-ingress', sub: 'class: nginx',
      desc: 'Routes incoming HTTPS requests to the correct Kubernetes Service by matching the Host header against the ingress routing table.' },

    { id: 'svc-milestone', layer: 2, type: 'svc', label: 'svc/milestone-app', sub: 'ClusterIP · :80',
      desc: 'Stable virtual IP that load-balances traffic across the milestone-app pod(s). Backs milestone.derroh.co.ke.' },
    { id: 'svc-derroh',    layer: 2, type: 'svc', label: 'svc/derroh-web', sub: 'ClusterIP · :80',
      desc: 'Routes traffic for derroh.co.ke to the static-site pod.' },
    { id: 'svc-kimberley', layer: 2, type: 'svc', label: 'svc/kimberley-web', sub: 'ClusterIP · :80',
      desc: 'Routes traffic for kimberley.name.ng to its static-site pod.' },
    { id: 'svc-mail',      layer: 2, type: 'svc', label: 'svc/mail', sub: 'ClusterIP · :80/25/993',
      desc: 'Fronts the mail stack — SMTP/IMAP for docker-mailserver and HTTP for the Roundcube webmail UI.' },

    { id: 'pod-milestone-app',   layer: 3, type: 'pod', label: 'pod/milestone-app', sub: 'd3rroh/milestone:latest',
      desc: 'Laravel app pod running php-fpm behind Apache. Handles HTTP requests and dispatches background jobs to the queue.' },
    { id: 'pod-milestone-queue', layer: 3, type: 'pod', label: 'pod/milestone-queue', sub: 'Laravel Queue Worker',
      desc: 'Background worker processing queued jobs (emails, exports, notifications) dispatched by milestone-app.' },
    { id: 'pod-milestone-db',    layer: 3, type: 'pod', label: 'pod/milestone-db', sub: 'mysql:8.0',
      desc: "MySQL 8.0 database pod for the milestone app. Its data volume is backed by a Longhorn PersistentVolumeClaim." },
    { id: 'pod-derroh-web',    layer: 3, type: 'pod', label: 'pod/derroh-web', sub: 'nginx:alpine',
      desc: 'Static-site pod serving derroh.co.ke.' },
    { id: 'pod-kimberley-web', layer: 3, type: 'pod', label: 'pod/kimberley-web', sub: 'nginx:alpine',
      desc: 'Static-site pod serving kimberley.name.ng.' },
    { id: 'pod-mailserver', layer: 3, type: 'pod', label: 'pod/docker-mailserver', sub: 'Postfix · Dovecot · rspamd',
      desc: 'Handles inbound/outbound SMTP and IMAP, with rspamd for spam filtering.' },
    { id: 'pod-roundcube',  layer: 3, type: 'pod', label: 'pod/roundcube', sub: 'Webmail UI',
      desc: 'Browser-based mail client — talks to docker-mailserver over IMAP.' },

    { id: 'storage-longhorn', layer: 4, type: 'storage', label: 'Longhorn PVC', sub: 'Replicated Block Storage',
      desc: "Longhorn provisions replicated block storage across cluster nodes for stateful workloads — here backing milestone-db's data volume." },
  ];

  const edges = [
    ['edge', 'ingress'],
    ['ingress', 'svc-milestone'], ['ingress', 'svc-derroh'], ['ingress', 'svc-kimberley'], ['ingress', 'svc-mail'],
    ['svc-milestone', 'pod-milestone-app'],
    ['svc-derroh', 'pod-derroh-web'],
    ['svc-kimberley', 'pod-kimberley-web'],
    ['svc-mail', 'pod-mailserver'], ['svc-mail', 'pod-roundcube'],
    ['pod-milestone-app', 'pod-milestone-queue', true],
    ['pod-milestone-app', 'pod-milestone-db'],
    ['pod-milestone-queue', 'pod-milestone-db', true],
    ['pod-roundcube', 'pod-mailserver', true],
    ['pod-milestone-db', 'storage-longhorn'],
  ];

  // ── Layout ──────────────────────────────────────────────────
  const NODE_W = 168, NODE_H = 44, GAP_Y = 16, COL_GAP = 152;
  const byLayer = {};
  nodes.forEach(n => { (byLayer[n.layer] = byLayer[n.layer] || []).push(n); });
  const maxCount = Math.max(...Object.values(byLayer).map(a => a.length));
  const stageH = maxCount * NODE_H + (maxCount - 1) * GAP_Y;

  Object.keys(byLayer).forEach(layerKey => {
    const arr = byLayer[layerKey];
    const total = arr.length * NODE_H + (arr.length - 1) * GAP_Y;
    const startY = (stageH - total) / 2;
    arr.forEach((n, i) => {
      n.x = 24 + Number(layerKey) * (NODE_W + COL_GAP);
      n.y = startY + i * (NODE_H + GAP_Y);
    });
  });

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
  const totalW = 24 + 5 * (NODE_W + COL_GAP) - COL_GAP + 24;
  const totalH = stageH + 40;

  svgEl.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);

  // adjacency for path tracing
  const forward = {}, backward = {};
  edges.forEach(([a, b]) => {
    (forward[a] = forward[a] || []).push(b);
    (backward[b] = backward[b] || []).push(a);
  });

  function traceFull(id) {
    const set = new Set([id]);
    (function up(x) { (backward[x] || []).forEach(p => { if (!set.has(p)) { set.add(p); up(p); } }); })(id);
    (function down(x) { (forward[x] || []).forEach(c => { if (!set.has(c)) { set.add(c); down(c); } }); })(id);
    return set;
  }

  // ── Render edges ──────────────────────────────────────────────
  const edgeEls = [];
  edges.forEach(([a, b, dashed]) => {
    const na = nodeById[a], nb = nodeById[b];
    const x1 = na.x + NODE_W, y1 = na.y + NODE_H / 2;
    const x2 = nb.x,          y2 = nb.y + NODE_H / 2;
    const mx = (x1 + x2) / 2;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    path.setAttribute('class', 'topo-edge' + (dashed ? ' is-dashed' : ''));
    path.dataset.a = a; path.dataset.b = b;
    svgEl.appendChild(path);
    edgeEls.push(path);
  });

  // ── Render nodes ────────────────────────────────────────────
  const nodeEls = {};
  nodes.forEach(n => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `topo-node topo-node--${n.type}`);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${TYPE_META[n.type].label}: ${n.label}`);
    g.setAttribute('transform', `translate(${n.x},${n.y})`);

    const box = document.createElementNS(NS, 'rect');
    box.setAttribute('class', 'tn-box');
    box.setAttribute('width', NODE_W); box.setAttribute('height', NODE_H);
    box.setAttribute('rx', 4);
    g.appendChild(box);

    const accent = document.createElementNS(NS, 'rect');
    accent.setAttribute('class', 'tn-accent');
    accent.setAttribute('width', 4); accent.setAttribute('height', NODE_H);
    accent.setAttribute('rx', 2);
    g.appendChild(accent);

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('class', 'tn-label');
    label.setAttribute('x', 14); label.setAttribute('y', 19);
    label.textContent = n.label;
    g.appendChild(label);

    const sub = document.createElementNS(NS, 'text');
    sub.setAttribute('class', 'tn-sub');
    sub.setAttribute('x', 14); sub.setAttribute('y', 33);
    sub.textContent = n.sub;
    g.appendChild(sub);

    function activate() { selectNode(n.id); }
    g.addEventListener('click', activate);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });

    svgEl.appendChild(g);
    nodeEls[n.id] = g;
  });

  // ── Legend ──────────────────────────────────────────────────
  const legend = document.getElementById('topo-legend');
  if (legend) {
    Object.entries(TYPE_META).forEach(([key, meta]) => {
      const item = document.createElement('span');
      item.className = 'tl-item';
      item.innerHTML = `<span class="tl-dot" style="background:${meta.color}"></span>${meta.label}`;
      legend.appendChild(item);
    });
  }

  // ── Selection / info panel ──────────────────────────────────
  const infoEmpty = document.getElementById('topo-info-empty');
  const infoCard  = document.getElementById('topo-info-card');
  const ticType = document.getElementById('tic-type');
  const ticLabel = document.getElementById('tic-label');
  const ticSub = document.getElementById('tic-sub');
  const ticDesc = document.getElementById('tic-desc');
  const ticPath = document.getElementById('tic-path');

  function clearSelection() {
    Object.values(nodeEls).forEach(g => g.classList.remove('is-active', 'is-dim'));
    edgeEls.forEach(p => p.classList.remove('is-active', 'is-dim'));
    if (infoEmpty) infoEmpty.style.display = '';
    if (infoCard) infoCard.style.display = 'none';
  }

  function selectNode(id) {
    const path = traceFull(id);
    Object.entries(nodeEls).forEach(([nid, g]) => {
      g.classList.toggle('is-active', path.has(nid));
      g.classList.toggle('is-dim', !path.has(nid));
    });
    edgeEls.forEach(p => {
      const onPath = path.has(p.dataset.a) && path.has(p.dataset.b);
      p.classList.toggle('is-active', onPath);
      p.classList.toggle('is-dim', !onPath);
    });

    const n = nodeById[id];
    if (infoEmpty) infoEmpty.style.display = 'none';
    if (infoCard) infoCard.style.display = '';
    if (ticType) ticType.textContent = TYPE_META[n.type].label;
    if (ticLabel) ticLabel.textContent = n.label;
    if (ticSub) ticSub.textContent = n.sub;
    if (ticDesc) ticDesc.textContent = n.desc;
    if (ticPath) {
      // order the path roughly by layer for a readable breadcrumb
      const ordered = [...path].map(pid => nodeById[pid]).sort((a, b) => a.layer - b.layer || a.y - b.y);
      ticPath.innerHTML = ordered.map(nn =>
        `<span class="${nn.id === id ? 'current' : ''}">${nn.label}</span>`
      ).join('');
    }
  }

  const resetBtn = document.getElementById('topo-reset');
  if (resetBtn) resetBtn.addEventListener('click', clearSelection);
}

/* ── 3D GLOBE — REGIONS, EDGE NETWORK, DEPLOYMENT PATHS ──────────
   Wireframe globe with markers for the origin server, the
   operator's location, and Cloudflare edge PoPs, connected by
   animated arcs. Drag to rotate, click a marker to trace its
   routes. Falls back gracefully if Three.js/WebGL is unavailable.
──────────────────────────────────────────────────────────────── */
/* ── LAZY GLOBE LOADER ────────────────────────────────────────────
   The globe (3D scene construction: geometry, 12 arcs, markers,
   raycasting) is real work. Most visitors never click the Global
   Edge tab, so don't pay for any of it — including the three.js
   fetch itself — until they actually do.
──────────────────────────────────────────────────────────────── */
function initGlobeLazy() {
  const globeTab = document.getElementById('topo-tab-global');
  if (!globeTab) return;

  let started = false;
  globeTab.addEventListener('click', async () => {
    if (started) return;
    started = true;
    try {
      await loadThreeJS();
      initGlobe3D();
      // The view-tab switcher already dispatched 'topo:view-changed' for
      // this click before the scene existed to hear it — re-signal now
      // that the globe's own listener is actually attached.
      document.dispatchEvent(new CustomEvent('topo:view-changed', { detail: { view: 'global' } }));
    } catch (e) {
      started = false; // allow retry on a flaky connection
    }
  });
}

function initGlobe3D() {
  const wrap   = document.getElementById('globe-canvas-wrap');
  const canvas = document.getElementById('globe-canvas');
  if (!wrap || !canvas || typeof THREE === 'undefined') return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) { return; }
  if (!renderer) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CYAN = 0x00d4c8, CYAN_B = 0x00ffd4, BLUE = 0x40c4ff, AMBER = 0xffab00, GREEN = 0x00e676;
  const R = 26; // globe radius

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  camera.position.set(0, 8, 78);

  function sizeToWrap() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // ── Wireframe sphere + lat/lon grid ───────────────────────────
  const solid = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x02181c, transparent: true, opacity: 0.55 })
  );
  globeGroup.add(solid);

  const gridMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18 });
  // parallels
  for (let i = 1; i < 12; i++) {
    const lat = -90 + (i * 180) / 12;
    const pts = [];
    for (let j = 0; j <= 64; j++) {
      pts.push(latLngToVec3(lat, (j / 64) * 360 - 180, R));
    }
    globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }
  // meridians
  for (let i = 0; i < 12; i++) {
    const lon = -180 + (i * 360) / 12;
    const pts = [];
    for (let j = 0; j <= 64; j++) {
      pts.push(latLngToVec3(-90 + (j / 64) * 180, lon, R));
    }
    globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  }
  // outer rim glow
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.015, 32, 24),
    new THREE.MeshBasicMaterial({ color: CYAN_B, transparent: true, opacity: 0.05, side: THREE.BackSide })
  );
  globeGroup.add(rim);

  function latLngToVec3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ── Location data ───────────────────────────────────────────
  const LOCATIONS = [
    { id: 'origin',   type: 'origin',   lat: 49.45,  lon: 11.08,  label: 'Origin Server', sub: 'Contabo VPS · Nuremberg, DE',
      desc: 'k3s runs on a bare Contabo VPS in Nuremberg, Germany — the single origin behind everything in the LIVE_STACK and TRAFFIC_TOPOLOGY modules above.' },
    { id: 'operator', type: 'operator', lat: -1.29,  lon: 36.82,  label: 'Operator', sub: 'Nairobi, Kenya',
      desc: 'Where deploys, kubectl commands, and on-call incident response actually happen from.' },
    { id: 'edge-fra', type: 'edge', lat: 50.11,  lon: 8.68,   label: 'Frankfurt PoP',   sub: 'Cloudflare Edge · EU',
      desc: 'Closest Cloudflare edge to the origin — typically the fastest cache path for EU traffic.' },
    { id: 'edge-lon', type: 'edge', lat: 51.51,  lon: -0.13,  label: 'London PoP',      sub: 'Cloudflare Edge · UK',
      desc: 'Serves UK visitors from cache, falling back to the Nuremberg origin on a miss.' },
    { id: 'edge-nyc', type: 'edge', lat: 40.71,  lon: -74.01, label: 'New York PoP',    sub: 'Cloudflare Edge · US-East',
      desc: 'Primary edge for US East Coast traffic.' },
    { id: 'edge-sfo', type: 'edge', lat: 37.77,  lon: -122.42,label: 'San Francisco PoP', sub: 'Cloudflare Edge · US-West',
      desc: 'Primary edge for US West Coast traffic.' },
    { id: 'edge-gru', type: 'edge', lat: -23.55, lon: -46.63, label: 'São Paulo PoP',   sub: 'Cloudflare Edge · South America',
      desc: 'Edge PoP covering South American visitors.' },
    { id: 'edge-jnb', type: 'edge', lat: -26.20, lon: 28.05,  label: 'Johannesburg PoP', sub: 'Cloudflare Edge · Africa',
      desc: 'Closest edge PoP to the operator in Nairobi.' },
    { id: 'edge-bom', type: 'edge', lat: 19.08,  lon: 72.88,  label: 'Mumbai PoP',      sub: 'Cloudflare Edge · South Asia',
      desc: 'Edge PoP covering South Asian traffic.' },
    { id: 'edge-sin', type: 'edge', lat: 1.35,   lon: 103.82, label: 'Singapore PoP',   sub: 'Cloudflare Edge · SE Asia',
      desc: 'Edge PoP covering Southeast Asian traffic.' },
    { id: 'edge-nrt', type: 'edge', lat: 35.68,  lon: 139.69, label: 'Tokyo PoP',       sub: 'Cloudflare Edge · East Asia',
      desc: 'Edge PoP covering East Asian traffic.' },
    { id: 'edge-syd', type: 'edge', lat: -33.87, lon: 151.21, label: 'Sydney PoP',      sub: 'Cloudflare Edge · Oceania',
      desc: 'Edge PoP covering Australia and Oceania.' },
  ];
  const TYPE_META = {
    origin:   { label: 'ORIGIN',   color: CYAN_B, hex: '#00ffd4' },
    operator: { label: 'OPERATOR', color: AMBER,  hex: '#ffab00' },
    edge:     { label: 'CF EDGE',  color: BLUE,   hex: '#40c4ff' },
  };

  // ── Markers ─────────────────────────────────────────────────
  const markersGroup = new THREE.Group();
  globeGroup.add(markersGroup);
  const markerMeshes = [];
  LOCATIONS.forEach(loc => {
    const pos = latLngToVec3(loc.lat, loc.lon, R * 1.01);
    const size = loc.type === 'edge' ? 0.55 : 0.85;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 12),
      new THREE.MeshBasicMaterial({ color: TYPE_META[loc.type].color })
    );
    mesh.position.copy(pos);
    mesh.userData = loc;
    markersGroup.add(mesh);
    markerMeshes.push(mesh);

    // halo ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 1.6, size * 2.1, 20),
      new THREE.MeshBasicMaterial({ color: TYPE_META[loc.type].color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.position.copy(pos);
    ring.lookAt(pos.clone().multiplyScalar(2));
    markersGroup.add(ring);
  });

  // ── Arcs: origin → each edge, operator → origin ───────────────
  const originLoc = LOCATIONS.find(l => l.id === 'origin');
  const operatorLoc = LOCATIONS.find(l => l.id === 'operator');
  const arcDefs = [];
  LOCATIONS.filter(l => l.type === 'edge').forEach(l => arcDefs.push({ from: 'origin', to: l.id, color: CYAN }));
  arcDefs.push({ from: 'operator', to: 'origin', color: AMBER });

  function makeArcCurve(fromLoc, toLoc) {
    const a = latLngToVec3(fromLoc.lat, fromLoc.lon, R * 1.01);
    const b = latLngToVec3(toLoc.lat, toLoc.lon, R * 1.01);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dist = a.distanceTo(b);
    mid.setLength(R + dist * 0.55); // lift arc above surface, proportional to distance
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }

  const arcsGroup = new THREE.Group();
  globeGroup.add(arcsGroup);
  const arcObjs = [];
  arcDefs.forEach(def => {
    const fromLoc = LOCATIONS.find(l => l.id === def.from);
    const toLoc   = LOCATIONS.find(l => l.id === def.to);
    const curve = makeArcCurve(fromLoc, toLoc);
    const pts = curve.getPoints(48);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.28 })
    );
    line.userData = { from: def.from, to: def.to };
    arcsGroup.add(line);

    let pulse = null;
    if (!reduced) {
      pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: def.color === AMBER ? AMBER : CYAN_B })
      );
      globeGroup.add(pulse);
    }
    arcObjs.push({ curve, line, pulse, t: Math.random(), speed: rand(0.0025, 0.005), from: def.from, to: def.to });
  });

  // ── Selection / info panel ──────────────────────────────────
  const infoEmpty = document.getElementById('globe-info-empty');
  const infoCard  = document.getElementById('globe-info-card');
  const gicType = document.getElementById('gic-type');
  const gicLabel = document.getElementById('gic-label');
  const gicSub = document.getElementById('gic-sub');
  const gicDesc = document.getElementById('gic-desc');

  let selectedId = null;

  function selectLocation(loc) {
    selectedId = loc.id;
    if (infoEmpty) infoEmpty.style.display = 'none';
    if (infoCard) infoCard.style.display = '';
    if (gicType) gicType.textContent = TYPE_META[loc.type].label;
    if (gicLabel) gicLabel.textContent = loc.label;
    if (gicSub) gicSub.textContent = loc.sub;
    if (gicDesc) gicDesc.textContent = loc.desc;

    arcObjs.forEach(a => {
      const onPath = a.from === loc.id || a.to === loc.id;
      a.line.material.opacity = onPath ? 0.85 : 0.08;
    });
    markerMeshes.forEach(m => {
      m.material.opacity = 1;
      m.scale.setScalar(m.userData.id === loc.id ? 1.6 : 1);
    });
  }

  function clearGlobeSelection() {
    selectedId = null;
    if (infoEmpty) infoEmpty.style.display = '';
    if (infoCard) infoCard.style.display = 'none';
    arcObjs.forEach(a => { a.line.material.opacity = 0.28; });
    markerMeshes.forEach(m => { m.material.opacity = 1; m.scale.setScalar(1); });
  }

  const sharedResetBtn = document.getElementById('topo-reset');
  if (sharedResetBtn) sharedResetBtn.addEventListener('click', clearGlobeSelection);

  // ── Legend ──────────────────────────────────────────────────
  const legend = document.getElementById('globe-legend');
  if (legend) {
    Object.entries(TYPE_META).forEach(([, meta]) => {
      const item = document.createElement('span');
      item.className = 'tl-item';
      item.innerHTML = `<span class="tl-dot" style="background:${meta.hex}"></span>${meta.label}`;
      legend.appendChild(item);
    });
  }

  // ── Drag-to-rotate + click-to-select ─────────────────────────
  let dragging = false, lastX = 0, lastY = 0, yaw = 0.4, pitch = -0.15, idleTimer = null;
  const dragHint = document.getElementById('globe-drag-hint');

  function applyRotation() {
    globeGroup.rotation.y = yaw;
    globeGroup.rotation.x = pitch;
  }
  applyRotation();

  function markInteracted() {
    if (dragHint) dragHint.classList.add('is-hidden');
  }

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    markInteracted();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    yaw += dx * 0.006;
    pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.006));
    applyRotation();
  });
  window.addEventListener('pointerup', () => { dragging = false; });

  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();
  wrap.addEventListener('click', (e) => {
    const rect = wrap.getBoundingClientRect();
    mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    if (hits.length) selectLocation(hits[0].object.userData);
  });

  let hoveredMesh = null;
  wrap.addEventListener('pointermove', (e) => {
    if (dragging) return;
    const rect = wrap.getBoundingClientRect();
    mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    const hit = hits.length ? hits[0].object : null;

    if (hit === hoveredMesh) return;
    if (hoveredMesh && hoveredMesh.userData.id !== selectedId) hoveredMesh.scale.setScalar(1);
    hoveredMesh = hit;
    if (hoveredMesh && hoveredMesh.userData.id !== selectedId) hoveredMesh.scale.setScalar(1.35);
    wrap.style.cursor = hoveredMesh ? 'pointer' : 'grab';
  });
  wrap.addEventListener('pointerleave', () => {
    if (hoveredMesh && hoveredMesh.userData.id !== selectedId) hoveredMesh.scale.setScalar(1);
    hoveredMesh = null;
    wrap.style.cursor = 'grab';
  });

  sizeToWrap();
  window.addEventListener('resize', sizeToWrap, { passive: true });

  let animId;
  let inView = false;
  let tabActive = false;
  function animate() {
    if (!inView || !tabActive) { animId = null; return; }
    if (!reduced && !dragging) yaw += 0.0009;
    applyRotation();

    if (!reduced) {
      arcObjs.forEach(a => {
        a.t += a.speed;
        if (a.t > 1) a.t = 0;
        if (a.pulse) {
          const p = a.curve.getPointAt(a.t);
          a.pulse.position.copy(p.applyMatrix4(globeGroup.matrixWorld));
        }
      });
    }
    globeGroup.updateMatrixWorld();

    renderer.render(scene, camera);
    animId = requestAnimationFrame(animate);
  }

  // Only render while the globe view is both the active tab AND actually
  // visible on screen — this is a heavy scene (12 arcs + pulses + raycasting),
  // no reason to spend main-thread time on it while the Cluster tab is showing.
  const visObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      inView = entry.isIntersecting;
      if (inView && tabActive && !animId && !document.hidden) animate();
    });
  }, { threshold: 0.05 });
  visObs.observe(wrap);

  document.addEventListener('topo:view-changed', (e) => {
    tabActive = e.detail.view === 'global';
    if (tabActive) {
      sizeToWrap();
      if (inView && !animId && !document.hidden) animate();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (animId) cancelAnimationFrame(animId); animId = null; }
    else if (inView && tabActive && !animId) animate();
  });
}

/* ── TOPOLOGY VIEW TABS (Cluster / Global Edge toggle) ───────────
   Switches between the internal K8s traffic map and the 3D globe
   within the single merged Traffic Topology panel, and tells the
   globe (via a custom event) whether it should be rendering.
──────────────────────────────────────────────────────────────── */
function initTopologyViewTabs() {
  const tabs = $$('.topo-view-tab');
  if (!tabs.length) return;

  const views = {
    cluster: document.getElementById('topo-view-cluster'),
    global:  document.getElementById('topo-view-global'),
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      if (tab.classList.contains('active')) return;

      tabs.forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      Object.entries(views).forEach(([key, el]) => {
        if (!el) return;
        const show = key === view;
        el.classList.toggle('is-hidden', !show);
        if (show) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
      });

      document.dispatchEvent(new CustomEvent('topo:view-changed', { detail: { view } }));
    });
  });
}

/* ── SKILL CATEGORY FILTER ────────────────────────────────────── */
function initCategoryFilter() {
  const btns   = $$('.cat-btn');
  const panels = $$('.gauge-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;

      panels.forEach(p => {
        if (cat === 'all' || p.dataset.cat === cat) {
          p.classList.remove('hidden');
        } else {
          p.classList.add('hidden');
        }
      });
    });
  });
}

/* ── SCROLL REVEAL ────────────────────────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const siblings = $$('.reveal', entry.target.closest('section') || document.body);
      const idx = siblings.indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, Math.min(idx * 70, 350));
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  $$('.reveal').forEach(el => obs.observe(el));
}

/* ── ACTIVE NAV ───────────────────────────────────────────────── */
function initActiveNav() {
  const sections = $$('section[id]');
  const links    = $$('.nl[data-s]');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => {
          l.classList.toggle('active', l.dataset.s === entry.target.id);
        });
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(s => obs.observe(s));
}

/* ── MOBILE NAV ───────────────────────────────────────────────── */
/* ── DOCK-STYLE NAV HOVER (macOS-esque magnification) ─────────────
   As the pointer moves along the nav links, the nearest link scales
   up and lifts slightly, with neighbors scaling by falloff distance
   — same feel as hovering the macOS dock. Desktop/mouse only:
   skipped on touch devices and when reduced-motion is requested.
──────────────────────────────────────────────────────────────── */
function initDockNav() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const container = document.getElementById('nav-links');
  if (!container) return;
  const items = $$('.nl', container);
  if (!items.length) return;

  const MAX_SCALE = 1.22;
  const SIGMA     = 60; // px — falloff radius, smaller = tighter magnification
  const LIFT_PX   = 9;  // max upward lift at full magnification

  let raf = null, pendingX = null;

  function apply(mouseX) {
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = mouseX - centerX;
      const scale = 1 + (MAX_SCALE - 1) * Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
      const lift = (scale - 1) / (MAX_SCALE - 1) * LIFT_PX;
      item.style.transform = `translateY(${-lift}px) scale(${scale.toFixed(3)})`;
    });
  }

  function reset() {
    items.forEach(item => { item.style.transform = ''; });
  }

  container.addEventListener('mousemove', (e) => {
    if (window.innerWidth <= 820) return; // mobile fullscreen menu layout — skip
    pendingX = e.clientX;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      apply(pendingX);
      raf = null;
    });
  });

  container.addEventListener('mouseleave', () => {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    reset();
  });
}

function initMobileNav() {
  const toggle = $('#nav-toggle');
  const menu   = $('#nav-links');
  if (!toggle || !menu) return;

  // The nav shell has backdrop-filter, which creates a new containing
  // block for position:fixed descendants — left in place, the mobile
  // fullscreen menu would position/clip itself against the small
  // floating bar instead of the real viewport. So while open, move it
  // to a direct child of <body> (a "portal"), then put it back on close
  // so desktop's inline flex layout is unaffected.
  const menuHome     = menu.parentElement;
  const menuNextSibl = menu.nextElementSibling;

  function openMenu() {
    document.body.appendChild(menu);
    menu.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    // Return it to its original spot once the close transition finishes
    // so it doesn't visually jump mid-animation.
    setTimeout(() => {
      if (!menu.classList.contains('open')) {
        if (menuNextSibl) menuHome.insertBefore(menu, menuNextSibl);
        else menuHome.appendChild(menu);
      }
    }, 400);
  }

  toggle.addEventListener('click', () => {
    if (menu.classList.contains('open')) closeMenu(); else openMenu();
  });

  $$('.nl', menu).forEach(l => {
    l.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
}

/* ── SCROLL EFFECTS (header + back-to-top) ────────────────────── */
function initScrollEffects() {
  const header  = $('#nav-shell');
  const btt     = $('#back-to-top');

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 40);
        if (btt)    btt.classList.toggle('visible', y > 400);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  if (btt) btt.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── SMOOTH ANCHORS ───────────────────────────────────────────── */
function initAnchors() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = $(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

/* ── PANEL CARD TILT ──────────────────────────────────────────── */
function initCardTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth <= 820) return;

  $$('.project-svc, .gauge-panel').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x    = (e.clientX - rect.left) / rect.width  - 0.5;
      const y    = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `translateY(-3px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
      card.style.transition = 'transform 0.08s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'all 0.28s ease';
    });
  });
}

/* ── LAZY THREE.JS LOADER ─────────────────────────────────────────
   three.js (~600KB) is fetched via a dynamically-injected script tag
   instead of a blocking/deferred <script> in <head>. This keeps it
   completely off the critical path for first paint / LCP — the
   fetch is kicked off early (in parallel with the boot animation)
   but nothing waits on it until a 3D scene actually needs THREE.
──────────────────────────────────────────────────────────────── */
let threeLoadPromise = null;
function loadThreeJS() {
  if (threeLoadPromise) return threeLoadPromise;
  threeLoadPromise = new Promise((resolve, reject) => {
    if (typeof THREE !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('three.js failed to load'));
    document.head.appendChild(s);
  });
  threeLoadPromise.catch(() => { threeLoadPromise = null; }); // allow a later retry on failure
  return threeLoadPromise;
}

// A full WebGL node-graph background adds real CPU/GPU cost for very
// little visual payoff on small phone screens — skip it there and use
// the much cheaper 2D canvas fallback instead.
function shouldUse3DBackground() {
  return window.innerWidth >= 640;
}

/* ── INIT ALL ─────────────────────────────────────────────────── */
async function initAll() {
  initClock();
  initUptime();
  initFooterYear();
  initMetrics();
  initStatCounters();
  initGauges();
  initHeartbeat();
  initHeatmap();
  initTopologyMap();
  initTopologyViewTabs();
  initCategoryFilter();
  initReveal();
  initActiveNav();
  initMobileNav();
  initDockNav();
  initScrollEffects();
  initAnchors();
  initCardTilt();
  initCaseFileFilter();

  // Everything above is cheap and renders immediately. The 3D scenes
  // wait on the (already in-flight, non-blocking) three.js fetch.
  if (shouldUse3DBackground()) {
    try {
      await loadThreeJS();
      if (!init3DBgCanvas()) initBgCanvas2D();
    } catch (e) {
      initBgCanvas2D();
    }
  } else {
    initBgCanvas2D();
  }
  initGlobeLazy();
}

/* ── BOOT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.overflow = 'hidden'; // lock scroll during boot
  if (shouldUse3DBackground()) loadThreeJS().catch(() => {}); // fire-and-forget, runs alongside the boot animation
  runBoot();
});

/* ── CASE FILE FILTER ─────────────────────────────────────────── */
function initCaseFileFilter() {
  const tabs  = $$('.cf-tab');
  const cards = $$('.ic[data-filter]');
  const rowContainers = [
    $('.cf-col-right'),
    $('.cf-row-3'),
    $('.cf-row-2'),
  ].filter(Boolean);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');

      const filter = tab.dataset.filter;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.filter === filter;
        card.classList.toggle('ic-hidden', !match);
        card.style.display = match ? '' : 'none';
      });

      // Restore flex/grid display on visible containers
      rowContainers.forEach(c => {
        const hasVisible = [...c.querySelectorAll('.ic')].some(
          el => el.style.display !== 'none'
        );
        c.style.display = hasVisible ? '' : 'none';
      });
    });
  });
}



