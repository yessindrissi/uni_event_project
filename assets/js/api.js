/* ============================================================
   INSAT Events — api.js
   Fetch wrappers, endpoint configs, response handling
   ============================================================ */

'use strict';

// ── Base Configuration ──────────────────────────────────────
const API_BASE = 'http://localhost/web/backend';

const ENDPOINTS = {
  // Auth
  register:     `${API_BASE}/auth/register`,
  login:        `${API_BASE}/auth/login`,
  logout:       `${API_BASE}/auth/logout`,

  // Events
  events:       `${API_BASE}/events`,
  event:        (id)      => `${API_BASE}/events/${id}`,
  registerEvent:(id)      => `${API_BASE}/events/${id}/register`,
  cancelEvent:  (id)      => `${API_BASE}/events/${id}/cancel`,

  // User
  me:           `${API_BASE}/users/me`,
  myEvents:     `${API_BASE}/users/me/events`,
};

// ── Token Management ────────────────────────────────────────
const Auth = {
  getToken:    () => localStorage.getItem('insat_token'),
  setToken:    (t) => localStorage.setItem('insat_token', t),
  removeToken: () => localStorage.removeItem('insat_token'),

  getUser:     () => {
    try { return JSON.parse(localStorage.getItem('insat_user')); }
    catch { return null; }
  },
  setUser:     (u) => localStorage.setItem('insat_user', JSON.stringify(u)),
  removeUser:  () => localStorage.removeItem('insat_user'),

  isLoggedIn:  () => !!localStorage.getItem('insat_token'),

  clear: () => {
    Auth.removeToken();
    Auth.removeUser();
  }
};

// ── Core Fetch Wrapper ──────────────────────────────────────
async function apiFetch(url, options = {}) {
  const token = Auth.getToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      // Normalize error shape
      const errMsg =
        (isJson && data.message) ||
        (isJson && data.error) ||
        (isJson && Object.values(data.errors || {})[0]?.[0]) ||
        `Request failed (${res.status})`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.status === 401) {
      // Token expired → auto-logout
      Auth.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    throw err;
  }
}

// ── Convenience Methods ─────────────────────────────────────
const api = {
  get:    (url, opts = {}) => apiFetch(url, { method: 'GET',    ...opts }),
  post:   (url, body, opts = {}) => apiFetch(url, { method: 'POST',   body, ...opts }),
  put:    (url, body, opts = {}) => apiFetch(url, { method: 'PUT',    body, ...opts }),
  patch:  (url, body, opts = {}) => apiFetch(url, { method: 'PATCH',  body, ...opts }),
  delete: (url, opts = {}) => apiFetch(url, { method: 'DELETE', ...opts }),
};

// ── Event API ───────────────────────────────────────────────
const EventsAPI = {
  /**
   * GET /events
   * Optional query params: ?category=&search=&page=
   */
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.get(qs ? `${ENDPOINTS.events}?${qs}` : ENDPOINTS.events);
  },

  /** GET /events/{id} */
  get(id) {
    return api.get(ENDPOINTS.event(id));
  },

  /** POST /events/{id}/register */
  register(id) {
    return api.post(ENDPOINTS.registerEvent(id), {});
  },

  /** DELETE /events/{id}/register */
  cancel(id) {
    return api.delete(ENDPOINTS.cancelEvent(id));
  },
};

// ── User API ────────────────────────────────────────────────
const UserAPI = {
  /** GET /users/me */
  me() {
    return api.get(ENDPOINTS.me);
  },

  /** GET /users/me/events */
  myEvents() {
    return api.get(ENDPOINTS.myEvents);
  },
};

// ── Mock Data (development fallback) ────────────────────────
// Used when the backend is unavailable (CORS, network, etc.)
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'IEEE INSAT Tech Summit 2025',
    club: 'IEEE INSAT',
    club_color: '#1a56e8',
    date: '2025-09-15T09:00:00',
    end_date: '2025-09-15T18:00:00',
    location: 'Amphithéâtre INSAT, Tunis',
    price: 0,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
    description: 'The biggest technology summit at INSAT, bringing together students, professors, and industry leaders for a day of talks, workshops and networking.',
    seats_total: 200,
    seats_remaining: 47,
    category: 'Technology',
    tags: ['AI', 'Embedded', 'Web Dev'],
    recommended_for: ['1st Year', '2nd Year', '3rd Year'],
  },
  {
    id: 2,
    title: 'Design Thinking Workshop',
    club: 'INSAT Junior Enterprise',
    club_color: '#f54b64',
    date: '2025-08-28T14:00:00',
    end_date: '2025-08-28T17:30:00',
    location: 'Salle E3, INSAT',
    price: 5,
    image: 'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?w=600&q=80',
    description: 'An interactive workshop on human-centered design thinking methodology. Learn to solve real problems creatively.',
    seats_total: 40,
    seats_remaining: 8,
    category: 'Workshop',
    tags: ['Design', 'Entrepreneurship'],
    recommended_for: ['2nd Year', '3rd Year'],
  },
  {
    id: 3,
    title: 'Ramadan Cultural Night',
    club: 'INSAT Cultural Club',
    club_color: '#16a34a',
    date: '2025-03-10T19:30:00',
    end_date: '2025-03-10T23:00:00',
    location: 'Foyer INSAT',
    price: 0,
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&q=80',
    description: 'Celebrate Ramadan with food, music, and stories. A multicultural evening open to all INSAT students.',
    seats_total: 150,
    seats_remaining: 120,
    category: 'Cultural',
    tags: ['Culture', 'Food', 'Music'],
    recommended_for: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  },
  {
    id: 4,
    title: 'Competitive Programming Bootcamp',
    club: 'ACM ICPC INSAT',
    club_color: '#f5a623',
    date: '2025-10-04T09:00:00',
    end_date: '2025-10-05T18:00:00',
    location: 'Laboratoire Informatique, INSAT',
    price: 10,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
    description: 'Two-day intensive bootcamp to prepare for ACM-ICPC. Algorithms, data structures, and live contest simulations.',
    seats_total: 30,
    seats_remaining: 0,
    category: 'Technology',
    tags: ['Programming', 'Algorithms', 'Competition'],
    recommended_for: ['2nd Year', '3rd Year', '4th Year'],
  },
  {
    id: 5,
    title: 'Photography Walk — La Médina',
    club: 'INSAT Arts & Media',
    club_color: '#8b5cf6',
    date: '2025-09-27T08:00:00',
    end_date: '2025-09-27T13:00:00',
    location: 'Bab Souika, Tunis',
    price: 0,
    image: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&q=80',
    description: 'An outdoor photography tour through the historic medina of Tunis. All skill levels welcome.',
    seats_total: 25,
    seats_remaining: 14,
    category: 'Arts',
    tags: ['Photography', 'Art', 'City'],
    recommended_for: ['1st Year', '2nd Year'],
  },
  {
    id: 6,
    title: 'Startup Pitch Day — Spring Edition',
    club: 'INSAT Entrepreneurship Club',
    club_color: '#0ea5e9',
    date: '2025-11-20T13:00:00',
    end_date: '2025-11-20T19:00:00',
    location: 'Grande Salle de Conférence, INSAT',
    price: 0,
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80',
    description: 'Student teams pitch their startup ideas to a panel of VCs and mentors. Prizes worth 5,000 TND.',
    seats_total: 300,
    seats_remaining: 187,
    category: 'Entrepreneurship',
    tags: ['Startup', 'Pitch', 'Business'],
    recommended_for: ['3rd Year', '4th Year', '5th Year'],
  },
];

const MOCK_USER_EVENTS = [MOCK_EVENTS[0], MOCK_EVENTS[2]];

// ── Data Fetching with Mock Fallback ────────────────────────
function normalizeBackendResponse(response) {
  if (response == null) return { data: [] };
  if (Array.isArray(response)) return { data: response };
  if (response.events) return { data: response.events };
  if (response.event) return { data: response.event };
  if (response.data) return { data: response.data };
  return { data: response };
}

async function getEvents(params = {}) {
  try {
    const res = await EventsAPI.list(params);
    return normalizeBackendResponse(res);
  } catch {
    // Return mock data with simulated filter
    let data = [...MOCK_EVENTS];
    if (params.category) {
      data = data.filter(e => e.category === params.category);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      data = data.filter(e =>
        e.title.toLowerCase().includes(q) || e.club.toLowerCase().includes(q)
      );
    }
    return { data };
  }
}

async function getEvent(id) {
  try {
    const res = await EventsAPI.get(id);
    return normalizeBackendResponse(res);
  } catch {
    const event = MOCK_EVENTS.find(e => e.id === parseInt(id));
    if (!event) throw new Error('Event not found');
    return { data: event };
  }
}

async function getUserEvents() {
  try {
    const res = await UserAPI.myEvents();
    return normalizeBackendResponse(res);
  } catch {
    return { data: MOCK_USER_EVENTS.map(e => ({ ...e, ticket_id: `TKT-${Math.random().toString(36).slice(2,8).toUpperCase()}`, points: 150 })) };
  }
}

// ── Exports (global for vanilla JS) ─────────────────────────
window.INSAT = window.INSAT || {};
Object.assign(window.INSAT, {
  api,
  Auth,
  EventsAPI,
  UserAPI,
  ENDPOINTS,
  MOCK_EVENTS,
  getEvents,
  getEvent,
  getUserEvents,
});