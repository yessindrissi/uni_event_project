/* ============================================================
   INSAT Events — app.js
   DOM manipulation, event rendering, theme, QR modal, countdown
   ============================================================ */

'use strict';

// ── Theme Toggle ────────────────────────────────────────────
const Theme = {
  STORAGE_KEY: 'insat_theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.apply(theme);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    });
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.apply(current === 'dark' ? 'light' : 'dark');
  }
};

// ── Scroll Progress Bar ─────────────────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = max > 0 ? `${(scrolled / max) * 100}%` : '0%';
  }, { passive: true });
}

// ── Navbar ──────────────────────────────────────────────────
function initNavbar() {
  // Burger
  const burger = document.querySelector('.nav-burger');
  const navMenu = document.querySelector('.navbar-nav');
  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navbar')) navMenu.classList.remove('open');
    });
  }

  // Update nav based on auth state
  const isLoggedIn = window.INSAT?.Auth?.isLoggedIn();
  const user = window.INSAT?.Auth?.getUser();

  document.querySelectorAll('[data-auth="logged-out"]').forEach(el => {
    el.style.display = isLoggedIn ? 'none' : '';
  });
  document.querySelectorAll('[data-auth="logged-in"]').forEach(el => {
    el.style.display = isLoggedIn ? '' : 'none';
  });

  if (user) {
    document.querySelectorAll('.nav-avatar').forEach(el => {
      const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
      el.textContent = initials || '👤';
    });
    document.querySelectorAll('.nav-user-name').forEach(el => {
      el.textContent = user.first_name || 'My Account';
    });
  }

  // Update navbar points
  updateNavbarPoints();
}

// Update points display in navbar
async function updateNavbarPoints() {
  if (!window.INSAT?.Auth?.isLoggedIn()) return;
  
  try {
    const res = await window.INSAT.getUserEvents();
    const events = res?.data || res || [];
    
    let totalPoints = 0;
    events.forEach(ev => {
      const isPast = new Date(ev.date) < Date.now();
      const points = ev.points || (isPast ? 150 : 0);
      totalPoints += points;
    });
    
    document.querySelectorAll('#nav-points-count').forEach(el => {
      el.textContent = totalPoints;
    });
  } catch (err) {
    console.warn('Failed to update navbar points:', err);
  }
}

// ── Event Card Renderer ─────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getSeatsStatus(remaining, total) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  if (remaining === 0) return { label: 'Fully Booked', class: 'scarce', pct: 100, fillClass: 'scarce' };
  if (pct <= 15)       return { label: `${remaining} left — Hurry!`, class: 'scarce',  pct: Math.min(((total - remaining) / total) * 100, 100), fillClass: 'scarce' };
  if (pct <= 40)       return { label: `${remaining} seats left`,   class: 'limited', pct: Math.min(((total - remaining) / total) * 100, 100), fillClass: 'limited' };
  return               { label: `${remaining} seats available`,  class: 'plenty',  pct: Math.min(((total - remaining) / total) * 100, 100), fillClass: 'plenty' };
}

function createEventCard(event) {
  const seats = getSeatsStatus(event.seats_remaining, event.seats_total);
  const isFree = event.price === 0;
  const isFull = event.seats_remaining === 0;

  const card = document.createElement('article');
  card.className = 'event-card';
  card.dataset.eventId = event.id;
  card.innerHTML = `
    <div class="event-card-image">
      <img
        src="${event.image || `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80`}"
        alt="${event.title}"
        loading="lazy"
      />
      <div class="event-card-image-overlay">
        <span class="badge badge-dark price-badge ${isFree ? 'free' : 'paid'}">
          ${isFree ? 'FREE' : `${event.price} TND`}
        </span>
        ${isFull ? '<span class="badge badge-red">Full</span>' : ''}
      </div>
    </div>
    <div class="event-card-body">
      <div class="event-card-club">
        <span class="event-card-club-dot" style="background:${event.club_color || 'var(--brand-primary)'}"></span>
        ${event.club}
      </div>
      <h3 class="event-card-title">${event.title}</h3>
      <p class="event-card-desc">${event.description}</p>
      <div class="event-card-meta">
        <div class="event-meta-item">
          <span class="icon">📅</span>
          <span>${formatDate(event.date)}</span>
        </div>
        <div class="event-meta-item">
          <span class="icon">🕐</span>
          <span>${formatTime(event.date)}</span>
        </div>
        <div class="event-meta-item">
          <span class="icon">📍</span>
          <span>${event.location}</span>
        </div>
      </div>
      <div class="seats-bar-wrap">
        <div class="seats-bar-label">
          <span>${seats.label}</span>
          <span>${event.seats_total} total</span>
        </div>
        <div class="seats-bar-track">
          <div class="seats-bar-fill ${seats.fillClass}" style="width:${seats.pct}%"></div>
        </div>
      </div>
    </div>
    <div class="event-card-footer">
      ${event.tags?.slice(0,2).map(t => `<span class="badge badge-gray">${t}</span>`).join('') || ''}
      <a href="event-details.html?id=${event.id}" class="btn btn-primary btn-sm" style="margin-left:auto">
        View Details
      </a>
    </div>
  `;
  return card;
}

const ACHIEVEMENT_STORAGE_KEY = 'insat_achievements_unlocked';

function getAchievementDefinitions() {
  return [
    {
      key: 'first_timer',
      title: 'First Timer',
      message: 'You unlocked First Timer! Registered for your first event.',
      condition: ({ eventCount }) => eventCount >= 1,
    },
    {
      key: 'on_a_roll',
      title: 'On a Roll',
      message: 'You unlocked On a Roll! Keep attending events.',
      condition: ({ totalPoints }) => totalPoints >= 300,
    },
    {
      key: 'club_mvp',
      title: 'Club MVP',
      message: 'You unlocked Club MVP! You are a top event attendee.',
      condition: ({ totalPoints }) => totalPoints >= 500,
    },
    {
      key: 'social_butterfly',
      title: 'Social Butterfly',
      message: 'You unlocked Social Butterfly! Registered for 5 events.',
      condition: ({ eventCount }) => eventCount >= 5,
    },
  ];
}

function loadUnlockedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnlockedAchievements(keys) {
  localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(keys));
}

function markAchievementChips(unlockedKeys) {
  document.querySelectorAll('.achievement-chip[data-achievement]').forEach(chip => {
    const key = chip.dataset.achievement;
    const unlocked = unlockedKeys.includes(key);
    chip.classList.toggle('unlocked', unlocked);
    chip.style.opacity = unlocked ? '1' : '0.4';
  });
}

function checkAchievements(stats) {
  const definitions = getAchievementDefinitions();
  const unlocked = loadUnlockedAchievements();
  const newUnlocks = [];

  definitions.forEach(def => {
    if (def.condition(stats) && !unlocked.includes(def.key)) {
      unlocked.push(def.key);
      newUnlocks.push(def);
    }
  });

  if (newUnlocks.length > 0) {
    saveUnlockedAchievements(unlocked);
    newUnlocks.forEach(def => {
      if (window.INSAT?.Toast?.success) {
        window.INSAT.Toast.success(`🏆 ${def.title} unlocked! ${def.message}`, 5000);
      }
    });
  }

  markAchievementChips(unlocked);
}

// ── Events Grid ─────────────────────────────────────────────
async function renderEventsGrid(containerId, params = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Show skeletons
  container.innerHTML = Array(6).fill(`
    <div class="event-card">
      <div class="event-card-image skeleton"></div>
      <div class="event-card-body" style="gap:.75rem">
        <div class="skeleton" style="height:12px;width:60%"></div>
        <div class="skeleton" style="height:20px;width:85%"></div>
        <div class="skeleton" style="height:14px;width:100%"></div>
        <div class="skeleton" style="height:14px;width:75%"></div>
      </div>
    </div>
  `).join('');

  try {
    const res = await window.INSAT.getEvents(params);
    const events = res?.data || res || [];

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">No events found</div>
          <p class="empty-state-desc">Try adjusting your filters or check back later.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    events.forEach((ev, i) => {
      const card = createEventCard(ev);
      card.style.animationDelay = `${i * 60}ms`;
      card.classList.add('page-enter');
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Failed to load events</div>
        <p class="empty-state-desc">${err.message}</p>
      </div>
    `;
  }
}

// ── Recommended Row ─────────────────────────────────────────
async function renderRecommendedRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const user = window.INSAT?.Auth?.getUser();
  const academicYear = user?.academic_year || null;

  try {
    const res = await window.INSAT.getEvents();
    let events = res?.data || res || [];

    if (academicYear) {
      events = events.filter(e =>
        !e.recommended_for || e.recommended_for.includes(academicYear)
      );
    }

    events = events.slice(0, 5);

    container.innerHTML = '';
    events.forEach(ev => {
      const card = createEventCard(ev);
      container.appendChild(card);
    });
  } catch {
    container.innerHTML = '<p class="text-muted" style="padding:1rem">Could not load recommendations.</p>';
  }
}

const EventFilters = {
  category: '',
  search: '',
};

function getActiveEventFilters() {
  const params = {};
  if (EventFilters.category) params.category = EventFilters.category;
  if (EventFilters.search) params.search = EventFilters.search;
  return params;
}

// ── Filter Chips ─────────────────────────────────────────────
function initFilterChips(eventsContainerId) {
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      EventFilters.category = chip.dataset.filter === 'all' ? '' : chip.dataset.filter;
      renderEventsGrid(eventsContainerId, getActiveEventFilters());
    });
  });
}

// ── Search ───────────────────────────────────────────────────
function initSearch(eventsContainerId) {
  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return;

  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      EventFilters.search = searchInput.value.trim();
      renderEventsGrid(eventsContainerId, getActiveEventFilters());
    }, 400);
  });
}

// ── Countdown Timer ──────────────────────────────────────────
function startCountdown(targetDate, selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  function update() {
    const diff = new Date(targetDate) - Date.now();
    if (diff <= 0) {
      el.innerHTML = '<div class="countdown-cell" style="grid-column:1/-1"><div class="countdown-num">Event Started</div></div>';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    el.innerHTML = `
      ${[['Days', d], ['Hours', h], ['Mins', m], ['Secs', s]].map(([unit, val]) => `
        <div class="countdown-cell">
          <div class="countdown-num">${String(val).padStart(2,'0')}</div>
          <div class="countdown-unit">${unit}</div>
        </div>
      `).join('')}
    `;
  }

  update();
  return setInterval(update, 1000);
}

// ── QR Code Modal ────────────────────────────────────────────
function showQRModal(event, ticketId, onClose) {
  const existing = document.getElementById('qr-modal');
  if (existing) existing.remove();

  const ticketCode = ticketId || `TKT-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const qrContent = `INSAT|${event?.id || 'EVT'}|${ticketCode}|${Date.now()}`;

  // Generate simple QR placeholder (could integrate qrcode.js library)
  const qrSize = 180;
  const qrSvg = generateSimpleQR(qrContent, qrSize);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'qr-modal';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:380px;text-align:center">
      <button class="modal-close" aria-label="Close">✕</button>
      <h2 style="font-family:'DM Serif Display',serif;font-size:1.5rem;margin-bottom:.25rem">Your Ticket 🎟️</h2>
      <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:.5rem">${event?.title || 'Event'}</p>
      <div class="qr-canvas-wrap">
        ${qrSvg}
      </div>
      <div class="qr-ticket-id">${ticketCode}</div>
      <p class="qr-ticket-code">${qrContent.slice(0,32)}…</p>
      <div style="margin-top:1.5rem;display:flex;gap:.75rem;justify-content:center">
        <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print</button>
        <button class="btn btn-primary btn-sm" id="close-qr-btn">Done</button>
      </div>
    </div>
  `;

  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#close-qr-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.body.appendChild(overlay);
}

// Simple SVG QR-code placeholder (real implementation uses qrcode.js)
function generateSimpleQR(content, size) {
  // This generates a visually representative "QR-style" placeholder SVG.
  // In production, replace with: https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
  const cells = 21;
  const cellSize = size / cells;

  // Deterministic pattern based on content hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0;
  }

  let rects = '';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Position pattern corners (always dark)
      const inTopLeft     = (r < 7 && c < 7);
      const inTopRight    = (r < 7 && c >= cells - 7);
      const inBottomLeft  = (r >= cells - 7 && c < 7);

      let dark = false;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const rr = inTopRight ? r : r;
        const cc = inTopRight ? c - (cells - 7) : inBottomLeft ? c : c;
        const rLocal = inBottomLeft ? r - (cells - 7) : r;
        dark = (rr === 0 || rr === 6 || cc === 0 || cc === 6 ||
               (rLocal >= 1 && rLocal <= 5 && cc >= 1 && cc <= 5 &&
                !(rLocal >= 2 && rLocal <= 4 && cc >= 2 && cc <= 4)));
        if (inTopRight) dark = (r === 0 || r === 6 || (c - (cells-7)) === 0 || (c - (cells-7)) === 6 || (r >= 2 && r <= 4 && c >= cells-5 && c <= cells-3));
        if (inBottomLeft) dark = ((r - (cells-7)) === 0 || (r - (cells-7)) === 6 || c === 0 || c === 6 || ((r >= cells-5) && (r <= cells-3) && c >= 2 && c <= 4));
      } else {
        dark = ((Math.abs(hash * (r + 1) * (c + 1)) % 3) === 0);
      }

      if (dark) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius:4px">${rects}</svg>`;
}

// ── Register for Event ───────────────────────────────────────
async function registerForEvent(eventId) {
  if (!window.INSAT.Auth.isLoggedIn()) {
    window.location.href = `login.html?redirect=event-details.html?id=${eventId}`;
    return;
  }

  const btn = document.getElementById('register-btn');
  if (btn) window.INSAT.setButtonLoading(btn, true, 'Registering…');

  try {
    const res = await window.INSAT.EventsAPI.register(eventId);
    window.INSAT.Toast.success('🎉 Registered successfully!');

    // Show QR modal with callback to refresh page when closed
    const eventRes = await window.INSAT.getEvent(eventId);
    const event = eventRes?.data || eventRes;
    showQRModal(event, res?.ticket_id, () => {
      window.location.reload();
    });

    if (btn) {
      btn.textContent = '✅ Registered';
      btn.disabled = true;
    }
  } catch (err) {
    if (btn) window.INSAT.setButtonLoading(btn, false, 'Register Now');
    window.INSAT.Toast.error(err.message || 'Registration failed. Please try again.');
  }
}

// ── My Events Page ───────────────────────────────────────────
async function renderMyEvents() {
  const container = document.getElementById('my-events-list');
  if (!container) return;

  if (!window.INSAT.Auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=my-events.html';
    return;
  }

  container.innerHTML = `<div class="ticket-card skeleton" style="height:120px"></div>`.repeat(3);

  try {
    const res = await window.INSAT.getUserEvents();
    const events = res?.data || res || [];

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎟️</div>
          <div class="empty-state-title">No registered events yet</div>
          <p class="empty-state-desc">Explore events and register to see them here.</p>
          <a href="index.html" class="btn btn-primary" style="margin-top:1rem">Browse Events</a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    let totalPoints = 0;

    events.forEach(ev => {
      const isPast = new Date(ev.date) < Date.now();
      const points = ev.points || (isPast ? 150 : 0);
      totalPoints += points;

      const card = document.createElement('div');
      card.className = 'ticket-card';
      card.innerHTML = `
        <div class="ticket-card-accent"></div>
        <div class="ticket-card-image">
          <img src="${ev.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&q=70'}" alt="${ev.title}" loading="lazy"/>
        </div>
        <div class="ticket-card-body">
          <div class="event-card-club" style="font-size:.7rem">
            <span class="event-card-club-dot" style="background:${ev.club_color||'var(--brand-primary)'}"></span>
            ${ev.club}
          </div>
          <h3 style="font-family:'DM Serif Display',serif;font-size:1.05rem;line-height:1.3">${ev.title}</h3>
          <div class="event-meta-item" style="font-size:.78rem">
            <span class="icon">📅</span>
            <span>${formatDate(ev.date)} · ${formatTime(ev.date)}</span>
          </div>
          <div class="event-meta-item" style="font-size:.78rem">
            <span class="icon">📍</span>
            <span>${ev.location}</span>
          </div>
          ${isPast ? `<span class="badge badge-green" style="width:fit-content">Attended · +${points} pts</span>` : `<span class="badge badge-blue" style="width:fit-content">Upcoming</span>`}
          <div class="ticket-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="showQRModal(${JSON.stringify(ev).replace(/"/g,"'")}, '${ev.ticket_id || ''}')">
              📱 QR Ticket
            </button>
            <a href="event-details.html?id=${ev.id}" class="btn btn-secondary btn-sm">View</a>
            ${!isPast ? `<button class="btn btn-danger btn-sm" data-cancel="${ev.id}">Cancel</button>` : ''}
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Update points widget
    const pointsEl = document.getElementById('total-points');
    if (pointsEl) {
      pointsEl.textContent = totalPoints;
      const progressFill = document.querySelector('.points-progress-fill');
      if (progressFill) {
        const nextMilestone = Math.ceil(totalPoints / 500) * 500;
        progressFill.style.width = `${(totalPoints % 500) / 500 * 100}%`;
      }
    }

    // Update navbar points
    updateNavbarPoints();

    checkAchievements({ totalPoints, eventCount: events.length });

    // Cancel buttons
    container.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.cancel;
        if (!confirm('Cancel your registration for this event?')) return;
        try {
          await window.INSAT.EventsAPI.cancel(id);
          window.INSAT.Toast.success('Registration cancelled.');
          renderMyEvents();
        } catch (err) {
          window.INSAT.Toast.error(err.message || 'Could not cancel. Try again.');
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

// ── Protected Route Guard ────────────────────────────────────
function requireAuth(redirectTo = 'login.html') {
  if (!window.INSAT?.Auth?.isLoggedIn()) {
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }
  return true;
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initScrollProgress();
  initNavbar();

  // Init chat widget wiring
  if (typeof initChatWidget === 'function') initChatWidget();

  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => Theme.toggle());
  });

  // Page-specific init
  const page = document.body.dataset.page;

  if (page === 'home') {
    renderEventsGrid('events-grid', getActiveEventFilters());
    renderRecommendedRow('recommended-row');
    initFilterChips('events-grid');
    initSearch('events-grid');
  }

  if (page === 'my-events') {
    renderMyEvents();
  }
});

// ---------------------- Chat / Socket.IO client ----------------------
let __insat_socket = null;
function createChatWidgetDom() {
  if (document.getElementById('chat-widget')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="chat-widget" style="position:fixed;right:18px;bottom:18px;width:360px;max-width:90%;background:var(--bg-surface);border:1px solid var(--border);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.12);display:none;flex-direction:column;overflow:hidden;z-index:1200;font-family:Inter,system-ui,sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--bg-muted)">
        <div>
          <div style="font-weight:700;font-size:.95rem;letter-spacing:.01em">Event Chat</div>
          <div id="chat-room-status" style="font-size:.77rem;color:var(--text-muted);margin-top:2px">Connected attendees only</div>
        </div>
        <button id="chat-close" class="btn btn-ghost btn-sm">✖</button>
      </div>
      <div id="chat-messages" style="padding:12px;max-height:320px;overflow:auto;display:flex;flex-direction:column;gap:10px;background:var(--bg-surface)"></div>
      <div style="display:flex;gap:10px;padding:12px;border-top:1px solid var(--border);background:var(--bg-muted)">
        <input id="chat-input" type="text" placeholder="Write a message..." style="flex:1;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-body);color:var(--text-primary);" />
        <button id="chat-send" class="btn btn-primary btn-sm">Send</button>
      </div>
    </div>`;
  document.body.appendChild(wrapper);
}

function initChatWidget() {
  createChatWidgetDom();
  const connectBtn = document.getElementById('socket-connect-btn');
  const chatWidget = document.getElementById('chat-widget');
  const chatClose = document.getElementById('chat-close');
  const chatSend = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  
  const getCacheKey = () => `chat_history_${getCurrentEventId()}`;
  
  function saveMessageToCache(msg) {
    try {
      const key = getCacheKey();
      const cached = JSON.parse(localStorage.getItem(key) || '[]');
      // Avoid duplicates
      if (!cached.find(m => m.id === msg.id)) {
        cached.push(msg);
        // Keep only last 100 messages
        if (cached.length > 100) cached.shift();
        localStorage.setItem(key, JSON.stringify(cached));
      }
    } catch (e) { console.warn('cache save error', e); }
  }
  
  function loadCachedMessages() {
    try {
      const key = getCacheKey();
      const cached = JSON.parse(localStorage.getItem(key) || '[]');
      const user = window.INSAT?.Auth?.getUser?.() || {};
      if (chatMessages) chatMessages.innerHTML = '';
      cached.forEach(m => {
        const isOwn = user.id && m.user_id && user.id === m.user_id;
        addMessageOnce(m, isOwn);
      });
    } catch (e) { console.warn('cache load error', e); }
  }
  
  // Load cached messages on init
  loadCachedMessages();

  function addMessage(msg, own = false) {
    if (!chatMessages) return;
    const el = document.createElement('div');
    el.style.maxWidth = '80%';
    el.style.padding = '8px';
    el.style.borderRadius = '8px';
    el.style.background = own ? 'rgba(59,130,246,.12)' : 'var(--bg-muted)';
    el.style.alignSelf = own ? 'flex-end' : 'flex-start';
    el.innerHTML = `<div style="font-size:.78rem;font-weight:600;margin-bottom:4px">${escapeHtml(msg.from || 'Anonymous')}</div><div style="font-size:.9rem">${escapeHtml(msg.text)}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addMessageOnce(msg, own = false) {
    if (!chatMessages) return;
    
    // Convert ID to string for consistent handling
    const msgId = String(msg.id);
    
    // For messages with real IDs, check if already displayed
    if (msgId && !msgId.startsWith('temp_')) {
      const existing = chatMessages?.querySelector(`[data-msg-id="${msgId}"]`);
      if (existing) return;
    }
    
    // For temp messages coming back from server with real ID, update the existing element
    if (msgId && !msgId.startsWith('temp_')) {
      const tempElement = chatMessages?.querySelector('[data-msg-id^="temp_"]');
      if (tempElement && own) {
        tempElement.dataset.msgId = msgId;
        return;
      }
    }
    
    const el = document.createElement('div');
    el.dataset.msgId = msgId;
    el.style.maxWidth = '80%';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '12px';
    el.style.wordWrap = 'break-word';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    
    if (own) {
      el.style.background = 'var(--brand-primary, #1a56e8)';
      el.style.color = '#fff';
      el.style.alignSelf = 'flex-end';
    } else {
      el.style.background = 'var(--bg-muted)';
      el.style.color = 'var(--text-primary)';
      el.style.alignSelf = 'flex-start';
    }
    
    el.innerHTML = `<div style="font-size:.78rem;font-weight:600;margin-bottom:4px;opacity:0.9">${escapeHtml(msg.from || 'Anonymous')}</div><div style="font-size:.9rem">${escapeHtml(msg.text)}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Save to cache
    if (msgId && !msgId.startsWith('temp_')) {
      saveMessageToCache(msg);
    }
  }

  function ensureSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client not loaded');
      return null;
    }
    if (__insat_socket && __insat_socket.connected) return __insat_socket;
    const url = window.SOCKET_SERVER_URL || 'http://localhost:3000';
    __insat_socket = io(url, { reconnectionAttempts: 2, timeout: 5000 });
    __insat_socket.on('connect', () => {
      if (window.INSAT?.Toast?.success) window.INSAT.Toast.success('Chat connected');
      const user = window.INSAT?.Auth?.getUser?.() || { name: 'Guest', id: null };
      const eventId = getCurrentEventId();
      __insat_socket.emit('join', { user: user.name || 'Guest', user_id: user.id || null, event_id: eventId });
    });
    __insat_socket.on('message', (m) => {
      const user = window.INSAT?.Auth?.getUser?.() || {};
      const isOwn = user.id && m.user_id && user.id === m.user_id;
      addMessageOnce(m, isOwn);
      // Save to cache
      if (m.id && !m.id.startsWith('temp_')) {
        saveMessageToCache(m);
      }
    });
    __insat_socket.on('history', (arr) => {
      try {
        if (chatMessages) chatMessages.innerHTML = '';
        const user = window.INSAT?.Auth?.getUser?.() || {};
        (arr || []).forEach(m => {
          const isOwn = user.id && m.user_id && user.id === m.user_id;
          addMessageOnce(m, isOwn);
          // Save to cache
          saveMessageToCache(m);
        });
      } catch (e) { console.warn('history render error', e); }
    });
    __insat_socket.on('disconnect', () => {
      if (window.INSAT?.Toast?.info) window.INSAT.Toast.info('Chat disconnected');
    });
    __insat_socket.on('not_allowed', (payload) => {
      if (window.INSAT?.Toast?.error) window.INSAT.Toast.error(payload?.message || 'Access denied to this chat');
      if (chatWidget) chatWidget.style.display = 'none';
      if (connectBtn) { connectBtn.textContent = 'Connect Chat'; connectBtn.disabled = false; }
    });
    return __insat_socket;
  }

  // Support both direct button and delegated clicks if button is inserted later
  function onConnectClicked(btnEl) {
    if (!btnEl) return;
    if (!window.INSAT?.Auth?.isLoggedIn?.() ) {
      const redirectPath = window.location.pathname + window.location.search;
      window.location.href = 'login.html?redirect=' + encodeURIComponent(redirectPath);
      return;
    }
    const eventId = getCurrentEventId();
    if (!eventId) {
      if (window.INSAT?.Toast?.error) window.INSAT.Toast.error('Event chat is only available from an event details page.');
      return;
    }
    btnEl.textContent = 'Connecting...';
    btnEl.disabled = true;
    if (chatWidget) chatWidget.style.display = 'flex';
    const s = ensureSocket();
    if (!s) {
      if (window.INSAT?.Toast?.error) window.INSAT.Toast.error('Chat failed to start');
      btnEl.textContent = 'Connect Chat';
      btnEl.disabled = false;
      return;
    }
    // once connected (or already connected) update UI
    if (s.connected) {
      btnEl.textContent = 'Connected';
      focusChatInput();
    } else {
      s.once('connect', () => { btnEl.textContent = 'Connected'; focusChatInput(); });
      s.once('connect_error', () => { btnEl.textContent = 'Connect Chat'; btnEl.disabled = false; });
    }
  }

  connectBtn?.addEventListener('click', () => onConnectClicked(connectBtn));
  document.addEventListener('click', (e) => {
    const target = e.target.closest && e.target.closest('#socket-connect-btn');
    if (target) onConnectClicked(target);
  });

  function focusChatInput() {
    setTimeout(() => {
      chatInput?.focus();
    }, 120);
  }

  chatClose?.addEventListener('click', () => {
    if (chatWidget) chatWidget.style.display = 'none';
    if (__insat_socket) {
      __insat_socket.disconnect();
      __insat_socket = null;
      if (connectBtn) { connectBtn.textContent = 'Connect Chat'; connectBtn.disabled = false; }
    }
  });

  chatSend?.addEventListener('click', () => {
    const text = chatInput?.value?.trim();
    if (!text) return;
    const user = window.INSAT?.Auth?.getUser?.() || { name: 'Guest' };
    const payload = {
      from: user.name || user.first_name || 'Guest',
      text,
      event_id: getCurrentEventId(),
      user_id: getCurrentUserId(),
    };
    if (__insat_socket && __insat_socket.connected) {
      // Display message immediately on the right
      addMessageOnce({ ...payload, id: `temp_${Date.now()}` }, true);
      __insat_socket.emit('message', payload);
      chatInput.value = '';
    } else {
      if (window.INSAT?.Toast?.error) window.INSAT.Toast.error('Not connected to chat');
    }
  });

  chatInput?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') chatSend?.click(); });
}

function getCurrentUserId() {
  const user = window.INSAT?.Auth?.getUser?.();
  if (!user) return null;
  return user.id || user.user_id || null;
}

function getCurrentEventId() {
  // sources: explicit global variable, body dataset, or query param `id`
  if (window.EVENT_CHAT_ID) return window.EVENT_CHAT_ID;
  const bodyId = document.body?.dataset?.eventId;
  if (bodyId) return bodyId;
  const q = new URLSearchParams(window.location.search).get('id');
  return q || null;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>\"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]; });
}

// ── Exports ──────────────────────────────────────────────────
window.INSAT = window.INSAT || {};
Object.assign(window.INSAT, {
  Theme,
  showQRModal,
  registerForEvent,
  renderMyEvents,
  requireAuth,
  startCountdown,
  createEventCard,
  formatDate,
  formatTime,
  getSeatsStatus,
});