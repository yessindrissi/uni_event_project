/* ============================================================
   INSAT Events — auth.js
   Login / Register fetch logic, form validation, toast system
   ============================================================ */

'use strict';

// ── Toast Notification System ───────────────────────────────
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const icons = {
      success: '✅',
      error:   '❌',
      info:    'ℹ️',
      warning: '⚠️',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Dismiss">✕</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(toast));
    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  dismiss(toast) {
    if (!toast || toast.classList.contains('exiting')) return;
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  },

  success: (msg, d) => Toast.show(msg, 'success', d),
  error:   (msg, d) => Toast.show(msg, 'error',   d),
  info:    (msg, d) => Toast.show(msg, 'info',     d),
  warning: (msg, d) => Toast.show(msg, 'warning',  d),
};

// ── Form Helpers ────────────────────────────────────────────
function setButtonLoading(btn, loading, text = null) {
  if (!btn) return;
  const textEl = btn.querySelector('.btn-text') || btn;
  const spinner = btn.querySelector('.spinner');

  btn.disabled = loading;
  btn.classList.toggle('loading', loading);

  if (spinner) {
    spinner.style.display = loading ? 'block' : 'none';
  }
  if (text && textEl !== btn) {
    textEl.textContent = text;
  }
}

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('error');
  const errEl = input.closest('.form-group')?.querySelector('.form-error');
  if (errEl) errEl.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));
  form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}

function getFormData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = value.trim();
  });
  return data;
}

// Handle server-side validation errors (Laravel-style)
function handleValidationErrors(err) {
  const errors = err?.data?.errors;
  if (errors && typeof errors === 'object') {
    Object.entries(errors).forEach(([field, messages]) => {
      const msg = Array.isArray(messages) ? messages[0] : messages;
      setFieldError(field, msg);
    });
    return true;
  }
  return false;
}

// ── Password Strength ───────────────────────────────────────
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0–4
}

// ── Register Logic ──────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  clearFieldErrors(form);

  const data = getFormData(form);
  const submitBtn = form.querySelector('[type="submit"]');

  // Client-side validation
  let hasError = false;

  if (!data.first_name) { setFieldError('first_name', 'First name is required.'); hasError = true; }
  if (!data.last_name)  { setFieldError('last_name',  'Last name is required.');  hasError = true; }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    setFieldError('email', 'Please enter a valid email address.');
    hasError = true;
  }
  if (!data.birthdate)  { setFieldError('birthdate', 'Birthdate is required.');   hasError = true; }
  if (!data.academic_year) { setFieldError('academic_year', 'Please select your academic year.'); hasError = true; }
  if (data.password.length < 8) {
    setFieldError('password', 'Password must be at least 8 characters.');
    hasError = true;
  }
  if (data.password !== data.password_confirmation) {
    setFieldError('password_confirmation', 'Passwords do not match.');
    hasError = true;
  }

  if (hasError) {
    Toast.error('Please fix the errors below.', 3000);
    return;
  }

  setButtonLoading(submitBtn, true, 'Creating account…');

  try {
    const res = await window.INSAT.api.post(window.INSAT.ENDPOINTS.register, {
      first_name:            data.first_name,
      last_name:             data.last_name,
      email:                 data.email,
      birthdate:             data.birthdate,
      academic_year:         data.academic_year,
      password:              data.password,
      password_confirmation: data.password_confirmation,
    });

    // Store token and user
    const token = res.token || res.data?.token || res.access_token;
    const user  = res.user  || res.data?.user  || res.data;

    if (token) {
      window.INSAT.Auth.setToken(token);
      window.INSAT.Auth.setUser(user);
    }

    Toast.success('🎉 Account created! Welcome to INSAT Events.', 5000);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Create Account');

    const handled = handleValidationErrors(err);
    if (!handled) {
      Toast.error(err.message || 'Registration failed. Please try again.');
    }
  }
}

// ── Login Logic ─────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  clearFieldErrors(form);

  const data = getFormData(form);
  const submitBtn = form.querySelector('[type="submit"]');

  // Client-side validation
  let hasError = false;

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    setFieldError('email', 'Please enter a valid email address.');
    hasError = true;
  }
  if (!data.password) {
    setFieldError('password', 'Password is required.');
    hasError = true;
  }

  if (hasError) return;

  setButtonLoading(submitBtn, true, 'Signing in…');

  try {
    const res = await window.INSAT.api.post(window.INSAT.ENDPOINTS.login, {
      email:    data.email,
      password: data.password,
    });

    const token = res.token || res.data?.token || res.access_token;
    const user  = res.user  || res.data?.user  || res.data;

    window.INSAT.Auth.setToken(token);
    window.INSAT.Auth.setUser(user);

    Toast.success(`Welcome back, ${user?.first_name || 'there'}! 👋`, 3000);

    const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
    setTimeout(() => {
      window.location.href = redirect;
    }, 1000);

  } catch (err) {
    setButtonLoading(submitBtn, false, 'Sign In');

    if (err.status === 401 || err.status === 422) {
      Toast.error('Invalid email or password. Please try again.');
      setFieldError('email', ' ');
      setFieldError('password', 'Incorrect credentials.');
    } else {
      const handled = handleValidationErrors(err);
      if (!handled) Toast.error(err.message || 'Login failed. Please try again.');
    }
  }
}

// ── Password toggle visibility ───────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.form-input-wrap').querySelector('.form-input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁️';
    });
  });
}

// ── Password strength indicator ──────────────────────────────
function initPasswordStrength() {
  const pwInput = document.getElementById('password');
  const strengthBar = document.getElementById('pw-strength-bar');
  const strengthLabel = document.getElementById('pw-strength-label');
  if (!pwInput || !strengthBar) return;

  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#dc2626', '#f54b64', '#f59e0b', '#22c55e', '#16a34a'];
  const widths = ['10%', '25%', '55%', '78%', '100%'];

  pwInput.addEventListener('input', () => {
    const score = checkPasswordStrength(pwInput.value);
    strengthBar.style.width = widths[score] || '0%';
    strengthBar.style.background = colors[score] || colors[0];
    if (strengthLabel) strengthLabel.textContent = labels[score] || '';
  });
}

// ── Logout ──────────────────────────────────────────────────
function handleLogout() {
  // Attempt server-side logout (fire-and-forget)
  if (window.INSAT?.Auth?.isLoggedIn()) {
    window.INSAT.api.post(window.INSAT.ENDPOINTS.logout, {}).catch(() => {});
  }
  window.INSAT.Auth.clear();
  Toast.info('You have been signed out.');
  setTimeout(() => { window.location.href = 'login.html'; }, 800);
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });

  initPasswordToggles();
  initPasswordStrength();

  // Listen for global auth:logout events (token expiry)
  window.addEventListener('auth:logout', () => {
    Toast.warning('Your session has expired. Please sign in again.');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
  });
});

// ── Exports ─────────────────────────────────────────────────
window.INSAT = window.INSAT || {};
Object.assign(window.INSAT, { Toast, handleLogout, setButtonLoading });