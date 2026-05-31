import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import useAuthStore from "../store/authStore";
import { Clock, LogOut, ShieldAlert, CheckCircle2, MessageSquare, Building2, User } from "lucide-react";

/**
 * UserLobby — Waiting room for verified users pending company admin approval.
 * Route: /user-lobby
 */
function UserLobby() {
    const { profile, logout } = useAuthStore();
    const navigate = useNavigate();
    const [status, setStatus] = useState(profile?.status || "pending_approval");
    const [isTransitioning, setIsTransitioning] = useState(false);

    const currentStatus = profile?.status || status;

    useEffect(() => {
        if (!profile || profile.role !== "user") {
            navigate("/login");
            return;
        }

        if (currentStatus === "active") {
            setIsTransitioning(true);
            const timer = setTimeout(() => navigate("/dashboard"), 2000);
            return () => clearTimeout(timer);
        }

        const channel = supabase
            .channel(`profile-user-lobby-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${profile.id}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    setStatus(newStatus);

                    if (newStatus === 'active') {
                        setIsTransitioning(true);
                        setTimeout(() => navigate('/dashboard'), 2000);
                    }
                }
            )
            .subscribe();

        const pollInterval = setInterval(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', profile.id)
                .single();

            if (data && data.status !== currentStatus) {
                setStatus(data.status);
                if (data.status === 'active') {
                    setIsTransitioning(true);
                    setTimeout(() => navigate('/dashboard'), 2000);
                }
            }
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [profile, navigate, currentStatus]);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const isRiteshPrivateLtd = profile?.company === "Ritesh Private Limited";
    const adminPhone = "918464931322";
    const waMessage = `Hey Ritesh, I just verified my email and I want you to approve this email address. I registered to ${profile?.company || "my company"}. My email is: ${profile?.email}`;
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(waMessage)}`;

    const getStatusContent = () => {
        if (currentStatus === 'active' || isTransitioning) {
            return {
                icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
                title: "Account Approved!",
                color: "emerald",
                desc: "Redirecting to your application dashboard..."
            };
        }
        if (currentStatus === 'rejected') {
            return {
                icon: <ShieldAlert className="w-10 h-10 text-rose-500" />,
                title: "Registration Declined",
                color: "rose",
                desc: "Unfortunately, your request to join this organization has been declined by the administrator."
            };
        }
        return {
            icon: <Clock className="w-10 h-10 text-amber-500" />,
            title: isRiteshPrivateLtd ? "Email Verified" : "Email Verified!",
            color: "amber",
            desc: isRiteshPrivateLtd 
                ? `You are now waiting for approval from the Ritesh Private Limited administrator node.`
                : `Your account is verified. We've notified your company administrators at ${profile?.company || "your company"}.`
        };
    };

    const content = getStatusContent();

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Ambient background blur */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-${content.color}-600/10 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000`} />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white/[0.03] border border-white/[0.08] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-2xl relative z-10 text-center"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStatus}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center"
                    >
                        {/* Interactive Status Icon Wrapper */}
                        <div className={`relative flex items-center justify-center w-20 h-20 mb-8 rounded-3xl bg-${content.color}-500/10 border border-${content.color}-500/20 shadow-lg`}>
                            {currentStatus === 'pending_approval' && !isTransitioning && (
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-2 border-dashed border-amber-500/30 rounded-3xl"
                                />
                            )}
                            {content.icon}
                        </div>

                        <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-syne">
                            {content.title}
                        </h1>
                        <p className="text-slate-400 text-base leading-relaxed mb-10 px-4">
                            {content.desc}
                        </p>

                        {/* Account Info Preview Metadata Block */}
                        <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 mb-10 flex flex-col gap-4 text-left">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <User size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">{profile?.full_name}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-1 rounded">User</span>
                            </div>
                            
                            <div className="h-px w-full bg-white/5" />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <Building2 size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200">{profile?.company}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full bg-${content.color}-500 ${currentStatus === 'pending_approval' ? 'animate-pulse' : ''}`} />
                                    <span className={`text-xs font-black uppercase tracking-tighter text-${content.color}-500`}>
                                        {currentStatus === 'pending_approval' ? 'Pending Review' : currentStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Escalation Action Routing Links */}
                        <div className="w-full space-y-4">
                            {currentStatus === 'pending_approval' && !isTransitioning && (
                                <div className="w-full">
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl shadow-xl shadow-green-500/10 transition-all duration-300 font-bold text-sm uppercase tracking-wider border-none no-underline cursor-pointer"
                                    >
                                        <MessageSquare className="w-5 h-5 fill-current" />
                                        <span>Request Approval via WhatsApp</span>
                                    </a>
                                    <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Initiates direct secure handshake transmission with admin node
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleLogout}
                                className="group flex items-center justify-center gap-2 w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-300 font-bold text-sm"
                            >
                                <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                <span>{currentStatus === 'rejected' ? 'Return to Login' : 'Sign Out'}</span>
                            </button>
                            
                            {!isTransitioning && (
                                <button
                                    onClick={handleLogout}
                                    className="text-xs font-bold text-slate-500 hover:text-emerald-500 transition-colors uppercase tracking-widest border-none bg-transparent cursor-pointer"
                                >
                                    Switch Account
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* Static Bottom Tracker Branding */}
            <p className="absolute bottom-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 select-none">
                Secure Enterprise Infrastructure
            </p>
        </div>
    );
}

export default UserLobby;
