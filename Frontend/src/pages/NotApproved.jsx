import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { ShieldX, LogOut, MailQuestion } from 'lucide-react';

const NotApproved = () => {
    const navigate = useNavigate();
    const { logout, profile } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isUser = profile?.role === 'user';
    const message = isUser
        ? "Your account request was rejected by your company's administrator."
        : "Your admin registration request was rejected by the system administrator.";

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Ambient Background Glow Layer */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]"
                style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-md bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl relative z-10"
            >
                {/* Visual Anchor Indicator */}
                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-lg">
                    <ShieldX size={36} />
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight font-syne uppercase">
                    Access Denied
                </h1>

                {/* Rejection Notification Context Block */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 mb-8 text-left shadow-inner">
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium m-0">
                        {message}
                    </p>
                </div>

                {/* Core Navigation Controls */}
                <div className="space-y-4">
                    <button
                        onClick={() => window.location.href = 'mailto:support@helpdesk.ai'}
                        className="w-full h-13 bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs"
                    >
                        <MailQuestion size={16} className="text-slate-400" />
                        <span>Contact Support</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full h-13 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xl shadow-rose-600/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border-none cursor-pointer uppercase tracking-wider text-xs"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.div>

            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 select-none">
                HelpDesk.ai Security System
            </p>
        </div>
    );
};

export default NotApproved;
