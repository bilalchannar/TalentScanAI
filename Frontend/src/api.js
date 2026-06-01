// API base URL — can be overridden by setting window.API_BASE_URL in index.html
// or by using a build-time environment variable.
// Default: same host as frontend (for production where backend and frontend are on same domain)
// For local dev: http://127.0.0.1:3000
const API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:3000';

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

    return fetch(withApiBase(path), {
        ...options,
        headers
    });
}
