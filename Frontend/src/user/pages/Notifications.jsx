import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, MessageSquare, Ticket, ArrowLeft, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useTicketStore from "../../store/ticketStore";
import { Card } from "../../components/ui/card";
import { formatTicketId } from "../../utils/format";

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { notifications = [], markNotificationsRead } = useTicketStore();

    const getIcon = (type) => {
        switch (type) {
            case 'resolution': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'message': return <MessageSquare className="w-5 h-5 text-blue-400" />;
            case 'new_ticket': return <Ticket className="w-5 h-5 text-amber-400" />;
            default: return <Bell className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden font-sans">
            {/* Ambient Background Infrastructure */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 pt-28 relative z-10 text-left">
                {/* Header Module */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-white tracking-tight font-syne uppercase flex items-center gap-3">
                            <Bell className="text-emerald-400 w-8 h-8" /> Signal Feed
                        </h1>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                            Monitoring asynchronous ticket updates and heuristic resolution logs.
                        </p>
                    </div>
                    <button
                        onClick={() => markNotificationsRead()}
                        className="px-5 h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all cursor-pointer shadow-xl active:scale-95 shrink-0"
                    >
                        Synchronize All Read
                    </button>
                </div>

                {/* Notifications Array */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {notifications.length > 0 ? (
                            notifications.map((notif, idx) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card
                                        onClick={() => navigate(`/ticket/${notif.ticketId}`)}
                                        className={`p-6 rounded-[2rem] border transition-all cursor-pointer group flex gap-5 items-start shadow-2xl backdrop-blur-xl ${
                                            !notif.read 
                                            ? 'border-emerald-500/30 bg-emerald-500/[0.03]' 
                                            : 'border-white/[0.06] bg-white/[0.01] hover:border-white/15'
                                        }`}
                                    >
                                        <div className={`p-3.5 rounded-2xl shrink-0 border transition-colors ${
                                            !notif.read 
                                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                                            : 'bg-white/[0.02] border-white/5 group-hover:bg-white/5'
                                        }`}>
                                            {getIcon(notif.type)}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <h3 className={`text-base tracking-tight font-syne uppercase ${
                                                    !notif.read ? 'font-black text-white' : 'font-bold text-slate-400'
                                                }`}>
                                                    {notif.title}
                                                </h3>
                                                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md">
                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed m-0">
                                                {notif.message}
                                            </p>
                                            
                                            <div className="flex items-center gap-3 pt-4">
                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-3 h-6 flex items-center rounded-full uppercase tracking-widest border border-emerald-500/20">
                                                    Node #{formatTicketId(notif.ticketId)}
                                                </span>
                                                {!notif.read && (
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        ) : (
                            /* Empty State Terminal */
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-24 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10 shadow-inner"
                            >
                                <div className="w-20 h-20 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                    <Inbox className="w-8 h-8 text-slate-700" />
                                </div>
                                <h3 className="text-xl font-black text-white font-syne uppercase tracking-wider mb-2">Null Signal detected</h3>
                                <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                                    Operational queue is currently clear. Real-time telemetry will populate this node upon state changes.
                                </p>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="mt-10 px-8 h-12 bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 transition-all cursor-pointer shadow-xl"
                                >
                                    Return to Core
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default NotificationsPage;
