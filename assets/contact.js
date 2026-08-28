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

  // Whether a field has been interacted with — gates ALL error display.
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

    const err = validators[key](input.value.trim());
    input.classList.remove('cmd-input--error');
    el.classList.remove('is-invalid');
    span.textContent = '';

    if (!err && input.value.trim()) el.classList.add('is-valid');
    else el.classList.remove('is-valid');

    if (!touched[key]) return;

    if (err) {
      el.classList.add('is-invalid');
      input.classList.add('cmd-input--error');
      span.textContent = err;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', input.id + '-msg');
    } else {
      input.removeAttribute('aria-invalid');
    }
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
      touched[key] = true;
      addScanLine(input);
    });

    input.addEventListener('blur', function () {
      touched[key] = true;
      setFieldState(key);
    });

    input.addEventListener('input', function () {
      if (touched[key]) setFieldState(key);
    });
  });

  /* ── CSRF ────────────────────────────────────────────────── */
  let csrfToken = '';

  async function fetchCSRFToken() {
    try {
      const res = await fetch('/api/csrf-token');
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.token || '';
        if (csrfInput) csrfInput.value = csrfToken;
      }
    } catch (_) { /* endpoint unavailable — server will reject */ }
  }

  fetchCSRFToken();

  /* ── Transmission overlay animation ──────────────────────── */
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function showOverlay() {
    overlay.hidden = false;
    foConsole.innerHTML = '';
    foSuccess.hidden = true;
    foError.hidden = true;
  }

  function hideOverlay() {
    overlay.hidden = true;
    foConsole.innerHTML = '';
  }

  function consoleLine(text, type) {
    const div = document.createElement('div');
    div.className = 'fo-line' + (type ? ' ' + type : '');
    div.innerHTML = text;
    foConsole.appendChild(div);
    return div;
  }

  async function playTransmission() {
    const first = consoleLine('<span class="fo-arrow">&#9656;</span>./send-message.sh');
    await sleep(260);
    first.classList.add('fo-ok');

    consoleLine('Initializing secure channel...');
    await sleep(240);

    // Progress bar
    const barLine = consoleLine('', 'fo-progress');
    barLine.innerHTML =
      '<span class="fo-bar"><span class="fo-bar-fill"></span></span>' +
      '<span class="fo-pct">0%</span>';
    const fill = barLine.querySelector('.fo-bar-fill');
    const pct  = barLine.querySelector('.fo-pct');
    let p = 0;
    while (p <= 100) {
      p += 12;
      fill.style.width = Math.min(p, 100) + '%';
      pct.textContent = Math.min(p, 100) + '%';
      await sleep(38);
    }

    await sleep(120);
    consoleLine('&#10003; Message encrypted', 'fo-ok');
    await sleep(120);
    consoleLine('&#10003; Transmission complete', 'fo-ok');
    await sleep(120);
    consoleLine('&#10003; Contact request queued', 'fo-ok');
    await sleep(180);
    consoleLine('Connection established successfully.', 'fo-ok');
  }

  async function playFailure() {
    const first = consoleLine('<span class="fo-arrow">&#9656;</span>./send-message.sh');
    await sleep(240);
    first.classList.add('fo-ok');
    await sleep(120);
    consoleLine('! transmission failed', 'fo-progress');
    consoleLine('Unable to establish communication channel.', '');
    consoleLine('Please try again.', '');
  }

  /* ── Submission ──────────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

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

    if (!csrfToken) await fetchCSRFToken();
    if (!csrfToken) {
      showStatus('error', 'Security token unavailable. Please refresh and try again.');
      return;
    }

    var payload = {
      name:    fields.name.value.trim(),
      email:   fields.email.value.trim(),
      subject: fields.subject.value.trim(),
      message: fields.message.value.trim(),
      '_website': '',
    };

    submitBtn.disabled = true;
    submitBtn.classList.add('is-sending');
    showOverlay();

    // Fire the request in parallel; never block the actual submit on the
    // decorative animation.
    const request = fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(payload),
    }).then(async function (res) {
      return {
        ok: res.ok,
        status: res.status,
        body: res.status === 403 ? await res.text() : '',
      };
    }).catch(function () {
      return { ok: false, status: 0 };
    });

    try {
      const result = await Promise.all([playTransmission(), request]);

      if (result[1].ok) {
        resetFormState();
        foSuccess.hidden = false;
        form.classList.add('is-sent');
      } else if (result[1].status === 429) {
        await playFailure();
        foErrMsg.innerHTML = 'Rate limit exceeded.<br/>Please wait a moment and try again.';
        foError.hidden = false;
        form.classList.add('is-sent');
      } else if (result[1].status === 403) {
        await playFailure();
        foErrMsg.innerHTML = 'Security token expired.<br/>Refresh the page and try again.';
        foError.hidden = false;
        form.classList.add('is-sent');
      } else {
        await playFailure();
        foErrMsg.innerHTML = 'Unable to establish communication channel.<br/>Please try again.';
        foError.hidden = false;
        form.classList.add('is-sent');
      }
    } catch (_) {
      // Fallback if anything unexpected throws mid-animation.
      await playFailure();
      foErrMsg.innerHTML = 'Unable to establish communication channel.<br/>Please try again.';
      foError.hidden = false;
      form.classList.add('is-sent');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-sending');
    }
  });

  function resetFormState() {
    form.reset();
    Object.keys(fields).forEach(function (key) {
      const input = fields[key];
      const el    = fieldEls[key];
      if (el) { el.classList.remove('is-valid', 'is-invalid'); }
      if (input) { input.classList.remove('cmd-input--error'); input.removeAttribute('aria-invalid'); }
      const span = errSpan(key);
      if (span) span.textContent = '';
    });
    touched = { name: false, email: false, subject: false, message: false };
    status.className = 'form-status';
    status.textContent = '';
    form.classList.remove('is-sent');
    fetchCSRFToken();
  }

  function formReset() {
    resetFormState();
    hideOverlay();
  }

  if (foAgain) foAgain.addEventListener('click', function () {
    formReset();
    if (fields.name) fields.name.focus();
  });

  if (foRetry) foRetry.addEventListener('click', function () {
    fetchCSRFToken();
    hideOverlay();
    form.classList.remove('is-sent');
    submitBtn.focus();
  });

  /* ── Status fallback (non-overlay messages) ──────────────── */
  function showStatus(type, msg) {
    status.className = 'form-status form-status--' + type;
    status.textContent = msg;
    setTimeout(function () {
      status.textContent = '';
      status.className = 'form-status';
    }, 8000);
  }

  /* ── Cursor glow + micro-tilt on the right terminal ───────── */
  const panel = document.querySelector('.contact-form-panel');
  if (panel && window.matchMedia('(prefers-reduced-motion: reduce)').matches === false
      && window.matchMedia('(pointer: fine)').matches
      && window.innerWidth > 820) {

    let raf = null;

    panel.addEventListener('pointermove', function (e) {
      const rect = panel.getBoundingClientRect();
      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;

      if (raf) return;
      raf = requestAnimationFrame(function () {
        panel.style.setProperty('--glow-x', gx + '%');
        panel.style.setProperty('--glow-y', gy + '%');
        panel.classList.add('has-glow');
        // Fast inline transition beats the 0.6s .reveal transform transition.
        panel.style.transition = 'transform 0.12s ease-out';

        const dx = (e.clientX - rect.left) / rect.width - 0.5;
        const dy = (e.clientY - rect.top) / rect.height - 0.5;
        panel.style.transform =
          'perspective(900px) rotateX(' + (-dy * 2).toFixed(2) + 'deg) rotateY(' + (dx * 2).toFixed(2) + 'deg)';
        raf = null;
      });
    });

    panel.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      panel.classList.remove('has-glow');
      panel.style.transform = '';
      panel.style.transition = '';
    });
  }

})();