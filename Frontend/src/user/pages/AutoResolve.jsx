import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, CheckCircle2, XCircle, Send, RefreshCcw, ShieldCheck } from 'lucide-react';
import useTicketStore from '../../store/ticketStore';

function AutoResolve() {
    const { aiTicket } = useTicketStore();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [currentOptions, setCurrentOptions] = useState([]);
    const [isFinal, setIsFinal] = useState(false);
    const scrollRef = useRef(null);

    const fetchNextStep = async (history = []) => {
        setIsThinking(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/ai/troubleshoot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: aiTicket.summary,
                    category: aiTicket.category,
                    history: history
                })
            });
            const data = await response.json();

            setMessages(prev => [...prev, { role: 'bot', text: data.step_text }]);
            setCurrentOptions(data.options || []);
            setIsFinal(data.is_final);
        } catch (error) {
            console.error("Troubleshooting Error:", error);
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "I encountered an error connecting to the AI. Let's try basic troubleshooting first."
            }]);
            setCurrentOptions(["My internet is working", "I'm not sure"]);
        } finally {
            setIsThinking(false);
        }
    };

    useEffect(() => {
        if (!aiTicket) {
            navigate('/create-ticket');
            return;
        }

        if (messages.length === 0) {
            fetchNextStep([]);
        }
    }, [aiTicket, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    const handleUserChoice = (choice) => {
        const newUserMsg = { role: 'user', text: choice };
        const updatedHistory = [...messages, newUserMsg];
        setMessages(prev => [...prev, newUserMsg]);
        setCurrentOptions([]);
        fetchNextStep(updatedHistory);
    };

    if (!aiTicket) return null;

    return (
        <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950 relative font-sans">
            {/* Ambient Background Glow Layer */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Header */}
            <div className="bg-slate-950/80 backdrop-blur-md border-b border-white/[0.05] px-6 sm:px-8 py-4 flex items-center justify-between shadow-2xl relative z-10 shrink-0 text-left">
                <div className="flex items-center gap-3.5">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                        <Bot className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-base font-black text-white uppercase tracking-wider font-syne">Troubleshooting Assistant</h1>
                        <p className="text-xs text-slate-400 font-medium max-w-xs sm:max-w-md truncate">Auto-Resolution: {aiTicket.summary}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Guided Mode</span>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth relative z-10 customize-scrollbar"
            >
                {messages.map((msg, idx) => {
                    const isBot = msg.role === 'bot';
                    return (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${!isBot ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3.5 max-w-[75%] ${!isBot ? 'flex-row-reverse' : 'flex-row'} text-left`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
                                    isBot 
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/10' 
                                        : 'bg-white/[0.02] border-white/10 text-slate-400 shadow-black/40'
                                }`}>
                                    {isBot ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div className={`px-5 py-4 rounded-2xl text-sm sm:text-base font-medium leading-relaxed shadow-lg ${
                                    isBot
                                        ? 'bg-white/[0.02] border border-white/[0.06] text-slate-200 rounded-tl-none backdrop-blur-md'
                                        : 'bg-emerald-600 text-white border border-transparent rounded-tr-none shadow-emerald-600/10'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Thinking Animation */}
                {isThinking && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start text-left"
                    >
                        <div className="flex gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/10">
                                <Bot size={18} />
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.06] px-5 py-4 h-12 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-lg backdrop-blur-md">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer / Input Controller Panel */}
            <div className="bg-white/[0.01] border-t border-white/[0.05] p-6 shadow-2xl backdrop-blur-xl relative z-10 shrink-0">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        {!isFinal ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-wrap gap-3 justify-center"
                            >
                                {currentOptions.map((option, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={isThinking}
                                        onClick={() => handleUserChoice(option)}
                                        className="px-6 h-12 bg-white/[0.02] border border-white/10 text-slate-200 font-bold rounded-xl hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl flex items-center gap-2.5 group cursor-pointer text-xs uppercase tracking-wider border-none"
                                    >
                                        <span>{option}</span>
                                        <Send size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-400" />
                                    </button>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full"
                            >
                                <button
                                    type="button"
                                    onClick={() => navigate('/resolved')}
                                    className="w-full sm:w-auto px-8 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-600/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border-none cursor-pointer text-xs uppercase tracking-wider"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>Yes, It Works</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/ticket-tracking')}
                                    className="w-full sm:w-auto px-8 h-14 bg-white/5 border border-white/10 text-slate-200 font-bold rounded-xl hover:bg-white/10 hover:border-white/20 shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                                >
                                    <XCircle size={16} className="text-slate-400" />
                                    <span>Still Not Working</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="w-full sm:w-auto h-14 px-5 text-slate-500 hover:text-emerald-400 transition-colors bg-transparent border-none cursor-pointer flex items-center justify-center"
                                    aria-label="Reset session execution matrix"
                                >
                                    <RefreshCcw size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Custom scrollbar interface properties configuration overrides */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .customize-scrollbar::-webkit-scrollbar { width: 6px; }
                .customize-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .customize-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 99px; }
                .customize-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }
            `}} />
        </main>
    );
}

export default AutoResolve;
