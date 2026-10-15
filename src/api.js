import { io } from 'socket.io-client';

// Read server URL from Vercel / Vite environment variables (supports server_url, VITE_SERVER_URL, VITE_API_URL)
const rawServerUrl = 
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.server_url ||
  import.meta.env.SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  'https://game-server-domu.onrender.com';

// Cleanly strip any trailing slash to prevent double-slash formatting
export const API_BASE = (rawServerUrl || 'https://game-server-domu.onrender.com').replace(/\/+$/, '');
export const WS_BASE = API_BASE;

export function getToken() {
  return localStorage.getItem('kahoot_admin_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('kahoot_admin_token', token);
  } else {
    localStorage.removeItem('kahoot_admin_token');
  }
}

export function clearToken() {
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
