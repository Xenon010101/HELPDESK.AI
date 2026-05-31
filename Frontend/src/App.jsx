import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, CheckCircle2, Mic, Volume2 } from 'lucide-react';

// Core State Stores & Hooks
import useAuthStore from './store/authStore';
import useTicketStore from './store/ticketStore';
import { useTheme } from './hooks/useTheme';
import useRealtimeNotifications from './hooks/useRealtimeNotifications';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

// Eager Global Shared Core UI Nodes
import Toaster from './components/shared/Toaster';
import BugReportWidget from './components/shared/BugReportWidget';
import ScrollToTopButton from './components/ScrollToTopButton';
import ShortcutsHelp from './components/shared/ShortcutsHelp';
import AdminProtectedRoute from './components/shared/AdminProtectedRoute';
import MasterAdminProtectedRoute from './components/shared/MasterAdminProtectedRoute';
import ProtectedRoute from './components/shared/ProtectedRoute';

// ---------------------------------------------------------------------------
// Lazy-loaded Modular Ingestion Tree
// ---------------------------------------------------------------------------

// Public & Authentication Sub-systems
const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Signup = lazy(() => import('./pages/Signup'));
const AdminSignup = lazy(() => import('./pages/AdminSignup'));
const AdminLobby = lazy(() => import('./pages/AdminLobby'));
const UserLobby = lazy(() => import('./pages/UserLobby'));
const NotApproved = lazy(() => import('./pages/NotApproved'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ContactSales = lazy(() => import('./pages/ContactSales'));

// Showcase & Resource Portals
const Changelog = lazy(() => import('./pages/Changelog'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Careers = lazy(() => import('./pages/Careers'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const ApiReference = lazy(() => import('./pages/ApiReference'));
const DocsPortal = lazy(() => import('./docs/pages/DocsPortal'));

// Semantic Feature Modules
const AutoCategorizationFeature = lazy(() => import('./pages/features/AutoCategorizationFeature'));
const PriorityDetectionFeature = lazy(() => import('./pages/features/PriorityDetectionFeature'));
const SmartResolutionFeature = lazy(() => import('./pages/features/SmartResolutionFeature'));

// Legal Contexts
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const Security = lazy(() => import('./pages/legal/Security'));
const CookiePolicy = lazy(() => import('./pages/legal/CookiePolicy'));

// Tenant Core Workspace Layout Shells
const UserLayout = lazy(() => import('./user/UserLayout'));
const AdminLayout = lazy(() => import('./admin/layout/AdminLayout'));
const MasterAdminLayout = lazy(() => import('./master-admin/layout/MasterAdminLayout'));

// User Telemetry Target Node Matrix
const Dashboard = lazy(() => import('./user/pages/Dashboard'));
const CreateTicket = lazy(() => import('./user/pages/CreateTicket'));
const MyTickets = lazy(() => import('./user/pages/MyTickets'));
const TicketResult = lazy(() => import('./user/pages/TicketResult'));
const Profile = lazy(() => import('./user/pages/Profile'));
const TicketDetail = lazy(() => import('./user/pages/TicketDetail'));
const AIProcessing = lazy(() => import('./user/pages/AIProcessing'));
const AIUnderstanding = lazy(() => import('./user/pages/AIUnderstanding'));
const Notifications = lazy(() => import('./user/pages/Notifications'));
const Help = lazy(() => import('./user/pages/Help'));
const DuplicateDetection = lazy(() => import('./user/pages/DuplicateDetection'));
const AutoResolveChat = lazy(() => import('./user/pages/AutoResolveChat'));
const Resolved = lazy(() => import('./user/pages/Resolved'));
const TicketTracking = lazy(() => import('./user/pages/TicketTracking'));

// Operational Support Admin Nodes
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const AdminTickets = lazy(() => import('./admin/pages/AdminTickets'));
const AdminTicketDetail = lazy(() => import('./admin/pages/AdminTicketDetail'));
const AdminUsers = lazy(() => import('./admin/pages/AdminUsers'));
const AdminAnalytics = lazy(() => import('./admin/pages/AdminAnalytics'));
const AdminProfile = lazy(() => import('./admin/pages/AdminProfile'));
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'));
const AdminScorecard = lazy(() => import('./admin/pages/AdminScorecard'));
const SLAPage = lazy(() => import('./admin/pages/SLAPage'));

// Master Root Governance Matrix
const MasterAdminLogin = lazy(() => import('./pages/MasterAdminLogin'));
const MasterAdminDashboard = lazy(() => import('./master-admin/pages/MasterAdminDashboard'));
const PendingAdminRequests = lazy(() => import('./master-admin/pages/PendingAdminRequests'));
const AllCompanies = lazy(() => import('./master-admin/pages/AllCompanies'));
const AllAdmins = lazy(() => import('./master-admin/pages/AllAdmins'));
const MasterBugReports = lazy(() => import('./master-admin/pages/MasterBugReports'));

// Dynamic Inline Fallbacks
const NotFoundPage = lazy(() => import('./components/ui/not-found-2').then((module) => ({ default: module.NotFound })));

// ---------------------------------------------------------------------------
// Error Boundary & Telemetry Wrappers
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("React ErrorBoundary caught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[40vh] items-center justify-center px-6 py-16">
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-600 shadow-sm">
                        Something went wrong. Please refresh the page.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function RouteFallback() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center px-6 py-16">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-sm font-semibold text-slate-500 shadow-sm">
                Loading...
            </div>
        </div>
    );
}

function TitleUpdater() {
    const location = useLocation();
    useEffect(() => {
        const path = location.pathname;
        let title = 'HELPDESK.AI';

        if (path.startsWith('/admin/ticket/')) title = 'Ticket Detail | Admin';
        else if (path.startsWith('/admin/dashboard')) title = 'Admin Dashboard';
        else if (path.startsWith('/admin/tickets')) title = 'Admin Tickets';
        else if (path.startsWith('/admin/users')) title = 'Manage Users | Admin';
        else if (path.startsWith('/admin/analytics')) title = 'Analytics | Admin';
        else if (path.startsWith('/admin/scorecard')) title = 'Agent Scorecard | Admin';
        else if (path.startsWith('/admin/profile')) title = 'Admin Profile';
        else if (path.startsWith('/admin/settings')) title = 'Settings | Admin';
        else if (path.startsWith('/admin/sla')) title = 'SLA Monitor | Admin';
        else if (path.startsWith('/master-admin/dashboard')) title = 'Master Dashboard';
        else if (path.startsWith('/master-admin/admin-requests')) title = 'Pending Requests | Master Admin';
        else if (path.startsWith('/master-admin/companies')) title = 'Companies | Master Admin';
        else if (path.startsWith('/master-admin/all-admins')) title = 'All Admins | Master Admin';
        else if (path.startsWith('/master-admin/bug-reports')) title = 'System Bug Radar | Master Admin';
        else if (path.startsWith('/ticket/')) title = 'Ticket Detail';
        else if (path.startsWith('/ai-understanding')) title = 'AI Understanding';
        else if (path.startsWith('/ai-processing')) title = 'AI Processing';
        else if (path === '/dashboard') title = 'User Dashboard';
        else if (path === '/create-ticket') title = 'Create Ticket';
        else if (path === '/my-tickets') title = 'My Tickets';
        else if (path === '/profile') title = 'User Profile';
        else if (path === '/notifications') title = 'Notifications';
        else if (path === '/docs') title = 'Documentation';
        else if (path === '/api-reference') title = 'API Reference';
        else if (path === '/changelog') title = 'Changelog';
        else if (path === '/status') title = 'Status';
        else if (path === '/about') title = 'About Us';
        else if (path === '/careers') title = 'Careers';
        else if (path === '/cookie-policy') title = 'Cookie Policy';
        else if (path === '/login') title = 'Login';
        else if (path === '/signup') title = 'Create Account';
        else if (path === '/admin-signup') title = 'Admin Signup';
        else if (path === '/user-lobby') title = 'User Lobby';
        else if (path === '/admin-lobby') title = 'Admin Lobby';
        else if (path === '/about-us') title = 'About Us';
        else if (path === '/') title = 'Welcome';

        document.title = title === 'HELPDESK.AI' ? title : `${title} | HELPDESK.AI`;
    }, [location]);
    return null;
}

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);
    return null;
}

// ---------------------------------------------------------------------------
// Shell Layout Assembly
// ---------------------------------------------------------------------------
function AppLayout() {
    const { user, profile } = useAuthStore();
    const [showShortcuts, setShowShortcuts] = useState(false);

    useRealtimeNotifications();

    const { shortcuts } = useKeyboardShortcuts(
        profile?.role === 'admin' || profile?.role === 'super_admin'
            ? { 'g,a': '/admin/dashboard', 'g,k': '/admin/tickets', 'g,u': '/admin/users', 'g,s': '/admin/settings' }
            : profile?.role === 'master_admin'
                ? { 'g,a': '/master-admin/dashboard', 'g,k': '/master-admin/admin-requests', 'g,u': '/master-admin/all-admins' }
                : {},
        { onShortcutsHelp: () => setShowShortcuts(true) }
    );

    useEffect(() => {
        if (!user) return;
        const handleFocus = () => {
            useTicketStore.persist.rehydrate();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user]);

    return (
        <ErrorBoundary>
            <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} shortcuts={shortcuts} />
            <Routes>
                {/* Integration Webhook Hooks */}
                <Route path="/knowledge-check" element={<Suspense fallback={<RouteFallback />}><DuplicateDetection /></Suspense>} />
                <Route path="/auto-resolve" element={<Suspense fallback={<RouteFallback />}><AutoResolveChat /></Suspense>} />
                <Route path="/resolved" element={<Suspense fallback={<RouteFallback />}><Resolved /></Suspense>} />

                {/* Public Core System Matrix */}
                <Route path="/" element={<Suspense fallback={<RouteFallback />}><LandingPage /></Suspense>} />
                <Route path="/login" element={<Suspense fallback={<RouteFallback />}><Login /></Suspense>} />
                <Route path="/signup" element={<Suspense fallback={<RouteFallback />}><Signup /></Suspense>} />
                <Route path="/admin-signup" element={<Suspense fallback={<RouteFallback />}><AdminSignup /></Suspense>} />
                <Route path="/forgot-password" element={<Suspense fallback={<RouteFallback />}><ForgotPassword /></Suspense>} />
                <Route path="/reset-password" element={<Suspense fallback={<RouteFallback />}><ResetPassword /></Suspense>} />
                <Route path="/auth/callback" element={<Suspense fallback={<RouteFallback />}><AuthCallback /></Suspense>} />

                {/* Staging Lobby Tunnels */}
                <Route path="/admin-lobby" element={<Suspense fallback={<RouteFallback />}><AdminLobby /></Suspense>} />
                <Route path="/user-lobby" element={<Suspense fallback={<RouteFallback />}><UserLobby /></Suspense>} />
                <Route path="/not-approved" element={<Suspense fallback={<RouteFallback />}><NotApproved /></Suspense>} />

                {/* Showcase Ingestion Resources */}
                <Route path="/contact-sales" element={<Suspense fallback={<RouteFallback />}><ContactSales /></Suspense>} />
                <Route path="/docs" element={<Suspense fallback={<RouteFallback />}><DocsPortal /></Suspense>} />
                <Route path="/api-reference" element={<Suspense fallback={<RouteFallback />}><ApiReference /></Suspense>} />
                <Route path="/changelog" element={<Suspense fallback={<RouteFallback />}><Changelog /></Suspense>} />
                <Route path="/status" element={<Suspense fallback={<RouteFallback />}><StatusPage /></Suspense>} />
                <Route path="/about" element={<Suspense fallback={<RouteFallback />}><AboutUs /></Suspense>} />
                <Route path="/about-us" element={<Suspense fallback={<RouteFallback />}><AboutUs /></Suspense>} />
                <Route path="/careers" element={<Suspense fallback={<RouteFallback />}><Careers /></Suspense>} />

                {/* Real-time Feature Marketing Portals */}
                <Route path="/features/categorization" element={<Suspense fallback={<RouteFallback />}><AutoCategorizationFeature /></Suspense>} />
                <Route path="/features/auto-categorization" element={<Suspense fallback={<RouteFallback />}><AutoCategorizationFeature /></Suspense>} />
                <Route path="/features/priority" element={<Suspense fallback={<RouteFallback />}><PriorityDetectionFeature /></Suspense>} />
                <Route path="/features/priority-detection" element={<Suspense fallback={<RouteFallback />}><PriorityDetectionFeature /></Suspense>} />
                <Route path="/features/resolution" element={<Suspense fallback={<RouteFallback />}><SmartResolutionFeature /></Suspense>} />
                <Route path="/features/smart-resolution" element={<Suspense fallback={<RouteFallback />}><SmartResolutionFeature /></Suspense>} />

                {/* Legal & Policy Directives */}
                <Route path="/terms" element={<Suspense fallback={<RouteFallback />}><TermsOfService /></Suspense>} />
                <Route path="/privacy" element={<Suspense fallback={<RouteFallback />}><PrivacyPolicy /></Suspense>} />
                <Route path="/security" element={<Suspense fallback={<RouteFallback />}><Security /></Suspense>} />
                <Route path="/cookies" element={<Suspense fallback={<RouteFallback />}><CookiePolicy /></Suspense>} />

                {/* Core User Subspace Group */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/user" element={<Suspense fallback={<RouteFallback />}><UserLayout /></Suspense>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Suspense fallback={<RouteFallback />}><Dashboard /></Suspense>} />
                        <Route path="create-ticket" element={<Suspense fallback={<RouteFallback />}><CreateTicket /></Suspense>} />
                        <Route path="my-tickets" element={<Suspense fallback={<RouteFallback />}><MyTickets /></Suspense>} />
                        <Route path="ticket-result" element={<Suspense fallback={<RouteFallback />}><TicketResult /></Suspense>} />
                        <Route path="ticket/:id" element={<Suspense fallback={<RouteFallback />}><TicketDetail /></Suspense>} />
                        <Route path="ai-processing" element={<Suspense fallback={<RouteFallback />}><AIProcessing /></Suspense>} />
                        <Route path="ai-understanding" element={<Suspense fallback={<RouteFallback />}><AIUnderstanding /></Suspense>} />
                        <Route path="notifications" element={<Suspense fallback={<RouteFallback />}><Notifications /></Suspense>} />
                        <Route path="help" element={<Suspense fallback={<RouteFallback />}><Help /></Suspense>} />
                        <Route path="duplicate-detection" element={<Suspense fallback={<RouteFallback />}><DuplicateDetection /></Suspense>} />
                        <Route path="auto-resolve" element={<Suspense fallback={<RouteFallback />}><AutoResolveChat /></Suspense>} />
                        <Route path="resolved" element={<Suspense fallback={<RouteFallback />}><Resolved /></Suspense>} />
                        <Route path="ticket-tracking" element={<Suspense fallback={<RouteFallback />}><TicketTracking /></Suspense>} />
                        <Route path="profile" element={<Suspense fallback={<RouteFallback />}><Profile /></Suspense>} />
                    </Route>
                    {/* Backward-compatible absolute mappings */}
                    <Route path="/dashboard" element={<Navigate to="/user/dashboard" replace />} />
                    <Route path="/create-ticket" element={<Navigate to="/user/create-ticket" replace />} />
                    <Route path="/my-tickets" element={<Navigate to="/user/my-tickets" replace />} />
                    <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
                    <Route path="/notifications" element={<Navigate to="/user/notifications" replace />} />
                    <Route path="/ticket/:id" element={<Navigate to="/user/ticket/:id" replace />} />
                    <Route path="/ai-processing" element={<Navigate to="/user/ai-processing" replace />} />
                    <Route path="/ai-understanding" element={<Navigate to="/user/ai-understanding" replace />} />
                </Route>

                {/* Operations Support Admin Group */}
                <Route element={<AdminProtectedRoute />}>
                    <Route path="/admin" element={<Suspense fallback={<RouteFallback />}><AdminLayout /></Suspense>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Suspense fallback={<RouteFallback />}><AdminDashboard /></Suspense>} />
                        <Route path="tickets" element={<Suspense fallback={<RouteFallback />}><AdminTickets /></Suspense>} />
                        <Route path="tickets/:id" element={<Suspense fallback={<RouteFallback />}><AdminTicketDetail /></Suspense>} />
                        <Route path="ticket/:ticket_id" element={<Suspense fallback={<RouteFallback />}><AdminTicketDetail /></Suspense>} />
                        <Route path="users" element={<Suspense fallback={<RouteFallback />}><AdminUsers /></Suspense>} />
                        <Route path="analytics" element={<Suspense fallback={<RouteFallback />}><AdminAnalytics /></Suspense>} />
                        <Route path="scorecard" element={<Suspense fallback={<RouteFallback />}><AdminScorecard /></Suspense>} />
                        <Route path="profile" element={<Suspense fallback={<RouteFallback />}><AdminProfile /></Suspense>} />
                        <Route path="settings" element={<Suspense fallback={<RouteFallback />}><AdminSettings /></Suspense>} />
                        <Route path="sla" element={<Suspense fallback={<RouteFallback />}><SLAPage /></Suspense>} />
                    </Route>
                </Route>

                {/* Master Core Governance Matrix */}
                <Route path="/master-admin-login" element={<Suspense fallback={<RouteFallback />}><MasterAdminLogin /></Suspense>} />
                <Route element={<MasterAdminProtectedRoute />}>
                    <Route path="/master-admin" element={<Suspense fallback={<RouteFallback />}><MasterAdminLayout /></Suspense>}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Suspense fallback={<RouteFallback />}><MasterAdminDashboard /></Suspense>} />
                        <Route path="admins" element={<Suspense fallback={<RouteFallback />}><AllAdmins /></Suspense>} />
                        <Route path="all-admins" element={<Navigate to="admins" replace />} />
                        <Route path="companies" element={<Suspense fallback={<RouteFallback />}><AllCompanies /></Suspense>} />
                        <Route path="admin-requests" element={<Suspense fallback={<RouteFallback />}><PendingAdminRequests /></Suspense>} />
                        <Route path="pending-requests" element={<Navigate to="admin-requests" replace />} />
                        <Route path="bug-reports" element={<Suspense fallback={<RouteFallback />}><MasterBugReports /></Suspense>} />
                    </Route>
                </Route>

                {/* Fallback Catch-All Exception Nodes */}
                <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
            </Routes>
        </ErrorBoundary>
    );
}

// ---------------------------------------------------------------------------
// Main System Orchestrator Component
// ---------------------------------------------------------------------------
export default function App() {
    useTheme();
    const { initialize } = useAuthStore();

    useEffect(() => {
        initialize().catch((err) => {
            console.error('Auth initialize failed:', err);
        });
    }, [initialize]);

    const isDocsSubdomain = window.location.hostname.startsWith('docs.');

    if (isDocsSubdomain) {
        return (
            <BrowserRouter>
                <TitleUpdater />
                <ScrollToTop />
                <ScrollToTopButton />
                <Toaster />
                <BugReportWidget />
                <BackToTop />
                <Routes>
                    <Route path="/" element={<Suspense fallback={<RouteFallback />}><DocsPortal /></Suspense>} />
                    <Route path="/docs" element={<Navigate to="/" replace />} />
                    <Route path="/api-reference" element={<Suspense fallback={<RouteFallback />}><ApiReference /></Suspense>} />
                    <Route path="/changelog" element={<Suspense fallback={<RouteFallback />}><Changelog /></Suspense>} />
                    <Route path="/status" element={<Suspense fallback={<RouteFallback />}><StatusPage /></Suspense>} />
                    <Route path="*" element={<Suspense fallback={<RouteFallback />}><DocsPortal /></Suspense>} />
                </Routes>
            </BrowserRouter>
        );
    }

    return (
        <BrowserRouter>
            <TitleUpdater />
            <ScrollToTop />
            <AppLayout />
        </BrowserRouter>
    );
}