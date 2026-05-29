import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ShieldCheck, Heart, Sparkles, ArrowLeft, Target, Award, 
    Brain, Cpu, GitMerge, Users, ArrowRight, Activity, 
    Database, Network, Zap, Github
} from 'lucide-react';
import { Card } from '../components/ui/card';

const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function AboutUs() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#f6f8f7] pb-20 selection:bg-emerald-500 selection:text-white font-sans">
            {/* Header */}
            <header className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-md">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-xl font-black tracking-tighter text-slate-900 italic">HELPDESK.AI</h1>
                            <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">About</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-all bg-slate-50 hover:bg-emerald-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm"
                    >
                        <ArrowLeft size={14} /> Back to Home
                    </button>
                </div>
            </header>

            <main className="max-w-[1000px] mx-auto px-4 md:px-8 mt-16 space-y-32">
                
                {/* Hero Section */}
                <motion.section 
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="text-center max-w-3xl mx-auto space-y-6"
                >
                    <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-700 text-sm font-bold shadow-sm">
                        <Heart size={16} className="text-emerald-600" /> Our Mission
                    </motion.div>
                    <motion.h1 variants={fadeUpVariants} className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">
                        Pioneering <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400">Intelligent</span> Triage
                    </motion.h1>
                    <motion.p variants={fadeUpVariants} className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
                        At HELPDESK.AI, we strive to build local machine learning workflows that eliminate manual ticket tagging, priority guessing, and routing bottlenecks for modern businesses.
                    </motion.p>
                </motion.section>

                {/* Features Grid */}
                <motion.section 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="space-y-12"
                >
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-slate-900">Core Features</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">Built from the ground up to ensure maximum efficiency, security, and scalability for your support teams.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Target, title: "Self-Healing Backups", desc: "100% platform availability using offline sentence embeddings with fast Gemini failover pipelines.", bgClass: "bg-emerald-50", textClass: "text-emerald-600" },
                            { icon: Award, title: "Data Sovereignty", desc: "All ticket summaries and database timelines remain securely locked under regional cloud networks.", bgClass: "bg-blue-50", textClass: "text-blue-600" },
                            { icon: Brain, title: "Auto Categorization", desc: "Machine learning automatically routes tickets to the correct department without manual triage.", bgClass: "bg-purple-50", textClass: "text-purple-600" },
                            { icon: Activity, title: "Priority Detection", desc: "Sentiment analysis identifies urgent tickets and escalates them automatically.", bgClass: "bg-rose-50", textClass: "text-rose-600" },
                            { icon: Zap, title: "Smart Resolution", desc: "Suggests immediate solutions to common problems based on historical ticket data.", bgClass: "bg-amber-50", textClass: "text-amber-600" },
                            { icon: ShieldCheck, title: "Enterprise Security", desc: "Role-based access control with granular permissions for master-admins and support staff.", bgClass: "bg-slate-50", textClass: "text-slate-600" }
                        ].map((feat, idx) => (
                            <motion.div key={idx} variants={fadeUpVariants}>
                                <Card className="p-6 rounded-3xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 group h-full">
                                    <div className={`w-12 h-12 rounded-2xl ${feat.bgClass} ${feat.textClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <feat.icon size={24} />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg mb-3">{feat.title}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {feat.desc}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* AI Pipeline & Architecture */}
                <motion.section 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUpVariants}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-emerald-600 rounded-[3rem] transform -rotate-1 scale-105 opacity-10"></div>
                    <Card className="relative p-8 md:p-12 rounded-[3rem] border border-emerald-100 bg-white shadow-2xl shadow-emerald-900/5 overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Network size={200} />
                        </div>
                        <div className="relative z-10 max-w-2xl space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                <Cpu size={14} /> System Architecture
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Advanced AI Pipeline</h2>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                Our architecture is designed for resilience. When a ticket arrives, it passes through our local NLP models for immediate classification. If confidence is low or complex reasoning is required, the system seamlessly fails over to the Gemini API, ensuring 100% processing uptime.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                                    <Database className="text-blue-500 mb-3" />
                                    <h5 className="font-bold text-slate-800">1. Data Ingestion</h5>
                                    <p className="text-xs text-slate-500">Tickets, emails, and OCR attachments</p>
                                </div>
                                <div className="hidden sm:flex items-center justify-center text-slate-300">
                                    <ArrowRight />
                                </div>
                                <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                                    <Brain className="text-emerald-500 mb-3" />
                                    <h5 className="font-bold text-slate-800">2. Local Inference</h5>
                                    <p className="text-xs text-slate-500">Zero-shot classification & embeddings</p>
                                </div>
                                <div className="hidden sm:flex items-center justify-center text-slate-300">
                                    <ArrowRight />
                                </div>
                                <div className="flex-1 bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-2">
                                    <Sparkles className="text-purple-500 mb-3" />
                                    <h5 className="font-bold text-slate-800">3. Resolution</h5>
                                    <p className="text-xs text-slate-500">Automated routing and suggested replies</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.section>

                {/* Roadmap Section */}
                <motion.section 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="max-w-4xl mx-auto space-y-12"
                >
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-slate-900">Product Roadmap</h2>
                        <p className="text-slate-500">Our vision for the future of automated customer support.</p>
                    </div>

                    <div className="relative border-l-2 border-emerald-100 ml-4 md:ml-12 space-y-12 pb-8">
                        {[
                            { phase: "Phase 1: Foundation", title: "Core NLP Pipeline & Architecture", desc: "Establishing the local machine learning models, Supabase integrations, and basic ticket routing logic.", status: "completed" },
                            { phase: "Phase 2: Enhancement", title: "Smart Failover & Real-time UI", desc: "Integrating Gemini for complex queries, realtime WebSocket notifications, and the Master Admin dashboard.", status: "current" },
                            { phase: "Phase 3: Expansion", title: "Omnichannel & Integrations", desc: "Adding WhatsApp, Email parsing, and integrations with Jira/Slack for seamless workflow continuity.", status: "upcoming" },
                            { phase: "Phase 4: Enterprise", title: "Custom LLMs & Analytics", desc: "Fine-tuning localized models on company data, advanced BI dashboards, and enterprise SLAs.", status: "upcoming" }
                        ].map((item, idx) => (
                            <motion.div key={idx} variants={fadeUpVariants} className="relative pl-8 md:pl-12">
                                <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${item.status === 'completed' ? 'bg-emerald-500' : item.status === 'current' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                <div className="space-y-2">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${item.status === 'completed' ? 'text-emerald-600' : item.status === 'current' ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {item.phase}
                                    </span>
                                    <h4 className="text-xl font-bold text-slate-800">{item.title}</h4>
                                    <p className="text-slate-600 font-medium max-w-2xl">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Community Section */}
                <motion.section 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUpVariants}
                    className="pb-24"
                >
                    <Card className="p-10 md:p-16 rounded-[3rem] border border-slate-200 bg-slate-900 text-white text-center space-y-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/20">
                                <Users size={32} className="text-emerald-400" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Open Source & Community Driven</h2>
                            <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                                HELPDESK.AI thrives on community contributions. Whether you're fixing a bug, adding a feature, or improving documentation, we welcome developers of all skill levels.
                            </p>
                            <div className="pt-6">
                                <a 
                                    href="https://github.com/ritesh-1918/HELPDESK.AI" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 hover:text-emerald-700 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Github size={20} />
                                    Join us on GitHub
                                </a>
                            </div>
                        </div>
                    </Card>
                </motion.section>

            </main>
        </div>
    );
}
