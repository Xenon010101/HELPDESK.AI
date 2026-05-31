import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User, CheckCircle2, Send, ShieldCheck, FileText, BotIcon, Paperclip, Mic, Loader2, LifeBuoy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useTicketStore from '../../store/ticketStore';
import { Card, CardContent } from "../../components/ui/card";
import { askAI } from '../../services/aiAssistant';
import useToastStore from '../../store/toastStore';

const Shimmer = ({ className = "" }) => (
    <div className={`relative overflow-hidden rounded-lg bg-white/5 ${className}`}>
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
            <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
                <CardContent className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <Shimmer className="w-12 h-12 rounded-xl" />
                        <div className="space-y-2">
                            <Shimmer className="h-4 w-32" />
                            <Shimmer className="h-3 w-48" />
                        </div>
                    </div>
                    <div className="space-y-3 pt-4">
                        <Shimmer className="h-5 w-full" />
                        <Shimmer className="h-5 w-5/6" />
                        <Shimmer className="h-5 w-4/5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);

const AutoResolveChat = () => {
    const { aiTicket } = useTicketStore();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isFinal, setIsFinal] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToastStore();
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading && !aiTicket) {
            navigate('/create-ticket');
            return;
        }

        if (aiTicket && aiTicket.status !== 'auto_resolve') {
            useTicketStore.getState().setAITicket({ ...aiTicket, status: 'auto_resolve' });
        }

        const generateInitialPlan = async () => {
            setIsThinking(true);
            try {
                const prompt = `Based on the incident report, generate a 4-step troubleshooting plan. Focus on high-level actions. Format clearly with numbered steps 1-4.`;
                const response = await askAI(prompt, aiTicket, []);
                const lines = response.split('\n');
                const newSteps = [];
                let id = 1;

                for (const line of lines) {
                    if (id > 4) break;
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.length < 5) continue;

                    const cleaned = trimmed
                        .replace(/^\*{1,2}/, '')
                        .replace(/\*{1,2}$/, '')
                        .replace(/\^{1,3}\s*/, '')
                        .replace(/^[\d]+[.)]\s*/, '')
                        .replace(/^[-*•]\s*/, '')
                        .replace(/^Step\s*\d+[:.)]\s*/i, '')
                        .trim();

                    const isStep = /^\d+[.)]\s/.test(trimmed)
                        || /^[-*•]\s/.test(trimmed)
                        || /^\*{1,2}\d/.test(trimmed)
                        || /^#/.test(trimmed)
                        || /^Step\s*\d/i.test(trimmed);

                    if (isStep && cleaned.length > 5) {
                        newSteps.push({ id: id++, task: cleaned, completed: false });
                    }
                }

                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages([{
                    role: 'bot',
                    text: `Hello! I've analyzed your request: "${aiTicket.summary}". I've put together a 4-step troubleshooting plan to resolve this. How would you like to start?`,
                    timestamp: now
                }]);

            } catch (error) {
                console.error("AI Plan Generation Failed:", error);
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setMessages([{
                    role: 'bot',
                    text: `I've analyzed your request. I've prepared a standard troubleshooting plan for "${aiTicket.summary}". Let's start with the first step.`,
                    timestamp: now
                }]);
            } finally {
                setIsThinking(false);
            }
        };

        if (!isLoading && aiTicket && messages.length === 0) {
            generateInitialPlan();
        }
    }, [aiTicket, navigate, messages.length, isLoading]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    const handleSendMessage = async (textOverride, imageOverride = null) => {
        const text = textOverride || inputText;
        if (!text.trim() && !imageOverride) return;

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newUserMsg = {
            role: 'user',
            text: text,
            image: imageOverride,
            timestamp: now
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputText('');
        setIsThinking(true);

        try {
            const aiResponse = await askAI(text || "Sent an image for analysis", aiTicket, messages, imageOverride);
            const botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setMessages(prev => [...prev, { role: 'bot', text: aiResponse, timestamp: botNow }]);

            const lowerResponse = String(aiResponse || '').toLowerCase();
            if (lowerResponse.includes("resolved") || lowerResponse.includes("successfully")) {
                setIsFinal(true);
            }

        } catch (error) {
            console.error("Troubleshooting Error:", error);
            const botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "I'm having a bit of trouble concentrating. Could you try sending that again?",
                timestamp: botNow
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleSendMessage("I've uploaded a screenshot for you to check.", reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleMic = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('Voice interface unavailable: Browser lacks speech protocols.', 'warning');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => setInputText(event.results[0][0].transcript);
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        if (isListening) recognition.stop();
        else recognition.start();
    };

    if (isLoading) return <SkeletonLoader />;
    if (!aiTicket) return null;

    return (
        <div className="min-h-screen bg-slate-950 pb-12 pt-24 px-4 sm:px-6 relative overflow-hidden font-sans">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .customize-scrollbar::-webkit-scrollbar { width: 6px; }
                .customize-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .customize-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 99px; }
                .customize-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }
            `}} />

            {/* Ambient System Glow Blocks */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="max-w-4xl mx-auto relative z-10 w-full">
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-2xl flex flex-col h-[780px] overflow-hidden">
                    
                    {/* Header Matrix Node */}
                    <div className="px-6 sm:px-10 py-5 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between backdrop-blur-md shrink-0 text-left">
                        <div className="flex items-center gap-4">
                            <motion.div
                                initial={{ rotate: -5, scale: 0.95 }}
                                animate={{ rotate: 0, scale: 1 }}
                                className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"
                            >
                                <BotIcon size={22} />
                            </motion.div>
                            <div className="space-y-0.5">
                                <h2 className="text-base font-black text-white tracking-wider font-syne uppercase italic m-0">
                                    Assistant // AI
                                </h2>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 m-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                    Neural Connection Active
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/ticket-tracking')}
                            className="group h-10 px-5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-xl"
                        >
                            <LifeBuoy size={14} className="group-hover:rotate-45 transition-transform" />
                            <span>Escalate Route</span>
                        </button>
                    </div>

                    {/* Chronological Transmission View Stream */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 space-y-8 customize-scrollbar"
                    >
                        <AnimatePresence>
                            {messages.map((msg, idx) => {
                                const isBot = msg.role === 'bot';
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex flex-col ${!isBot ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`flex gap-4 max-w-[80%] ${!isBot ? 'flex-row-reverse' : 'flex-row'} text-left items-start`}>
                                            <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-md ${
                                                isBot ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.02] border-white/10 text-slate-400'
                                            }`}>
                                                {isBot ? <BotIcon size={14} /> : <User size={14} />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className={`p-5 rounded-[1.75rem] text-sm sm:text-base font-medium leading-relaxed shadow-lg ${
                                                    isBot
                                                        ? 'bg-white/[0.02] border border-white/[0.06] text-slate-200 rounded-tl-none backdrop-blur-md font-sans'
                                                        : 'bg-emerald-600 border border-transparent text-white rounded-tr-none shadow-emerald-600/10 font-sans'
                                                }`}>
                                                    {msg.image && (
                                                        <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                                            <img src={msg.image} alt="Uplink payload frame" className="max-w-full h-auto" />
                                                        </div>
                                                    )}
                                                    {isBot ? (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                ul: ({ ...props }) => <ul className="list-disc ml-4 space-y-2 mb-3 font-medium text-slate-300" {...props} />,
                                                                ol: ({ ...props }) => <ol className="list-decimal ml-4 space-y-2 mb-3 font-medium text-slate-300" {...props} />,
                                                                li: ({ ...props }) => <li className="mb-0.5 leading-relaxed" {...props} />,
                                                                h1: ({ ...props }) => <h1 className="text-base font-black mb-3 mt-3 text-white font-syne uppercase tracking-wider" {...props} />,
                                                                h2: ({ ...props }) => <h2 className="text-sm font-black mb-2 mt-2 uppercase tracking-widest text-emerald-400 text-xs font-syne" {...props} />,
                                                                p: ({ ...props }) => <p className="mb-3 last:mb-0 text-slate-300 font-medium leading-relaxed" {...props} />,
                                                                code: ({ inline, ...props }) => (
                                                                    inline
                                                                        ? <code className="bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-emerald-400 border border-emerald-500/10" {...props} />
                                                                        : <code className="block bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs mb-4 border border-white/5 shadow-inner overflow-x-auto text-left" {...props} />
                                                                ),
                                                                strong: ({ ...props }) => <strong className="font-extrabold text-white" {...props} />
                                                            }}
                                                        >
                                                            {msg.text}
                                                        </ReactMarkdown>
                                                    ) : (
                                                        <p className="m-0 font-medium leading-relaxed">{msg.text}</p>
                                                    )}
                                                </div>
                                                <div className={`block text-[10px] font-black uppercase tracking-widest text-slate-600 px-1 pt-0.5 ${!isBot ? 'text-right' : 'text-left'}`}>
                                                    {msg.timestamp}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {isThinking && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start items-center gap-3.5 pl-12 text-left"
                            >
                                <div className="bg-white/[0.02] border border-white/[0.06] px-5 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-lg backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Processing...</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Operational Command Controller Box */}
                    <div className="p-6 sm:p-8 border-t border-white/[0.05] bg-white/[0.01] backdrop-blur-md shrink-0">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <AnimatePresence mode="wait">
                                {isFinal && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="flex flex-col items-center gap-4 pb-2"
                                    >
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                            <CheckCircle2 size={12} className="text-emerald-400" />
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest m-0">Target Sequence Met?</p>
                                        </div>
                                        <div className="flex flex-wrap gap-4 justify-center w-full">
                                            <button
                                                type="button"
                                                onClick={() => navigate('/resolved')}
                                                className="group px-8 h-13 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-600/10 hover:bg-emerald-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 border-none cursor-pointer"
                                            >
                                                <ShieldCheck size={16} />
                                                <span>Confirm Resolution</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/ticket-tracking')}
                                                className="group px-8 h-13 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                                            >
                                                <LifeBuoy size={16} />
                                                <span>Request Human Triage</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Main Interactive Input Block Field */}
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 blur-xl opacity-0 group-within:opacity-10 transition-opacity duration-700 pointer-events-none" />
                                <div className="relative flex items-center gap-3 bg-white/[0.02] border border-white/10 focus-within:border-emerald-500/50 rounded-[2.5rem] p-2 pr-3 shadow-2xl transition-all duration-300 backdrop-blur-xl">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-white transition-colors border-none bg-transparent cursor-pointer shrink-0"
                                        title="Attach system execution snippet"
                                    >
                                        <Paperclip size={18} />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                    </button>
                                    
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Briefly detail error strings or response logs here..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-white placeholder-slate-600 px-1 outline-none"
                                    />
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={toggleMic}
                                            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer
                                                ${isListening
                                                    ? 'bg-rose-600 border-transparent text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'}`}
                                            aria-label="Activate voice transcription"
                                        >
                                            <Mic size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage()}
                                            disabled={!inputText.trim()}
                                            className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-slate-950 hover:bg-emerald-500 hover:scale-105 active:scale-95 disabled:opacity-25 disabled:scale-100 disabled:pointer-events-none transition-all duration-300 border-none cursor-pointer"
                                        >
                                            <Send size={16} className="translate-x-0.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {!isFinal && (
                                <div className="text-center w-full">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] m-0 select-none opacity-50">
                                        Heuristics loop evaluates message array metrics dynamically
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AutoResolveChat;
