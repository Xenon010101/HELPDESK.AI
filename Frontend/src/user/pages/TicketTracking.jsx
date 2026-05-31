import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, ShieldCheck, Clock, Loader2, ArrowRight } from 'lucide-react';
import useTicketStore from "../../store/ticketStore";
import useAuthStore from "../../store/authStore";
import { Card, CardContent } from "../../components/ui/card";
import TicketTimeline from "../components/TicketTimeline";
import apiClient from '../../services/apiClient';
import { API_CONFIG } from '../../config';
import { supabase } from '../../lib/supabaseClient';

const TicketTracking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { aiTicket, addTicket } = useTicketStore();
    const { user, profile } = useAuthStore();
    const [isCreating, setIsCreating] = useState(true);
    const [error, setError] = useState(null);
    const [createdTicket, setCreatedTicket] = useState(null);
    const hasCreated = useRef(false);
    const resolutionSteps = useMemo(() => location.state?.resolutionSteps || [], [location.state?.resolutionSteps]);

    const getSlaBreachAt = (priority = 'Medium') => {
        const hoursMap = { Critical: 2, High: 8, Medium: 24, Low: 72 };
        const slaHours = hoursMap[priority] || 24;
        return new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
    };


    useEffect(() => {
        if (!aiTicket) {
            navigate('/create-ticket');
            return;
        }

        const finalizeTracking = async () => {
            if (hasCreated.current) return;
            hasCreated.current = true;

            try {
                const isAutoResolved = aiTicket.auto_resolve || false;
                const status = isAutoResolved ? 'auto_resolved' : 'pending_human';

                const savePayload = {
                    user_id: user?.id,
                    subject: aiTicket.summary,
                    description: aiTicket.originalIssue || aiTicket.summary,
                    detected_language: aiTicket.source_language || 'en',
                    original_body: aiTicket.original_text || null,
                    category: aiTicket.category,
                    subcategory: aiTicket.subcategory,
                    priority: aiTicket.priority,
                    assigned_team: aiTicket.assigned_team,
                    status: status,
                    auto_resolve: isAutoResolved,
                    is_duplicate: aiTicket.duplicate_ticket?.is_duplicate || false,
                    is_potential_duplicate: aiTicket.is_potential_duplicate || aiTicket.duplicate_ticket?.is_potential_duplicate || false,
                    parent_ticket_id: aiTicket.parent_ticket_id || aiTicket.duplicate_ticket?.parent_ticket_id || aiTicket.duplicate_ticket?.duplicate_ticket_id || null,
                    confidence: aiTicket.confidence,
                    image_url: aiTicket.image_url || null,
                    company: profile?.company || null,
                    company_id: profile?.company_id || null,
                    sla_breach_at: aiTicket.sla_breach_at || getSlaBreachAt(aiTicket.priority),
                    source: aiTicket.source || 'text',
                    metadata: {
                        confidence: aiTicket.confidence,
                        entities: aiTicket.entities,
                        decision_factors: aiTicket.decision_factors,
                        ocr_text: aiTicket.ocr_text,
                        image_description: aiTicket.image_description
                    },
                    entities: aiTicket.entities,
                    solution_steps: resolutionSteps,
                    ocr_text: aiTicket.ocr_text || "",
                    needs_review: aiTicket.needs_review,
                    routing_confidence: aiTicket.confidence
                };

                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                const res = await axios.post(`${API_CONFIG.BACKEND_URL}/tickets/save`, savePayload, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (res.data?.ticket_id) {
                    const newTicket = { ...aiTicket, id: res.data.ticket_id, ticket_id: res.data.ticket_id, status };
                    addTicket(newTicket);
                    setCreatedTicket(newTicket);
                    setIsCreating(false);

                    setTimeout(() => {
                        navigate(`/ticket/${res.data.ticket_id}`);
                    }, 2500);
                } else {
                    throw new Error("Failed to retrieve ID from backend.");
                }
            } catch (err) {
                console.error("Tracking Error:", err);
                setError(err.message || "Failed to create ticket.");
                setIsCreating(false);
            }
        };

        finalizeTracking();
    }, [aiTicket, addTicket, navigate, user, profile?.company, profile?.company_id, resolutionSteps]);

    if (!aiTicket) return null;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 font-sans">
            <div className="w-full max-w-lg text-center space-y-8">
                
                {/* Visual Status Node */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full animate-pulse" />
                    <motion.div 
                        className="relative w-32 h-32 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl"
                        animate={{ scale: isCreating ? [1, 1.05, 1] : 1 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        {isCreating ? (
                            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                        ) : error ? (
                            <Clock className="w-12 h-12 text-rose-500" />
                        ) : (
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        )}
                    </motion.div>
                </div>

                {/* State Text */}
                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-white tracking-tight font-syne uppercase italic">
                        {isCreating ? "Escalating to Specialists" : error ? "Exception Detected" : "Successfully Indexed"}
                    </h1>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                        {isCreating
                            ? `We're assigning your ${aiTicket.category || 'support'} request to the correct neural routing node.`
                            : error
                                ? error
                                : "Your ticket payload has been successfully mapped. Redirecting to tracking interface..."
                        }
                    </p>
                </div>

                {/* Pipeline Progress Monitor */}
                <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-8 overflow-hidden shadow-2xl">
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-center gap-4 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>AI Analysis Phase Complete</span>
                            <span className="ml-auto text-slate-500">{aiTicket.category || 'General'}</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-widest ${isCreating ? 'text-slate-500' : error ? 'text-rose-500' : 'text-emerald-400'}`}>
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : error ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>{error ? 'Submission Fault' : 'Creating Support Ticket'}</span>
                            </div>
                            
                            <div className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-widest ${createdTicket ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {createdTicket ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                <span>{createdTicket ? `Routed to ${createdTicket.assigned_team}` : 'Agent Assignment Pending'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dynamic Timeline */}
                <AnimatePresence>
                    {createdTicket && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <TicketTimeline ticket={createdTicket} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TicketTracking;
