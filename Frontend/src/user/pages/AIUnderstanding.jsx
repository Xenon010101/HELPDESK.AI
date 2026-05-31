import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Layers, Tag, AlertCircle, ShieldCheck, Zap, ArrowRight,
    Activity, FileText, BrainCircuit, LayoutGrid, CheckCircle2,
    ImageIcon, ChevronDown, Lightbulb, Terminal
} from 'lucide-react';
import useTicketStore from "../../store/ticketStore";
import { Card, CardContent } from "../../components/ui/card";

// ─── Shimmer Skeleton ────────────────────────────────────────────────
const Shimmer = ({ className = "" }) => (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5 ${className}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
);

const SkeletonLoader = () => (
    <div className="min-h-screen bg-slate-950 pb-20 pt-32 px-4 sm:px-6">
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-3">
                <Shimmer className="h-8 w-72 mx-auto" />
                <Shimmer className="h-4 w-96 mx-auto" />
            </div>

            <div className="flex items-center justify-center gap-4 py-4">
                {[1, 2, 3, 4].map(i => (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-2">
                            <Shimmer className="w-10 h-10 rounded-xl" />
                            <Shimmer className="h-3 w-16" />
                        </div>
                        {i < 4 && <Shimmer className="h-0.5 w-12 mt-[-20px]" />}
                    </React.Fragment>
                ))}
            </div>

            <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                <CardContent className="p-8 flex items-start gap-6">
                    <Shimmer className="w-14 h-14 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3">
                        <Shimmer className="h-3 w-32" />
                        <Shimmer className="h-5 w-full" />
                        <Shimmer className="h-5 w-3/4" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                    <CardContent className="p-8 space-y-5">
                        <Shimmer className="h-4 w-32" />
                        <Shimmer className="h-8 w-40" />
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2"><Shimmer className="h-3 w-16" /><Shimmer className="h-6 w-20" /></div>
                            <div className="space-y-2"><Shimmer className="h-3 w-24" /><Shimmer className="h-6 w-28" /></div>
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-8">
                    <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                        <CardContent className="p-8 space-y-4">
                            <Shimmer className="h-4 w-48" />
                            <div className="flex flex-wrap gap-2">
                                <Shimmer className="h-7 w-20 rounded-full" />
                                <Shimmer className="h-7 w-24 rounded-full" />
                                <Shimmer className="h-7 w-28 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                        <CardContent className="p-8 space-y-3">
                            <Shimmer className="h-4 w-40" />
                            <Shimmer className="h-2.5 w-full rounded-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────
const AIUnderstanding = () => {
    const navigate = useNavigate();
    const aiTicket = useTicketStore((state) => state.aiTicket);
    const setAITicket = useTicketStore((state) => state.setAITicket);

    const [isLoading, setIsLoading] = useState(true);
    const [editedIssue, setEditedIssue] = useState("");
    const [explainerOpen, setExplainerOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading && !aiTicket) {
            navigate('/create-ticket');
        }
    }, [isLoading, aiTicket, navigate]);

    useEffect(() => {
        if (aiTicket?.originalIssue) {
            setEditedIssue(aiTicket.originalIssue);
        }
    }, [aiTicket]);

    if (isLoading) return <SkeletonLoader />;
    if (!aiTicket) return null;

    const summary = aiTicket.summary || aiTicket.originalIssue || "No issue text provided.";
    const category = aiTicket.category || "Uncategorized";
    const subcategory = aiTicket.subcategory || "None";
    const priority = aiTicket.priority || "Medium";
    const assignedTeam = aiTicket.assigned_team || "Triage";
    const entities = aiTicket.entities || [];
    const rawConfidence = aiTicket.confidence;
    const confidence = rawConfidence != null ? Math.round(rawConfidence * 100) : 95;

    let confBarColor = "bg-red-500";
    if (confidence >= 90) confBarColor = "bg-emerald-500";
    else if (confidence >= 70) confBarColor = "bg-amber-500";

    const priorityLower = (priority || 'medium').toLowerCase();
    let priorityColor = "bg-white/5 text-slate-400 border-white/10";
    if (priorityLower === 'high' || priorityLower === 'critical') priorityColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    else if (priorityLower === 'medium') priorityColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    else if (priorityLower === 'low') priorityColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    const handleUpdate = () => {
        setAITicket({ ...aiTicket, originalIssue: editedIssue });
    };

    const handleContinue = () => {
        setAITicket({ ...aiTicket, originalIssue: editedIssue, status: 'duplicate_check' });
        navigate('/knowledge-check');
    };

    const pipelineStages = [
        { label: 'Input', icon: FileText },
        { label: 'AI Analysis', icon: BrainCircuit },
        { label: 'Classification', icon: LayoutGrid },
        { label: 'Decision', icon: CheckCircle2 },
    ];
    const currentStage = aiTicket?.status === 'duplicate_check' ? 2 : (aiTicket?.status === 'analyzing' ? 1 : 0);

    const groupedEntities = entities.reduce((acc, entity) => {
        const label = entity.label || 'Other';
        if (!acc[label]) acc[label] = [];
        acc[label].push(entity.text);
        return acc;
    }, {});

    const signalTexts = entities.map(e => e.text);
    const patternMatch = `${category} > ${subcategory}`;
    const safeCategory = String(category || 'General').toLowerCase();
    const safeSubcategory = String(subcategory || 'Support').toLowerCase();
    const confidenceExplanation = confidence >= 90
        ? `This issue strongly matches known ${safeCategory} ${safeSubcategory} failures.`
        : confidence >= 70
            ? `This issue partially matches patterns in ${safeCategory} issues.`
            : `This issue has a weak match; further review may be needed.`;

    return (
        <div className="min-h-screen bg-slate-950 pb-20 pt-32 px-4 sm:px-6 relative overflow-hidden font-sans">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}} />
            
            {/* Ambient Background Glow Arrays */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" 
                 style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="w-full max-w-4xl mx-auto space-y-8 relative z-10 text-left">

                {/* 1. Page Header Context Node */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-syne uppercase">
                        AI Analysis Complete
                    </h1>
                    <p className="text-slate-400 font-medium max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                        The neural routing matrix has parsed your environmental footprint and parsed layout fields successfully.
                    </p>
                </div>

                {/* Horizontal System Analysis Pipeline Track */}
                <div className="flex items-center justify-center gap-0 py-4 overflow-x-auto customize-scrollbar">
                    {pipelineStages.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isCompleted = idx < currentStage;
                        const isCurrent = idx === currentStage;

                        return (
                            <React.Fragment key={stage.label}>
                                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isCurrent
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                                        : isCompleted
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-white/[0.02] border-white/5 text-slate-600'
                                        }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-emerald-400' : isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {stage.label}
                                    </span>
                                </div>
                                {idx < pipelineStages.length - 1 && (
                                    <div className={`flex-1 h-px min-w-[40px] max-w-[80px] mx-2 mt-[-20px] ${idx < currentStage ? 'bg-emerald-500/50' : 'bg-white/5'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 2. Issue Summary Frame Box */}
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl">
                    <CardContent className="p-6 sm:p-8 flex items-start gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
                            <Bot className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-0.5">Synthesized AI Summary</h2>
                            <p className="text-base sm:text-lg font-bold text-white leading-relaxed m-0 font-medium">
                                {summary}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    
                    {/* 3. AI Classification Architecture Parameter Map */}
                    <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider">
                                <Layers className="w-4 h-4 text-emerald-400" />
                                Triage Matrix Classification
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Dynamic Category Tree</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3.5 h-7 flex items-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">
                                            {category}
                                        </span>
                                        <span className="text-slate-700 font-mono">/</span>
                                        <span className="text-sm font-bold text-slate-300">
                                            {subcategory}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Urgency Vector</p>
                                        <span className={`px-3 h-6 flex items-center justify-center rounded-full text-[10px] font-black uppercase tracking-wider border ${priorityColor} w-max`}>
                                            {priority}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Destination Node</p>
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
                                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span className="truncate">{assignedTeam}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Technical Entity Signal Harvesting Mapping */}
                    <div className="space-y-6 w-full">
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                            <CardContent className="p-6 sm:p-8">
                                <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider mb-5">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    Technical Signals Detected
                                </h3>
                                
                                {Object.keys(groupedEntities).length > 0 ? (
                                    <div className="space-y-4">
                                        {Object.entries(groupedEntities).map(([label, texts]) => (
                                            <div key={label} className="space-y-1.5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-0.5">{label}</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {texts.map((t, idx) => (
                                                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-white/[0.02] border border-white/5 text-slate-300 text-xs font-bold flex items-center gap-1.5 font-mono shadow-inner">
                                                            <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs font-medium text-slate-500 italic block py-2">No distinctive signature entities matched inside context.</span>
                                )}

                                {/* Environmental Device Telemetry Logs */}
                                {aiTicket.env_metadata && (
                                    <div className="mt-6 p-4 rounded-2xl border border-white/5 bg-white/[0.01] shadow-inner space-y-3">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest m-0 flex items-center gap-1.5">
                                            <Terminal className="w-3.5 h-3.5" /> Environmental Telemetry Logs
                                        </h4>
                                        <div className="space-y-2 font-mono text-[11px]">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-slate-500 font-bold">Node IP Block:</span>
                                                <span className="text-indigo-400 font-black truncate">{aiTicket.env_metadata.ip || '127.0.0.1'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-slate-500 font-bold">Client Core Signal:</span>
                                                <span className="text-slate-400 truncate max-w-[180px]" title={aiTicket.env_metadata.user_agent}>
                                                    {aiTicket.env_metadata.user_agent ? aiTicket.env_metadata.user_agent.split(' ').slice(0, 2).join(' ') : 'SECURE_NODE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Graphical Screen Capture Text Array */}
                                {aiTicket.ocrText && (
                                    <div className="mt-4 p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                            <ImageIcon className="w-3.5 h-3.5" /> Frame Injection Token OCR
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {aiTicket.ocrText.split(/\n|,/).filter(Boolean).map((line, idx) => {
                                                const trimmed = line.trim();
                                                if (!trimmed) return null;
                                                return (
                                                    <span key={idx} className="px-2.5 py-1 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">
                                                        {trimmed}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Probability Matrix Confidence Bar */}
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                            <CardContent className="p-6 sm:p-8 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider">
                                        <Activity className="w-4 h-4 text-blue-400" />
                                        Probability Confidence
                                    </h3>
                                    <span className="text-sm font-black text-blue-400 font-mono">{confidence}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden shadow-inner relative">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${confBarColor} shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                                        style={{ width: `${confidence}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Collapsible: Logic Inference Transparency Explainer Block */}
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setExplainerOpen(!explainerOpen)}
                        className="w-full p-6 bg-transparent border-none cursor-pointer flex items-center justify-between hover:bg-white/[0.01] transition-colors text-left"
                    >
                        <span className="text-sm font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            Model Path Logic Transparency
                        </span>
                        <ChevronDown className="w-5 h-5 text-slate-500 transition-transform duration-300" style={{ transform: explainerOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    <div className="transition-all duration-300 ease-in-out overflow-hidden" style={{ maxHeight: explainerOpen ? '500px' : '0', opacity: explainerOpen ? 1 : 0 }}>
                        <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-5 border-t border-white/[0.05] pt-5">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-0.5">Matched Weight Triggers</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {signalTexts.length > 0 ? signalTexts.map((s, idx) => (
                                        <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-bold font-mono">
                                            {s}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-slate-500 italic">No targeted signal arrays matched inside weights.</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-0.5">Structural Branch Execution Path</p>
                                <span className="inline-flex px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-slate-300">
                                    {patternMatch}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-0.5">Confidence Matrix Assessment</p>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed italic m-0">
                                    "{confidenceExplanation}"
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 6. Active Payload Modification Workspace Terminal Section */}
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
                    <CardContent className="p-6 sm:p-8 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider m-0">
                                <AlertCircle className="w-4 h-4 text-emerald-400" />
                                Adjust Context Scope
                            </h3>
                            <button
                                type="button"
                                onClick={handleUpdate}
                                className="text-xs font-black uppercase tracking-wider text-emerald-400 py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all cursor-pointer shrink-0 w-max"
                            >
                                Re-Index Parameters
                            </button>
                        </div>
                        <textarea
                            value={editedIssue}
                            onChange={(e) => setEditedIssue(e.target.value)}
                            className="w-full min-h-[110px] p-4 border border-white/10 bg-white/[0.01] text-white placeholder-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm font-medium resize-none leading-relaxed transition-all shadow-inner"
                            placeholder="Introduce alternate technical descriptors or fix structural data boundaries..."
                        />
                    </CardContent>
                </Card>

                {/* 7. Pipeline Continuation Link Switch Control */}
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleContinue}
                        className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/10 active:scale-[0.99] transition-all border-none cursor-pointer uppercase tracking-wider"
                    >
                        <span>Continue Pipeline</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AIUnderstanding;
