import React from 'react';
import { motion } from 'framer-motion';
import WelcomeCard from "../components/WelcomeCard";
import QuickActions from "../components/QuickActions";
import RecentTickets from "../components/RecentTickets";
import OnboardingTour from "../components/OnboardingTour";
import useAuthStore from "../../store/authStore";

const Dashboard = () => {
    const { profile } = useAuthStore();
    const userName = profile?.full_name || "Authorized User";

    return (
        <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden font-sans">
            {/* Ambient Background Infrastructure */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} 
            />

            <main className="pt-24 px-4 sm:px-8 md:px-10 relative z-10">
                <div className="w-full max-w-6xl mx-auto flex flex-col gap-10">
                    
                    {/* Hero Diagnostic Node */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <WelcomeCard userName={userName} />
                    </motion.section>

                    {/* Quick Support Heuristics Grid */}
                    <motion.section 
                        id="tour-quick-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-5 px-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                                <span className="w-8 h-px bg-white/10" />
                                Quick Support Actions
                            </h2>
                        </div>
                        <QuickActions />
                    </motion.section>

                    {/* Recent Telemetry Table */}
                    <motion.section 
                        id="tour-recent-tickets"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <RecentTickets />
                    </motion.section>

                    {/* System Footer Node */}
                    <footer className="mt-12 text-center border-t border-white/5 pt-8">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] select-none">
                            &copy; {new Date().getFullYear()} {profile?.company || 'HelpDesk.ai Architecture'}. All telemetry systems operational.
                        </p>
                        <div className="flex justify-center gap-4 mt-4 opacity-30 grayscale contrast-125">
                            {/* Visual decorative element for "enterprise" feel */}
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="w-2 h-2 rounded-full bg-slate-700" />
                            <div className="w-2 h-2 rounded-full bg-slate-700" />
                        </div>
                    </footer>
                </div>
            </main>

            <OnboardingTour />
        </div>
    );
};

export default Dashboard;
