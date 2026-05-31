import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { API_CONFIG } from '../../config';

const BACKEND_URL = API_CONFIG.BACKEND_URL;

/**
 * AdminProtectedRoute Component
 * Restricts access to routes to only users with the 'admin' role.
 *
 * SECURITY: Role is verified server-side via /auth/me/role on every mount.
 * Client-side profile.role from Zustand/localStorage is NEVER trusted for
 * authorization decisions — it is only used for UI display (e.g. nav items).
 */
const AdminProtectedRoute = () => {
    const { user, loading, isCheckingSession } = useAuthStore();
    const [serverRole, setServerRole] = useState(null);
    const [serverStatus, setServerStatus] = useState(null);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState(null);

    // Verify role from the database on every mount / user change
    useEffect(() => {
        if (!user) {
            setVerifying(false);
            return;
        }

        let cancelled = false;

        const verifyRole = async () => {
            setVerifying(true);
            setError(null);
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(`${BACKEND_URL}/auth/me/role`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (cancelled) return;

                if (!res.ok) {
                    setServerRole(null);
                    setServerStatus(null);
                    setError('Unable to verify admin access');
                    return;
                }

                const body = await res.json();
                if (!cancelled) {
                    setServerRole(body.role);
                    setServerStatus(body.status);
                }
            } catch (e) {
                if (!cancelled) {
                    setServerRole(null);
                    setServerStatus(null);
                    setError('Unable to verify admin access');
                }
            } finally {
                if (!cancelled) setVerifying(false);
            }
        };

        verifyRole();
        return () => { cancelled = true; };
    }, [user]);

    // Show spinner while checking session or verifying role
    if (loading || isCheckingSession || verifying) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Server-side verification failed
    if (error) {
        return <Navigate to="/" replace />;
    }

    // Authorize based on SERVER-VERIFIED role (not client-side profile)
    if (serverRole !== 'admin' && serverRole !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    // Enforce active status for admins (Master Admin approval)
    if (serverStatus === 'rejected') {
        return <Navigate to="/not-approved" replace />;
    } else if (serverStatus !== 'active') {
        return <Navigate to="/admin-lobby" replace />;
    }

    // Authorized and active: render the protected layout
    return <Outlet />;
};

export default AdminProtectedRoute;
