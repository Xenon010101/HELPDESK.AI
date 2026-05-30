import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for admin dashboard navigation.
 * 
 * Implemented shortcuts:
 *   G then D  → Navigate to /admin/dashboard (Dashboard)
 *   G then T  → Navigate to /admin/tickets (Tickets)
 *   G then U  → Navigate to /admin/users (Users)
 *   G then A  → Navigate to /admin/analytics (Analytics)
 *   G then P  → Navigate to /admin/profile (Profile)
 *   Ctrl+F    → Focus search (if searchInputRef provided)
 *   Escape    → Close shortcuts legend (if onCloseLegend provided)
 * 
 * @param {Object} options
 * @param {React.RefObject} options.searchInputRef - ref to search input for Ctrl+F focus
 * @param {function} options.onCloseLegend - callback to close shortcuts legend overlay
 * @param {boolean} options.enabled - whether shortcuts are active (default true)
 */
export function useKeyboardShortcuts({ searchInputRef, onCloseLegend, enabled = true } = {}) {
    const navigate = useNavigate();

    const handleKeyDown = useCallback((e) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs (except specific combos)
        const tag = document.activeElement?.tagName;
        const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        // Ctrl+F: Focus search — works even when typing
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            if (searchInputRef?.current) {
                searchInputRef.current.focus();
            }
            return;
        }

        // Skip modifier-key combos when in inputs
        if (isEditing) return;

        // Escape: close shortcuts legend
        if (e.key === 'Escape' && onCloseLegend) {
            onCloseLegend();
            return;
        }

        // G-chord navigation
        if (e.key === 'g' || e.key === 'G') {
            // Listen for the next keypress
            const handleGChord = (nextEvent) => {
                // Remove listener after this keypress
                document.removeEventListener('keydown', handleGChord);

                const nextKey = nextEvent.key.toUpperCase();
                const routes = {
                    'D': '/admin/dashboard',
                    'T': '/admin/tickets',
                    'U': '/admin/users',
                    'A': '/admin/analytics',
                    'P': '/admin/profile',
                };
                if (routes[nextKey]) {
                    nextEvent.preventDefault();
                    navigate(routes[nextKey]);
                }
            };

            // Timeout: cancel G-chord after 1 second
            const timeoutId = setTimeout(() => {
                document.removeEventListener('keydown', handleGChord);
            }, 1000);

            // Store timeout id on the listener so we can clear it
            handleGChord._timeoutId = timeoutId;

            document.addEventListener('keydown', handleGChord, { once: true });
        }
    }, [navigate, searchInputRef, onCloseLegend, enabled]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}

/** Shortcut definitions for display in the legend overlay. */
export const SHORTCUTS = [
    { keys: ['G', 'D'], label: 'Go to Dashboard', description: 'Navigate to admin dashboard' },
    { keys: ['G', 'T'], label: 'Go to Tickets', description: 'Navigate to tickets list' },
    { keys: ['G', 'U'], label: 'Go to Users', description: 'Navigate to users management' },
    { keys: ['G', 'A'], label: 'Go to Analytics', description: 'Navigate to analytics view' },
    { keys: ['G', 'P'], label: 'Go to Profile', description: 'Navigate to admin profile' },
    { keys: ['Ctrl', 'F'], label: 'Search', description: 'Focus the search input' },
    { keys: ['Esc'], label: 'Close legend', description: 'Close this shortcuts overlay' },
];

/** Render a key badge (single key or chord). */
export function ShortcutBadge({ keys }) {
    return (
        <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            {keys.map((k, i) => (
                <span key={i}>
                    <kbd style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>{k}</kbd>
                    {i < keys.length - 1 && <span style={{ color: '#9ca3af', fontSize: '10px' }}>+</span>}
                </span>
            ))}
        </span>
    );
}