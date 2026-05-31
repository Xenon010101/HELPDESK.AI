import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldAlert, Loader2, Lock } from "lucide-react";
import useAuthStore from "../store/authStore";
import { supabase } from "../lib/supabaseClient";

/**
 * MasterAdminLogin — Restricted security gateway portal.
 */
function MasterAdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const { login, logout, profile } = useAuthStore();

    useEffect(() => {
        if (profile?.role === "master_admin") {
            navigate("/master-admin/dashboard", { replace: true });
        }
    }, [profile, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        setError("");
        setIsSubmitting(true);

        try {
            const { user: authUser } = await login(email, password);

            if (!authUser) {
                setError("Authentication failed. Please check your credentials.");
                return;
            }

            const { data: dbProfile, error: profileError } = await supabase
                .from("profiles")
                .select("role, status")
                .eq("id", authUser.id)
                .single();

            if (profileError || !dbProfile) {
                await logout();
                setError("Access denied. No profile found for this account.");
                return;
            }

            if (dbProfile.role !== "master_admin") {
                await logout();
                setError("Access denied. This portal is restricted.");
                return;
            }

            navigate("/master-admin/dashboard", { replace: true });
        } catch (err) {
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Background Security Grid and Ambient Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-700/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.02]"
                    style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-sm"
            >
                {/* Minimal Shield Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 shadow-xl">
                        <Lock className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h1 className="text-white text-2xl font-black tracking-tight font-syne">
                        Restricted Access
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Authorized Personnel Only
                    </p>
                </div>

                {/* Form Wrapper Card */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl relative">
                    
                    {/* Error Banner */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-5 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-left overflow-hidden"
                            >
                                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <p className="text-rose-400 text-sm font-medium leading-snug">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* Email Input */}
                        <div className="space-y-2 text-left">
                            <label
                                htmlFor="ma-email"
                                className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                            >
                                Security Email
                            </label>
                            <input
                                id="ma-email"
                                type="email"
                                autoComplete="username"
                                placeholder="root@infrastructure.local"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 bg-white/[0.02] border border-white/10 text-white placeholder:text-slate-700 rounded-xl px-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2 text-left">
                            <label
                                htmlFor="ma-password"
                                className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                            >
                                Cryptographic Key
                            </label>
                            <div className="relative">
                                <input
                                    id="ma-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 bg-white/[0.02] border border-white/10 text-white placeholder:text-slate-700 rounded-xl px-4 pr-12 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-2 border-none bg-transparent cursor-pointer"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Action */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-indigo-600/10 active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer uppercase tracking-wider"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                "Authenticate"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footnote Warning */}
                <p className="text-center text-slate-700 text-[10px] uppercase tracking-widest mt-6 select-none font-medium">
                    Unauthorized access entry vectors are recorded.
                </p>
            </motion.div>
        </div>
    );
}

export default MasterAdminLogin;
