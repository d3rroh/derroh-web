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

async function runHeroTerminal(container, identityEl) {
  if (!container) return;
  container.innerHTML = '';
  const PROMPT = 'derrick@server:~$';

  for (const step of HERO_SEQUENCE) {
    if (step.type === 'ready') {
      await delay(300);
      container.style.display = 'none';
      if (identityEl) identityEl.style.display = 'block';
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
  cpu:  { el: $('#cpu-bar'),  val: $('#cpu-val'),  base: 34, range: 18, suffix: '%' },
  ram:  { el: $('#ram-bar'),  val: $('#ram-val'),  base: 62, range: 12, suffix: '%' },
  disk: { el: $('#disk-bar'), val: $('#disk-val'), base: 58, range:  5, suffix: '%' },
  net:  { el: $('#net-bar'),  val: $('#net-val'),  base: 22, range: 30, suffix: 'Mb/s' },
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
      const circle = $('.gauge-fill', panel);
      const pctEl  = $('.gp-pct', panel);
      if (!circle || !pctEl) return;

      const pct  = parseInt(circle.dataset.pct, 10) || 80;
      const dash = circumference - (pct / 100) * circumference;

      requestAnimationFrame(() => {
        circle.style.strokeDashoffset = dash;
        circle.classList.add('animated');
      });

      // Animate number
      let current = 0;
      const steps = 60;
      const step  = pct / steps;
      const timer = setInterval(() => {
        current = Math.min(current + step, pct);
        pctEl.innerHTML = Math.round(current) + '<span class="gp-unit">%</span>';
        if (current >= pct) clearInterval(timer);
      }, 1400 / steps);

      // Draw sparkline
      const canvas = $('.spark-canvas', panel);
      if (canvas) drawSparkline(canvas, pct);

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
  grad.addColorStop(0, 'rgba(224,35,29,0.3)');
  grad.addColorStop(1, 'rgba(224,35,29,0)');

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
  ctx.strokeStyle = 'rgba(224,35,29,0.8)';
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
        ctx.strokeStyle = `rgba(224,35,29,${clamp(intensity * 1.5, 0.5, 1)})`;
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

/* ── BACKGROUND PARTICLE GRID ─────────────────────────────────── */
function initBgCanvas() {
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
          ctx.strokeStyle = `rgba(224,35,29,${(1 - d / DIST) * 0.12})`;
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
      ctx.fillStyle = 'rgba(224,35,29,0.25)';
      ctx.fill();
    });

    animId = requestAnimationFrame(draw);
  }

  draw();
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
function initMobileNav() {
  const toggle = $('#nav-toggle');
  const menu   = $('#nav-links');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  $$('.nl', menu).forEach(l => {
    l.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }
  });
}

/* ── SCROLL EFFECTS (header + back-to-top) ────────────────────── */
function initScrollEffects() {
  const header  = $('#nav-header');
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

/* ── CONTACT FORM ─────────────────────────────────────────────── */
function initContactForm() {
  const form   = $('#contact-form');
  const status = $('#form-status');
  const submitBtn = $('#form-submit');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const fields = {
      name:    $('#f-name'),
      email:   $('#f-email'),
      subject: $('#f-subject'),
      message: $('#f-message'),
    };

    Object.values(fields).forEach(f => f.classList.remove('error'));
    status.className = 'form-status';
    status.textContent = '';

    let ok = true;
    if (!fields.name.value.trim())                            { fields.name.classList.add('error');    ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value)) { fields.email.classList.add('error');   ok = false; }
    if (!fields.subject.value.trim())                          { fields.subject.classList.add('error'); ok = false; }
    if (fields.message.value.trim().length < 10)               { fields.message.classList.add('error'); ok = false; }

    if (!ok) {
      status.className = 'form-status error-msg';
      status.textContent = '⚠ Required fields incomplete.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Transmitting…</span>';

    try {
      await delay(1500);
      status.className = 'form-status success';
      status.textContent = '✓ Message transmitted. Response expected within 24 hrs.';
      form.reset();
    } catch {
      status.className = 'form-status error-msg';
      status.textContent = '✗ Transmission failed. Direct: info@derroh.co.ke';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>./send-message.sh</span>';
    }
  });

  Object.values({ n: $('#f-name'), e: $('#f-email'), s: $('#f-subject'), m: $('#f-message') })
    .filter(Boolean)
    .forEach(f => {
      f.addEventListener('input', () => {
        if (f.value.trim()) f.classList.remove('error');
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

/* ── INIT ALL ─────────────────────────────────────────────────── */
function initAll() {
  initClock();
  initUptime();
  initFooterYear();
  initMetrics();
  initStatCounters();
  initGauges();
  initHeartbeat();
  initHeatmap();
  initBgCanvas();
  initCategoryFilter();
  initReveal();
  initActiveNav();
  initMobileNav();
  initScrollEffects();
  initAnchors();
  initContactForm();
  initCardTilt();
  initCaseFileFilter();
}

/* ── BOOT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.overflow = 'hidden'; // lock scroll during boot
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


