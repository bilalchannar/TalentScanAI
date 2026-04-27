const API_BASE_URL = 'http://127.0.0.1:3000';

export function withApiBase(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    if (path.startsWith('/')) {
        return `${API_BASE_URL}${path}`;
    }

    return `${API_BASE_URL}/${path}`;
}

export function getToken() {
    return localStorage.getItem('token') || '';
}

export function clearAuthStorage() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
}

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
