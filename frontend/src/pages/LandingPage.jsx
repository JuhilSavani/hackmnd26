import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "@/utils/hooks/useAuth";
import Loading from "@/utils/components/Loading";

export default function LandingPage() {
  const { auth, authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => {
    if (!authLoading && auth?.isAuthenticated) {
      navigate('/workspace');
    }
  }, [auth, authLoading, navigate]);

  if (authLoading || auth?.isAuthenticated) {
    return <Loading />
  }

  const toggleNote = (index) => {
    setActiveNote(prev => prev === index ? null : index);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] font-sans antialiased">
      <style>{`
        .glass-nav {
            background: rgba(9, 9, 11, 0.7);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(39, 39, 42, 0.5);
        }
        .hero-glow {
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Navigation */}
      <nav className="glass-nav fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
            <span className="font-semibold text-2xl tracking-tight">Sidekick</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a1a1aa]">
            <a href="#stack" className="hover:text-[#fafafa] transition-colors">Tech Stack</a>
            <a href="#system-design" className="hover:text-[#fafafa] transition-colors">Architecture</a>
            <a href="#developer-notes" className="hover:text-[#fafafa] transition-colors">Developer Notes</a>
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="hover:text-[#fafafa] transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-white/80 transition-colors hidden sm:block">Log in</Link>
            <Link to="/register" className="bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] hero-glow pointer-events-none -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#a1a1aa] mb-4 hover:border-white/20 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Open Source Engineering Project</span>
            <span className="w-px h-3 bg-white/10 mx-1"></span>
            <span className="text-white/60">v1.0.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-white to-white/60 pb-2">
            Exploring Conversational <br />
            <span className="text-white">Agentic Workflows</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed">
            An open-source reference architecture featuring cross-session conversational memory, autonomous tool execution, and real-time token streaming.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/workspace" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              Start Chatting
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              View Source
            </a>
          </div>
        </div>

        {/* Preview Image / Abstract Visual */}
        <div className="mt-20 max-w-5xl mx-auto rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm p-2 shadow-2xl relative">
          <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-transparent to-transparent z-10"></div>
          <div className="bg-[#18181b] rounded-lg aspect-[16/9] w-full flex overflow-hidden border border-white/5">
            {/* Sidebar Mock */}
            <div className="w-64 border-r border-white/5 bg-[#09090b] hidden md:flex flex-col p-4 gap-4">
              <div className="h-8 w-3/4 bg-white/5 rounded"></div>
              <div className="space-y-2 mt-4">
                <div className="h-4 w-full bg-white/5 rounded opacity-60"></div>
                <div className="h-4 w-5/6 bg-white/5 rounded opacity-40"></div>
                <div className="h-4 w-4/6 bg-white/5 rounded opacity-30"></div>
              </div>
            </div>
            {/* Chat Area Mock */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-8 space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded bg-white/10 flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-white/10 rounded"></div>
                    <div className="h-16 w-3/4 bg-white/5 rounded"></div>
                  </div>
                </div>
                <div className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded bg-[#fafafa]/20 flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-12 w-1/2 bg-[#fafafa]/10 rounded ml-auto"></div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/5">
                <div className="h-12 w-full bg-white/5 rounded-lg border border-white/10 mx-auto max-w-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Tech Strip */}
      <section id="stack" className="py-12 border-y border-white/5 bg-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-medium text-[#52525b] uppercase tracking-widest mb-8">Powering the Architecture</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">React 19</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Tailwind v4</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">LangGraph</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">PostgreSQL</div>
            <div className="text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Supabase</div>
          </div>
        </div>
      </section>

      {/* Project Status API-style block */}
      <section id="status" className="py-24 px-6 bg-[#09090b] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="max-w-6xl mx-auto flex justify-center">
          <div className="relative w-full md:w-1/2">
            <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm p-2 shadow-2xl relative">
              <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-transparent to-transparent z-10 pointer-events-none"></div>

              {/* Terminal Header */}
              <div className="bg-[#18181b] rounded-t-lg border-b border-white/5 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div className="ml-4 text-xs font-mono text-[#a1a1aa]">status.json</div>
              </div>

              {/* Terminal Body */}
              <div className="bg-[#09090b] rounded-b-lg p-6 font-mono text-sm text-[#d4d4d4] overflow-hidden">
                <span className="text-[#ce9178]">"project_status"</span>: {'{'}<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"phase"</span>: <span className="text-[#ce9178]">"active_development"</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"current_version"</span>: <span className="text-[#b5cea8]">1.0.0</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"open_source"</span>: <span className="text-[#569cd6]">true</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"maintained_by"</span>: <span className="text-[#ce9178]">"Juhil Savani"</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"next_steps"</span>: [<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Rate-limit free-tier users"</span>,<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Integrate MCP servers"</span>,<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Add multi-modal support"</span><br/>
                {'\u00A0\u00A0'}]<br/>
                {'}'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="system-design" className="pt-6 pb-24 px-6 bg-[#09090b] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">System Architecture</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto">
              The data flow from user interaction to AI response.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-transparent via-white/20 to-transparent -z-10"></div>

            {[
              { step: '1', title: 'Client (React)', desc: 'Sends prompt via protected API route using Axios.' },
              { step: '2', title: 'Server (Express)', desc: 'Validates JWT auth and routes request to LangGraph workflow.' },
              { step: '3', title: 'AI Agent', desc: 'Processes intent, calls tools if needed, and streams response.' },
              { step: '4', title: 'Database (PG)', desc: 'Persists conversation history and thread metadata.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center space-y-4 relative">
                <div className="w-20 h-20 mx-auto bg-[#18181b] border border-white/10 rounded-2xl flex items-center justify-center relative z-10 shadow-xl">
                  <span className="text-2xl font-bold text-white">{step}</span>
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-[#a1a1aa] text-xs leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Notes (FAQ) */}
      <section id="developer-notes" className="py-24 px-6 border-t border-white/5 bg-[#09090b]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Developer Notes</h2>

          <div className="space-y-4">
            {[
              {
                question: 'Why did I build this?',
                answer: 'I wanted to move beyond simple "wrapper" applications and understand what happens after that. How do you persist context? How do you handle efficient streaming updates on the frontend? Effectively, Sidekick is my playground for answering those questions. It\'s a documentation of my learning curve in building complex, stateful applications.',
              },
              {
                question: 'Is this targeted as a commercial SaaS?',
                answer: 'No. This is primarily a learning project and portfolio piece. It is open-sourced to help other developers learn how to integrate these specific technologies.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`border border-white/10 rounded-lg bg-[#18181b]/50 overflow-hidden transition-all duration-300 hover:bg-[#18181b]`}
              >
                <button
                  onClick={() => toggleNote(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-medium text-lg">{item.question}</span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 text-[#a1a1aa] ${activeNote === index ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    display: 'grid',
                    gridTemplateRows: activeNote === index ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`px-6 pb-6 text-[#a1a1aa] leading-relaxed transition-opacity duration-300 ${activeNote === index ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden bg-[#09090b] border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#09090b] to-[#09090b] opacity-50"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Want to explore the code?</h2>
          <p className="text-xl text-[#a1a1aa] mb-10 max-w-2xl mx-auto">
            Dive into the open-source repository to see how conversational memory, tool execution, and token streaming are built.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              View Source Code
            </a>
            <Link to="/workspace" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#09090b] text-sm text-[#a1a1aa]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
              <span className="font-bold text-white text-xl">Sidekick</span>
            </div>
            <p>Agentic conversational AI built for learning purposes.</p>
          </div>

          <div className="flex gap-8 font-medium">
            <a href="https://github.com/JuhilSavani/chatbot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Github Repository</a>
            <a href="mailto:savanijuhil@gmail.com" className="hover:text-white transition-colors">Contact Developer</a>
          </div>

          <div className="text-center md:text-right">
            <p>© 2026 Sidekick. Open Source Project.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
