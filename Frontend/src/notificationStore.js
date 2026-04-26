import { writable } from 'svelte/store';

export const notifications = writable([]);

export function notify(message, type = 'info', duration = 3000) {
    const id = Math.random().toString(36).substr(2, 9);
    notifications.update(n => [...n, { id, message, type }]);

    if (duration) {
        setTimeout(() => {
            dismissNotification(id);
        }, duration);
    }
}

export function dismissNotification(id) {
    notifications.update(n => n.filter(m => m.id !== id));
}
