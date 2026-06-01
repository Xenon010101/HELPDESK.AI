import React, { useState, useEffect, useCallback } from 'react';
import {
    Trophy, Target, TrendingUp, TrendingDown, Zap, Users,
    Clock, AlertTriangle, CheckCircle2, Bot, RefreshCw,
    ChevronDown, ChevronUp, Star, BookOpen, Lightbulb
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ScoreRing({ score }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color =
        score >= 80 ? '#10b981' :
        score >= 60 ? '#f59e0b' :
        score >= 40 ? '#f97316' : '#ef4444';

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#f0fdf4" strokeWidth="8" />
                <circle
                    cx="44" cy="44" r={radius} fill="none"
                    stroke={color} strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
            </svg>
            <span
                className="absolute text-xl font-extrabold"
                style={{ color, transform: 'rotate(0deg)' }}
            >
                {score}
            </span>
        </div>
    );
}

function MetricPill({ label, value, accent }) {
    return (
        <div
            className="flex flex-col items-center px-4 py-3 rounded-xl"
            style={{ background: accent + '14', border: `1px solid ${accent}28` }}
        >
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
                {label}
            </span>
            <span className="text-lg font-extrabold" style={{ color: '#0f1f12' }}>{value}</span>
        </div>
    );
}

function TagList({ items, color }) {
    if (!items || items.length === 0) return <span className="text-xs text-gray-400">—</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
                <span
                    key={i}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: color + '18', color }}
                >
                    {item}
                </span>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// ScorecardCard — single agent / team card
// ---------------------------------------------------------------------------

function ScorecardCard({ data, rank }) {
    const [expanded, setExpanded] = useState(false);
    const { agent_team, metrics, coaching } = data;

    const score = coaching?.performance_score ?? 0;
    const rankColors = ['#f59e0b', '#9ca3af', '#cd7f32'];
    const rankColor = rank <= 3 ? rankColors[rank - 1] : '#6b7280';
    const resolveRate = metrics.total_tickets
        ? Math.round((metrics.resolved_tickets / metrics.total_tickets) * 100)
        : 0;

    return (
        <div
            className="rounded-2xl bg-white transition-all duration-300"
            style={{
                border: '1px solid #f0fdf4',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.05)',
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-4 p-5">
                {/* Rank badge */}
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: rankColor + '20', color: rankColor }}
                >
                    {rank <= 3 ? <Trophy size={16} /> : `#${rank}`}
                </div>

                {/* Score ring */}
                <ScoreRing score={score} />

                {/* Name + quick stats */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base truncate">{agent_team}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {metrics.total_tickets} tickets &bull; {resolveRate}% resolved
                    </p>
                </div>

                {/* SLA breach indicator */}
                {metrics.sla_breach_rate > 0 && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
                        <AlertTriangle size={12} />
                        {metrics.sla_breach_rate}% SLA breach
                    </div>
                )}

                <button
                    onClick={() => setExpanded(e => !e)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {/* Metric pills row */}
            <div className="grid grid-cols-4 gap-2 px-5 pb-4">
                <MetricPill label="Tickets" value={metrics.total_tickets} accent="#6366f1" />
                <MetricPill label="Resolved" value={metrics.resolved_tickets} accent="#10b981" />
                <MetricPill
                    label="Avg. Time"
                    value={metrics.avg_resolution_hours > 0 ? `${metrics.avg_resolution_hours}h` : '—'}
                    accent="#3b82f6"
                />
                <MetricPill label="Auto-res." value={`${metrics.auto_resolved_rate}%`} accent="#8b5cf6" />
            </div>

            {/* Expanded coaching panel */}
            {expanded && (
                <div
                    className="mx-4 mb-4 rounded-xl p-4 space-y-4"
                    style={{ background: '#f8fafb', border: '1px solid #f0fdf4' }}
                >
                    {/* AI Coaching tip */}
                    {coaching?.coaching_tip && (
                        <div className="flex gap-3">
                            <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                                <Bot size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                                    AI Coaching Insight
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">{coaching.coaching_tip}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Strengths
                            </p>
                            <ul className="space-y-1">
                                {(coaching?.strengths || []).map((s, i) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        {s}
                                    </li>
                                ))}
                                {(!coaching?.strengths?.length) && (
                                    <li className="text-xs text-gray-400">No strengths data.</li>
                                )}
                            </ul>
                        </div>

                        {/* Improvement areas */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1">
                                <TrendingUp size={12} /> Areas to Improve
                            </p>
                            <ul className="space-y-1">
                                {(coaching?.improvement_areas || []).map((a, i) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        {a}
                                    </li>
                                ))}
                                {(!coaching?.improvement_areas?.length) && (
                                    <li className="text-xs text-gray-400">No areas data.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Recommended training */}
                    {coaching?.recommended_training?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1">
                                <BookOpen size={12} /> Recommended Training
                            </p>
                            <TagList items={coaching.recommended_training} color="#6366f1" />
                        </div>
                    )}

                    {/* Top categories */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Top Categories
                            </p>
                            <TagList items={metrics.top_categories} color="#3b82f6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                                Common Issues
                            </p>
                            <TagList items={metrics.common_subcategories} color="#8b5cf6" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const AdminScorecard = () => {
    const { profile } = useAuthStore();
    const [scorecards, setScorecards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generatedAt, setGeneratedAt] = useState(null);

    const fetchScorecard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = profile?.company_id
                ? `?company_id=${encodeURIComponent(profile.company_id)}`
                : '';
            const res = await fetch(`${BACKEND_URL}/ai/agent_scorecard${params}`);
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            const json = await res.json();
            setScorecards(json.scorecards || []);
            setGeneratedAt(json.generated_at || null);
        } catch (err) {
            setError(err.message || 'Failed to load scorecard data');
        } finally {
            setLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => {
        if (profile) fetchScorecard();
    }, [profile, fetchScorecard]);

    const topScore = scorecards[0]?.coaching?.performance_score ?? 0;
    const avgScore = scorecards.length
        ? Math.round(scorecards.reduce((s, c) => s + (c.coaching?.performance_score ?? 0), 0) / scorecards.length)
        : 0;
    const totalTickets = scorecards.reduce((s, c) => s + (c.metrics?.total_tickets ?? 0), 0);

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">
                        Agent Performance Scorecard
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Real-time metrics and AI-generated coaching insights for each support team.
                        {generatedAt && (
                            <span className="ml-2 text-gray-300">
                                Updated {new Date(generatedAt).toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchScorecard}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary stat bar */}
            {!loading && scorecards.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Teams Tracked', value: scorecards.length, icon: Users, color: '#6366f1' },
                        { label: 'Avg. Performance', value: `${avgScore}/100`, icon: Target, color: '#10b981' },
                        { label: 'Top Score', value: `${topScore}/100`, icon: Star, color: '#f59e0b' },
                        { label: 'Total Tickets', value: totalTickets, icon: Zap, color: '#3b82f6' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div
                            key={label}
                            className="bg-white rounded-2xl p-5"
                            style={{ border: '1px solid #f0fdf4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>
                                {label}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-extrabold text-gray-800">{value}</span>
                                <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-100" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-gray-700">Generating scorecards…</p>
                        <p className="text-sm text-gray-400 mt-1">Querying tickets and running Gemini analysis</p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-6 flex items-start gap-4">
                    <AlertTriangle size={22} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700">Failed to load scorecard</p>
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                        <p className="text-xs text-red-400 mt-1">
                            Make sure the backend is running and <code>GEMINI_API_KEY</code> is configured.
                        </p>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && scorecards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-gray-50">
                        <Users size={32} className="text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-600">No scorecard data yet</p>
                    <p className="text-sm text-gray-400">Tickets need to be assigned to teams before scorecards can be generated.</p>
                </div>
            )}

            {/* Scorecards list */}
            {!loading && !error && scorecards.length > 0 && (
                <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {scorecards.length} team{scorecards.length !== 1 ? 's' : ''} — ranked by AI performance score
                    </p>
                    {scorecards.map((card, i) => (
                        <ScorecardCard key={card.agent_team} data={card} rank={i + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminScorecard;
