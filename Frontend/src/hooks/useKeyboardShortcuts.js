import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useKeyboardShortcuts
 *
 * Registers global keyboard shortcuts for rapid dashboard navigation:
 *   G + D → Dashboard
 *   G + T → Tickets
 *   G + S → Settings
 *   G + U → Users (admin only)
 *   G + A → Analytics (admin only)
 *   G + P → Profile
 *   ?     → Toggle shortcuts help modal
 *   Escape → Close help modal
 */
const useKeyboardShortcuts = ({ isAdmin = false } = {}) => {
    const navigate = useNavigate();
    const [showHelp, setShowHelp] = useState(false);
    const [buffer, setBuffer] = useState('');

    const handleKeyDown = useCallback((e) => {
        // Don't trigger shortcuts when user is typing in an input
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
            // Allow Escape to close modal even when in input
            if (e.key === 'Escape') {
                setShowHelp(false);
            }
            return;
        }

        // Toggle help modal with ?
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            setShowHelp((prev) => !prev);
            return;
        }

        // Close modal with Escape
        if (e.key === 'Escape') {
            setShowHelp(false);
            return;
        }

        // G-prefix navigation: G then letter within 500ms
        if (e.key === 'g' || e.key === 'G') {
            if (buffer === '') {
                setBuffer('g');
                setTimeout(() => setBuffer(''), 500);
                return;
            }
        }

        if (buffer === 'g') {
            const key = e.key.toLowerCase();
            setBuffer('');
            e.preventDefault();

            switch (key) {
                case 'd':
                    navigate(isAdmin ? '/admin/dashboard' : '/dashboard');
                    break;
                case 't':
                    navigate(isAdmin ? '/admin/tickets' : '/my-tickets');
                    break;
                case 's':
                    navigate(isAdmin ? '/admin/settings' : '/profile');
                    break;
                case 'p':
                    navigate(isAdmin ? '/admin/profile' : '/profile');
                    break;
                case 'u':
                    if (isAdmin) navigate('/admin/users');
                    break;
                case 'a':
                    if (isAdmin) navigate('/admin/analytics');
                    break;
                case 'h':
                    navigate('/help');
                    break;
            }
            return;
        }

        // Ctrl+F → focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="text"], input[placeholder*="search" i], input[placeholder*="Search" i]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }, [buffer, isAdmin, navigate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp };
};

export default useKeyboardShortcuts;
