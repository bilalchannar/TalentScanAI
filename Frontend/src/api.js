// API base URL — can be overridden by setting window.API_BASE_URL in index.html
// Default: production backend on Render, or localhost for local development
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = window.API_BASE_URL || (isLocal ? 'http://127.0.0.1:3000' : 'https://talentscan-backend.onrender.com');

/**
 * Builds a full URL from a path, using the configured API base URL.
 * If the path already has http:// or https://, it's returned as-is.
 */
export function withApiBase(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    if (path.startsWith('/')) {
        return `${API_BASE_URL}${path}`;
    }

    return `${API_BASE_URL}/${path}`;
}

/**
 * Returns the JWT token stored in localStorage, or an empty string if none.
 */
export function getToken() {
    return localStorage.getItem('token') || '';
}

/**
 * Clears all auth-related data from localStorage (used on logout).
 */
export function clearAuthStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
}

/**
 * Wrapper around fetch() that automatically attaches the JWT Bearer token.
 * Use this for all API calls that require authentication.
 */
export async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(withApiBase(path), {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearAuthStorage();
        window.location.hash = '#/auth/login';
    }

    return response;
}
