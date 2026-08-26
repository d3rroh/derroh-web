/* ═══════════════════════════════════════════════════════════════
   DERRICK-OPS  |  Contact Form Handler
   Client-side validation + secure submission to /api/contact
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const form     = document.getElementById('contact-form');
  const status   = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');
  if (!form || !status || !submitBtn) return;

  const fields = {
    name:    document.getElementById('f-name'),
    email:   document.getElementById('f-email'),
    subject: document.getElementById('f-subject'),
    message: document.getElementById('f-message'),
  };

  const csrfInput = document.getElementById('f-csrf');

  /* ── CSRF Token ──────────────────────────────────────────── */
  let csrfToken = '';

  async function fetchCSRFToken() {
    try {
      const res = await fetch('/api/csrf-token');
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.token || '';
        if (csrfInput) csrfInput.value = csrfToken;
      }
    } catch (_) {
      // CSRF endpoint unavailable — form will fail server-side check
    }
  }

  fetchCSRFToken();

  /* ── Validation ──────────────────────────────────────────── */
  const validators = {
    name: function (v) {
      if (!v) return 'Name is required.';
      if (v.length > 120) return 'Name must be under 120 characters.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Email is required.';
      if (v.length > 254) return 'Email must be under 254 characters.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    subject: function (v) {
      if (!v) return 'Subject is required.';
      if (v.length > 200) return 'Subject must be under 200 characters.';
      return '';
    },
    message: function (v) {
      if (!v) return 'Message is required.';
      if (v.length < 10) return 'Message must be at least 10 characters.';
      if (v.length > 10000) return 'Message must be under 10,000 characters.';
      return '';
    },
  };

  function validateField(key) {
    const input = fields[key];
    if (!input) return '';
    const err = validators[key](input.value.trim());
    const row = input.closest('.cmd-field');
    const errEl = row ? row.querySelector('.cmd-field-error') : null;

    if (err) {
      input.classList.add('cmd-input--error');
      if (row && !errEl) {
        const span = document.createElement('span');
        span.className = 'cmd-field-error';
        span.textContent = err;
        row.appendChild(span);
      } else if (errEl) {
        errEl.textContent = err;
      }
    } else {
      input.classList.remove('cmd-input--error');
      if (errEl) errEl.remove();
    }
    return err;
  }

  /* ── Live validation on blur ─────────────────────────────── */
  Object.keys(fields).forEach(function (key) {
    var input = fields[key];
    if (!input) return;
    input.addEventListener('blur', function () {
      validateField(key);
    });
    input.addEventListener('input', function () {
      // Clear error on edit
      if (input.classList.contains('cmd-input--error')) {
        validateField(key);
      }
    });
  });

  /* ── Form Submission ─────────────────────────────────────── */
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate all fields
    var hasError = false;
    Object.keys(fields).forEach(function (key) {
      if (validateField(key)) hasError = true;
    });
    if (hasError) return;

    // Check CSRF token
    if (!csrfToken) {
      await fetchCSRFToken();
    }
    if (!csrfToken) {
      showStatus('error', 'Security token unavailable. Please refresh and try again.');
      return;
    }

    // Collect data — only safe, validated fields
    var payload = {
      name:    fields.name.value.trim(),
      email:   fields.email.value.trim(),
      subject: fields.subject.value.trim(),
      message: fields.message.value.trim(),
      '_website': '',  // honeypot — always empty
    };

    // Disable button
    submitBtn.disabled = true;
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>sending…</span>';

    try {
      var res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus('success', 'Message sent successfully. Thank you!');
        form.reset();
        // Refresh CSRF token after successful submission
        fetchCSRFToken();
      } else if (res.status === 403) {
        showStatus('error', 'Security token expired. Please refresh the page.');
        fetchCSRFToken();
      } else if (res.status === 429) {
        showStatus('error', 'Too many requests. Please try again later.');
      } else if (res.status === 422) {
        showStatus('error', 'Please check your input and try again.');
      } else {
        showStatus('error', 'Failed to send message. Please try again later.');
      }
    } catch (err) {
      showStatus('error', 'Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  /* ── Status Display ──────────────────────────────────────── */
  function showStatus(type, msg) {
    status.className = 'form-status form-status--' + type;
    status.textContent = msg;
    // Auto-clear after 8s
    setTimeout(function () {
      status.textContent = '';
      status.className = 'form-status';
    }, 8000);
  }

})();
