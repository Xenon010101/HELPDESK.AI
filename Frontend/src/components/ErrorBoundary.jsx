import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, copied: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error("[Unhandled Error Caught by Boundary]:", error, errorInfo);
    }

    handleCopyPayload = () => {
        const payload = {
            error: this.state.error?.toString() || "Unknown error",
            stack: this.state.error?.stack || "No stack trace available",
            componentStack: this.state.errorInfo?.componentStack || "No component stack available",
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
            .then(() => {
                this.setState({ copied: true });
                setTimeout(() => this.setState({ copied: false }), 2000);
            })
            .catch(err => {
                console.error("Failed to copy error payload:", err);
            });
    };

    handleReset = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-[#f8fafc] p-6 relative overflow-hidden font-sans">
                    {/* Background Orbs */}
                    <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none"></div>

                    <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10 text-center">
                        <div className="mb-6 flex justify-center">
                            <div className="bg-red-500/20 p-4 rounded-full border border-red-500/30 animate-pulse">
                                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-white">System Interrupted</h1>
                        <p className="text-slate-400 mb-6">Our Neural Engine encountered an unhandled execution exception. The diagnostic log has been secured.</p>

                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mb-6 text-left font-mono text-xs overflow-auto max-h-60 text-red-400 select-text">
                            <p className="font-bold text-white mb-2">Error: {this.state.error?.message || this.state.error?.toString()}</p>
                            <p className="text-slate-500 whitespace-pre">{this.state.error?.stack || "No stack trace secured."}</p>
                            {this.state.errorInfo?.componentStack && (
                                <p className="text-slate-600 mt-4 whitespace-pre">{this.state.errorInfo.componentStack}</p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={this.handleCopyPayload}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all duration-200 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white flex items-center justify-center gap-2"
                            >
                                {this.state.copied ? (
                                    <>
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Copied Diagnostics</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                        <span>Copy Diagnostics Payload</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-extrabold transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" />
                                </svg>
                                <span>Recover & Restart</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
