import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Home, ShieldCheck, Clock, Briefcase, Power, Zap } from 'lucide-react';
import useTicketStore from '../../store/ticketStore';
import { Card, CardContent, CardHeader } from "../../components/ui/card";

function Resolved() {
    const { aiTicket, addAutoResolvedTicket } = useTicketStore();
    const navigate = useNavigate();
    const [isInitializing, setIsInitializing] = useState(true);
    const [displayRecord, setDisplayRecord] = useState(null);
    const hasAdded = useRef(false);

    useEffect(() => {
        if (!aiTicket) {
            navigate('/create-ticket');
            return;
        }

        if (!hasAdded.current) {
            const record = {
                resolution_id: Math.floor(100000 + Math.random() * 900000),
                summary: aiTicket.summary,
                category: aiTicket.category,
                resolution_type: "Autonomous Heuristic",
                resolved_at: new Date().toISOString()
            };
            addAutoResolvedTicket(record);
            setDisplayRecord(record);
            hasAdded.current = true;
        }
        setIsInitializing(false);
    }, [aiTicket, navigate, addAutoResolvedTicket]);

    if (isInitializing || !displayRecord) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
                </motion.div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Finalizing Resolution Matrix...</h2>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-20 relative overflow-hidden">
            {/* Ambient Background Matrix */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Resolution Icon Node */}
                <div className="flex justify-center mb-10">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                    </div>
                </div>

                <div className="text-center mb-12 space-y-3">
                    <h1 className="text-3xl font-black text-white tracking-tight font-syne uppercase italic">
                        Resolved Autonomously
                    </h1>
                    <p className="text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                        Neural routing engine has successfully verified and patched the reported anomaly parameters.
                    </p>
                </div>

                {/* Audit Record Card */}
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl mb-10 overflow-hidden">
                    <CardHeader className="bg-white/[0.02] px-8 py-5 border-b border-white/[0.05] flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-syne">Resolution Audit Record</span>
                        </div>
                        <span className="text-emerald-400 font-mono text-xs font-black">#{displayRecord.resolution_id}</span>
                    </CardHeader>
                    <CardContent className="p-8 grid grid-cols-2 gap-8 bg-black/20">
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                                <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
                                    <Briefcase size={14} className="text-emerald-500" />
                                    {displayRecord.category}
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Resolution Protocol</label>
                                <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest inline-flex">
                                    {displayRecord.resolution_type}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Completion Timestamp</label>
                                <div className="flex items-center gap-2 font-bold text-slate-200 text-sm font-mono">
                                    <Clock size={14} className="text-emerald-500" />
                                    {new Date(displayRecord.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Pipeline State</label>
                                <div className="text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={12} /> Closed & Indexed
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Control Nodes */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-8 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-[10px] border-none cursor-pointer"
                    >
                        <Home size={16} /> Return to Core
                    </button>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('currentUser');
                            navigate('/');
                        }}
                        className="px-8 h-14 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-black rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-[10px] border-none cursor-pointer"
                    >
                        <Power size={16} /> Terminate
                    </button>
                </div>
            </motion.div>
        </main>
    );
}

export default Resolved;
