import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Active keyboard shortcuts for rapid admin dashboard navigation.
// Two-key sequences (e.g. G then D) navigate via React Router.
// Ctrl/Cmd + F focuses the first visible search input on the page.
export const ADMIN_SHORTCUTS = [
    { keys: ['g', 'd'], path: '/admin/dashboard', combo: 'G then D', description: 'Go to Dashboard' },
    { keys: ['g', 't'], path: '/admin/tickets', combo: 'G then T', description: 'Go to Tickets' },
    { keys: ['g', 'u'], path: '/admin/users', combo: 'G then U', description: 'Go to Users' },
    { keys: ['g', 'a'], path: '/admin/analytics', combo: 'G then A', description: 'Go to Analytics' },
    { keys: ['g', 'p'], path: '/admin/profile', combo: 'G then P', description: 'Go to Profile' },
    { keys: ['g', 's'], path: '/admin/settings', combo: 'G then S', description: 'Go to Settings' },
];

export const SHORTCUTS_LEGEND = [
    ...ADMIN_SHORTCUTS.map(({ combo, description }) => ({ combo, description })),
    { combo: 'Ctrl + F', description: 'Focus the page search input' },
];

const SEQUENCE_TIMEOUT_MS = 1200;

const isTypingTarget = (target) => {
    if (!target || !target.tagName) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

const useKeyboardShortcuts = (shortcuts = ADMIN_SHORTCUTS) => {
    const navigate = useNavigate();
    const lastKeyRef = useRef({ key: null, time: 0 });

    useEffect(() => {
        const handler = (event) => {
            // Ctrl/Cmd + F → focus the first visible search input.
            if ((event.ctrlKey || event.metaKey) && event.key && event.key.toLowerCase() === 'f') {
                const searchInput = document.querySelector(
                    'input[type="search"], input[placeholder*="earch" i]'
                );
                if (searchInput) {
                    event.preventDefault();
                    searchInput.focus();
                }
                return;
            }

            if (isTypingTarget(event.target)) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (!event.key || event.key.length !== 1) return;

            const key = event.key.toLowerCase();
            const now = Date.now();
            const last = lastKeyRef.current;

            const match = shortcuts.find(
                (s) =>
                    s.keys.length === 2 &&
                    s.keys[0] === last.key &&
                    s.keys[1] === key &&
                    now - last.time <= SEQUENCE_TIMEOUT_MS
            );

            if (match) {
                event.preventDefault();
                navigate(match.path);
                lastKeyRef.current = { key: null, time: 0 };
                return;
            }

            lastKeyRef.current = { key, time: now };
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [navigate, shortcuts]);
};

export default useKeyboardShortcuts;
