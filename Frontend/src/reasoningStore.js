import { writable } from 'svelte/store';

// Store for holding the current candidate's AI analysis report
export const reasoningReport = writable(null);
