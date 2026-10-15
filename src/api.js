import { io } from 'socket.io-client';

// Read server URL from Vercel / Vite environment variables (supports server_url, VITE_SERVER_URL, VITE_API_URL)
let rawServerUrl = 
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.server_url ||
  import.meta.env.SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://game-server-domu.onrender.com');

// If localhost was configured with https://, safely switch to http:// (local Node does not have SSL)
if (rawServerUrl.startsWith('https://localhost') || rawServerUrl.startsWith('https://127.0.0.1')) {
  rawServerUrl = rawServerUrl.replace('https://', 'http://');
}

// Cleanly strip any trailing slash to prevent double-slash formatting
export const API_BASE = rawServerUrl.replace(/\/+$/, '');
export const WS_BASE = API_BASE;

export function getToken() {
  return localStorage.getItem('skillsift_admin_token') || localStorage.getItem('kahoot_admin_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('skillsift_admin_token', token);
  } else {
    localStorage.removeItem('skillsift_admin_token');
    localStorage.removeItem('kahoot_admin_token');
  }
}

export function clearToken() {
  localStorage.removeItem('skillsift_admin_token');
  localStorage.removeItem('kahoot_admin_token');
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.includes('/login')) {
      clearToken();
      window.location.hash = '#/login';
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

let socketInstance = null;
export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(WS_BASE, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return socketInstance;
}
