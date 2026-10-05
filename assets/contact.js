/* ═══════════════════════════════════════════════════════════════
   DERRICK-OPS  |  Contact Form Handler
   Secure terminal-style submission to /api/contact
   - No validation until first interaction/submission
   - Focus scan line + subtle focus glow
   - Green valid check, red error with message under field
   - Terminal command execution animation on submit
   - Cursor-reactive glow + micro-tilt on the panel
   - Keeps real CSRF + honeypot + Go backend wiring
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const form       = document.getElementById('contact-form');
  const status     = document.getElementById('form-status');
  const submitBtn  = document.getElementById('form-submit');
  const overlay    = document.getElementById('form-overlay');
  const foConsole  = document.getElementById('fo-console');
  const foSuccess  = document.getElementById('fo-success');
  const foError    = document.getElementById('fo-error');
  const foErrMsg   = document.getElementById('fo-err-msg');
  const foAgain    = document.getElementById('fo-again');
  const foRetry    = document.getElementById('fo-retry');
  const csrfInput  = document.getElementById('f-csrf');
  const honeypot   = document.getElementById('f-website');
  if (!form || !status || !submitBtn || !overlay) return;

  const fields = {
    name:    document.getElementById('f-name'),
    email:   document.getElementById('f-email'),
    subject: document.getElementById('f-subject'),
    message: document.getElementById('f-message'),
  };

  const fieldEls = {};
  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    fieldEls[key] = input ? input.closest('.cmd-field') : null;
  });

  const validators = {
    name: function (v) {
      if (!v) return 'name is required';
      if (v.length > 120) return 'name exceeds 120 characters';
      return '';
    },
    email: function (v) {
      if (!v) return 'email is required';
      if (v.length > 254) return 'email exceeds 254 characters';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'invalid email format';
      return '';
    },
    subject: function (v) {
      if (!v) return 'subject is required';
      if (v.length > 200) return 'subject exceeds 200 characters';
      return '';
    },
    message: function (v) {
      if (!v) return 'message is required';
      if (v.length < 10) return 'message too short (min 10)';
      if (v.length > 10000) return 'message exceeds 10,000 characters';
      return '';
    },
  };

  // `dirty`: the user has typed in the field. `touched`: errors may show.
  // A field only becomes touched on blur after typing, or on submit, so
  // simply tabbing through the empty form never paints it red.
  var dirty   = { name: false, email: false, subject: false, message: false };
  var touched = { name: false, email: false, subject: false, message: false };

  function errSpan(key) {
    if (!fields[key]) return null;
    return document.getElementById(fields[key].id + '-msg');
  }

  function setFieldState(key) {
    const input = fields[key];
    const el    = fieldEls[key];
    const span  = errSpan(key);
    if (!input || !el || !span) return;

    const err  = validators[key](input.value.trim());
    const show = Boolean(err) && touched[key];

    // The green check can appear while typing; errors wait for `touched`.
    el.classList.toggle('is-valid', !err);
    el.classList.toggle('is-invalid', show);
    input.classList.toggle('cmd-input--error', show);
    span.textContent = show ? err : '';
    if (show) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return err;
  }

  function addScanLine(input) {
    const wrap = input.closest('.cf-wrap');
    const el   = input.closest('.cmd-field');
    if (!wrap || !el || el.classList.contains('cf-scanning')) return;
    el.classList.add('cf-scanning');
    setTimeout(function () { el.classList.remove('cf-scanning'); }, 520);
  }

  /* ── Interaction handlers ────────────────────────────────── */
  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    if (!input) return;

    input.addEventListener('focus', function () {
      addScanLine(input);
    });

    input.addEventListener('blur', function () {
      if (dirty[key]) touched[key] = true;
      setFieldState(key);
    });

    input.addEventListener('input', function () {
      dirty[key] = true;
      setFieldState(key);
    });
  });

  /* ── CSRF ────────────────────────────────────────────────── */
  let csrfToken = '';
  let csrfFetchedAt = 0;

  // The server refuses a token used less than 3s after it was issued
  // (an anti-bot rule), so remember when we got it.
  const TOKEN_MIN_AGE_MS = 3200;

  async function fetchCSRFToken() {
    try {
      const res = await fetch('/api/csrf-token', { cache: 'no-store', credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.token || '';
        csrfFetchedAt = Date.now();
        if (csrfInput) csrfInput.value = csrfToken;
      }
    } catch (_) { /* endpoint unavailable — server will reject */ }
  }

  fetchCSRFToken();

  /* ── Transmission overlay animation ──────────────────────── */
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const beat = (ms) => sleep(reduceMotion ? Math.min(ms, 40) : ms);

  // Everything in the form except the overlay itself goes inert while the
  // overlay is up, so keyboard focus can't wander behind it.
  function setFormInert(on) {
    Array.prototype.forEach.call(form.children, function (child) {
      if (child === overlay || child === status) return;
      if (on) child.setAttribute('inert', '');
      else child.removeAttribute('inert');
    });
  }

  function showOverlay() {
    overlay.hidden = false;
    foConsole.innerHTML = '';
    foSuccess.hidden = true;
    foError.hidden = true;
    form.classList.add('is-sent');
    setFormInert(true);
  }

  function hideOverlay() {
    overlay.hidden = true;
    foConsole.innerHTML = '';
    form.classList.remove('is-sent');
    setFormInert(false);
  }

  function consoleLine(html, type) {
    const div = document.createElement('div');
    div.className = 'fo-line' + (type ? ' ' + type : '');
    div.innerHTML = html;
    foConsole.appendChild(div);
    return div;
  }

  // Phase 1 runs while the request is in flight: prompt, handshake line
  // and a progress bar that climbs to 90% and holds there.
  async function playHandshake() {
    consoleLine('<span class="fo-prompt">$</span> ./send-message.sh', 'fo-cmd');
    await beat(200);
    consoleLine('Initializing secure channel...', 'fo-muted');
    await beat(160);

    const barLine = consoleLine(
      '<span class="fo-bar" aria-hidden="true"><span class="fo-bar-fill"></span></span>' +
      '<span class="fo-pct">0%</span>', 'fo-progress');
    const fill = barLine.querySelector('.fo-bar-fill');
    const pct  = barLine.querySelector('.fo-pct');
    for (let p = 10; p <= 90; p += 10) {
      fill.style.width = p + '%';
      pct.textContent = p + '%';
      await beat(45);
    }
    return { line: barLine, fill: fill, pct: pct };
  }

  // Phase 2 depends on the real result.
  async function playSuccess(bar) {
    bar.fill.style.width = '100%';
    bar.pct.textContent = '100%';
    await beat(140);
    consoleLine('&#10003; Message encrypted', 'fo-ok');
    await beat(110);
    consoleLine('&#10003; Transmission complete', 'fo-ok');
    await beat(110);
    consoleLine('&#10003; Contact request queued', 'fo-ok');
    await beat(160);
    consoleLine('Connection established successfully.', 'fo-done');
  }

  async function playFailure(bar) {
    if (bar) bar.line.classList.add('is-failed');
    await beat(160);
  }

  function showSuccess() {
    foSuccess.hidden = false;
    const title = foSuccess.querySelector('.fo-title');
    if (title) title.focus({ preventScroll: true });
  }

  function showError(msgHtml) {
    foErrMsg.innerHTML = msgHtml;
    foError.hidden = false;
    const title = foError.querySelector('.fo-title');
    if (title) title.focus({ preventScroll: true });
  }

  const ERR_CHANNEL = 'Unable to establish communication channel.<br/>Please try again.';

  /* ── Submission ──────────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    Object.keys(fields).forEach(function (k) { touched[k] = true; });

    let hasError = false;
    Object.keys(fields).forEach(function (key) {
      if (setFieldState(key)) hasError = true;
    });
    if (hasError) {
      const firstInvalid = form.querySelector('.cmd-field.is-invalid input, .cmd-field.is-invalid textarea');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('is-sending');
    showOverlay();

    try {
      if (!csrfToken) await fetchCSRFToken();
      if (!csrfToken) {
        consoleLine('<span class="fo-prompt">$</span> ./send-message.sh', 'fo-cmd');
        await playFailure(null);
        showError('Security token unavailable.<br/>Refresh the page and try again.');
        return;
      }

      const payload = {
        name:    fields.name.value.trim(),
        email:   fields.email.value.trim(),
        subject: fields.subject.value.trim(),
        message: fields.message.value.trim(),
        // Honeypot: hidden from people, often filled by bots. The server
        // silently discards any submission where it isn't empty.
        '_website': honeypot ? honeypot.value : '',
      };

      // Only matters right after a refreshed token (e.g. Retry after a 403);
      // the wait hides inside the transmission animation.
      const tokenAge = Date.now() - csrfFetchedAt;
      if (tokenAge < TOKEN_MIN_AGE_MS) await sleep(TOKEN_MIN_AGE_MS - tokenAge);

      // The request goes out immediately; the animation never delays it.
      const request = fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      }).then(function (res) {
        return { ok: res.ok, status: res.status };
      }).catch(function () {
        return { ok: false, status: 0 };
      });

      const both   = await Promise.all([playHandshake(), request]);
      const bar    = both[0];
      const result = both[1];

      if (result.ok) {
        await playSuccess(bar);
        resetFields();
        showSuccess();
        return;
      }

      await playFailure(bar);
      if (result.status === 429) {
        showError('Rate limit exceeded.<br/>Please wait a moment and try again.');
      } else if (result.status === 403) {
        // Fetch the replacement now so Retry usually doesn't have to wait.
        csrfToken = '';
        fetchCSRFToken();
        showError('Security token expired.<br/>Please try again.');
      } else {
        showError(ERR_CHANNEL);
      }
    } catch (_) {
      showError(ERR_CHANNEL);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-sending');
    }
  });

  function resetFields() {
    form.reset();
    Object.keys(fields).forEach(function (key) {
      const input = fields[key];
      const el    = fieldEls[key];
      if (el) { el.classList.remove('is-valid', 'is-invalid'); }
      if (input) { input.classList.remove('cmd-input--error'); input.removeAttribute('aria-invalid'); }
      const span = errSpan(key);
      if (span) span.textContent = '';
    });
    dirty   = { name: false, email: false, subject: false, message: false };
    touched = { name: false, email: false, subject: false, message: false };
    fetchCSRFToken();
  }

  if (foAgain) foAgain.addEventListener('click', function () {
    hideOverlay();
    if (fields.name) fields.name.focus();
  });

  // Retry re-runs the submission with the message the user already wrote.
  if (foRetry) foRetry.addEventListener('click', function () {
    hideOverlay();
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else submitBtn.click();
  });

  /* ── Cursor glow + micro-tilt on the right terminal ───────── */
  const panel = document.querySelector('.contact-form-panel');
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  if (panel && !reduceMotion) {
    let raf = null;
    let settle = null;

    panel.addEventListener('pointermove', function (e) {
      if (!fineHover.matches || raf) return;
      const x = e.clientX, y = e.clientY;
      raf = requestAnimationFrame(function () {
        raf = null;
        const rect = panel.getBoundingClientRect();
        const fx = (x - rect.left) / rect.width;
        const fy = (y - rect.top) / rect.height;
        clearTimeout(settle);
        panel.style.setProperty('--glow-x', (fx * 100).toFixed(1) + '%');
        panel.style.setProperty('--glow-y', (fy * 100).toFixed(1) + '%');
        panel.classList.add('has-glow');
        // Fast inline transition beats the 0.6s .reveal transform transition.
        panel.style.transition = 'transform 0.12s ease-out';
        // Max ±1.5deg either axis — felt, not seen.
        panel.style.transform =
          'perspective(1200px) rotateX(' + ((0.5 - fy) * 3).toFixed(2) + 'deg) rotateY(' + ((fx - 0.5) * 3).toFixed(2) + 'deg)';
      });
    });

    panel.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      panel.classList.remove('has-glow');
      if (!panel.style.transform) return;
      // Ease back to flat, then hand transform back to the stylesheet.
      panel.style.transition = 'transform 0.4s ease-out';
      panel.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
      settle = setTimeout(function () {
        panel.style.transform = '';
        panel.style.transition = '';
      }, 420);
    });
  }

})();