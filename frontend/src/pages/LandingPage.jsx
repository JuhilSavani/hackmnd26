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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
            <span className="font-semibold text-xl sm:text-2xl tracking-tight">PaperPilot</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a1a1aa]">
            <a href="#stack" className="hover:text-[#fafafa] transition-colors">Tech Stack</a>
            <a href="#system-design" className="hover:text-[#fafafa] transition-colors">Architecture</a>
            <a href="#faqs" className="hover:text-[#fafafa] transition-colors">FAQs</a>
            <a href="https://github.com/JuhilSavani/hackmnd26" target="_blank" rel="noopener noreferrer" className="hover:text-[#fafafa] transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-white/80 transition-colors hidden sm:block">Log in</Link>
            <Link to="/register" className="bg-[#fafafa] text-[#18181b] hover:bg-[#fafafa]/90 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-28 sm:pt-32 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[400px] sm:h-[600px] hero-glow pointer-events-none -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#a1a1aa] mb-2 sm:mb-4 hover:border-white/20 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
            <span className="whitespace-nowrap">HackaMined 2026 // Cactus Communications</span>
            <span className="w-px h-3 bg-white/10 mx-1 hidden sm:block"></span>
            <span className="text-white/60 hidden sm:inline">Fix My Format, Agent Paperpal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-white to-white/60 pb-2">
            Autonomous Manuscript <br />
            <span className="text-white">Formatting Agent</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#a1a1aa] max-w-3xl mx-auto leading-relaxed px-2">
            An agentic workflow that autonomously reformats research manuscripts to comply with journal-specific guidelines. Say goodbye to desk rejections.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/workspace" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              Start Chatting
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a href="https://github.com/JuhilSavani/hackmnd26" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              View Source
            </a>
          </div>
        </div>

        {/* Preview Image / Abstract Visual */}
        <div className="mt-20 max-w-5xl mx-auto rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm p-1 sm:p-2 shadow-2xl relative">
          <div className="absolute inset-0 bg-linear-to-t from-[#09090b] via-transparent to-transparent z-10 pointer-events-none"></div>
          
          <div className="bg-[#09090b] rounded-lg h-[450px] sm:h-[600px] w-full flex overflow-hidden border border-white/5 relative">
            
            {/* Sidebar Mock */}
            <aside className="w-[16rem] lg:w-[17rem] shrink-0 bg-[#09090b] hidden md:flex flex-col h-full z-0 border-r border-white/5">
              <div className="pt-4 pb-0 flex flex-col gap-3">
                <div className="px-4 flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 font-bold tracking-tight text-[#fafafa]">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
                    <span className="font-semibold text-lg tracking-tight">PaperPilot</span>
                  </div>
                  <div className="h-6 w-6 flex items-center justify-center text-[#a1a1aa] rounded-md">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                      <path d="m6,4h2v12h-2c-1.656,0-3-1.344-3-3v-6c0-1.656,1.344-3,3-3Z" fill="currentColor"></path>
                      <rect height="12" width="14" x="3" y="4" rx="3" ry="3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></rect>
                    </svg>
                  </div>
                </div>
                
                <div className="px-3">
                  <div className="w-full flex items-center gap-2 bg-[#18181b]/50 text-[#fafafa] border border-white/5 rounded-md h-8 px-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a1a1aa]"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span className="font-medium text-[13px]">New Chat</span>
                  </div>
                </div>

                <div className="px-3 mt-1 relative">
                  <input type="text" placeholder="Search chats..." className="w-full bg-transparent text-[#fafafa] pl-7 py-1 text-[13px] border-b border-white/5 placeholder:text-[#52525b]" disabled />
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b]"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>

              <div className="flex-1 overflow-hidden px-2 py-3 flex flex-col gap-1">
                <div className="px-3 py-1 text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Pinned</div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full bg-zinc-800 text-white relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate font-medium text-[13px] text-white">Nature Med Format...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate font-medium text-[13px] text-zinc-300">IEEE Guidelines</span>
                  </div>
                </div>

                <div className="mx-3 my-1 h-px bg-white/5"></div>

                <div className="px-3 py-1 text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Recent</div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate font-medium text-[13px] text-zinc-300">ACL Full Review 23</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md w-full text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate font-medium text-[13px] text-zinc-300">PLOS ONE Alignment</span>
                  </div>
                </div>
              </div>

              <div className="p-2 border-t border-white/5 mt-auto">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center border border-white/5 text-[#fafafa] font-medium text-[9px] shrink-0">
                    J
                  </div>
                  <span className="text-[12px] font-medium text-[#fafafa] truncate">Juhil Savani</span>
                </div>
              </div>
            </aside>

            {/* Main Content Mock */}
            <main className="flex-1 flex flex-col md:my-1.5 md:mr-1.5 rounded-lg border-none md:border md:border-white/5 bg-[#09090b] relative overflow-hidden h-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              
              <header className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-5 bg-[#09090b]/80 backdrop-blur-md w-full gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[12px] sm:text-[13px] font-medium text-[#fafafa] truncate">Nature Med Formatting...</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#18181b]/80 border border-white/10 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#fafafa] whitespace-nowrap">2 / 2 left</span>
                </div>
              </header>

              <div className="flex-1 overflow-hidden p-3 sm:p-5 w-full relative">
                {/* Scroll overlay shadow */}
                <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-[#09090b] pointer-events-none z-10"></div>
                
                <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 h-full overflow-y-auto no-scrollbar pb-[100px] pointer-events-none select-none">
                  
                  {/* Blue Document Card */}
                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-md p-3 w-full shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#18181b] rounded flex items-center justify-center shrink-0 border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="text-[12px] sm:text-[13px] font-medium text-[#fafafa] truncate">
                          brain_cancer_research_draft.docx
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] min-w-0">
                          <span className="text-[#a1a1aa] shrink-0">Guidelines:</span> 
                          <span className="text-blue-400 truncate">nature.com/nature-medicine/...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Status */}
                  <div className="border border-white/10 rounded-md bg-[#18181b]/50 p-3 shadow-sm shrink-0">
                    <div className="flex items-center justify-between w-full px-3 py-2 bg-black/40 border border-white/5 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#fafafa]">Pipeline Complete</span>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-[#a1a1aa] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">12 steps</span>
                    </div>

                    <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                      <div className="text-[10px] sm:text-[11px] text-[#e4e4e7] bg-black/40 border border-white/5 p-2.5 rounded-md">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                          <span className="text-blue-400 font-medium uppercase tracking-wider text-[8px] sm:text-[9px]">Detection Summary</span>
                        </div>
                        <div className="pl-2 border-l-2 border-white/5 text-[#a1a1aa] leading-relaxed">
                          Detected 18 formatting violations. Major issues include incorrect margin sizing, unnumbered sections, improperly formatted section headers.
                        </div>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#e4e4e7] bg-black/40 border border-white/5 p-2.5 rounded-md">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                          <span className="text-blue-400 font-medium uppercase tracking-wider text-[8px] sm:text-[9px]">Fix Summary</span>
                        </div>
                        <div className="pl-2 border-l-2 border-white/5 text-[#a1a1aa] leading-relaxed">
                          Applied 18 precise formatting fixes. Converted all citations to the numbered style [1], adjusted margins, and validated caption placement.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Dashboard */}
                  <div className="border border-white/10 rounded-md bg-[#18181b]/50 overflow-hidden shrink-0">
                    <div className="w-full flex items-center justify-between p-3 border-b border-white/5">
                      <div>
                        <h3 className="text-[12px] sm:text-[13px] font-medium text-[#fafafa] mb-0.5">Compliance Score</h3>
                        <p className="text-[10px] sm:text-[11px] text-[#a1a1aa]">18 fixes applied</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeDasharray="95.43 97.38" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[11px] font-bold text-green-400">98</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-3 py-3 text-[10px] sm:text-[11px] space-y-1.5 bg-[#09090b]/20">
                      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-black/20 border border-white/5">
                        <span className="w-4 text-center">✅</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#e4e4e7] font-medium truncate">Line Spacing & Margins</div>
                        </div>
                        <span className="font-mono text-green-400 text-[9px] sm:text-[10px]">10/10</span>
                      </div>
                      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-black/20 border border-white/5">
                        <span className="w-4 text-center">✅</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#e4e4e7] font-medium truncate">Citations System</div>
                        </div>
                        <span className="font-mono text-green-400 text-[9px] sm:text-[10px]">10/10</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Download Action */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <div className="flex-1 bg-[#fafafa] text-[#09090b] text-[11px] sm:text-[12px] font-semibold h-8 rounded flex items-center justify-center gap-1.5 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                      Download PDF
                    </div>
                    <div className="flex-1 bg-[#18181b] border border-white/10 text-white text-[11px] sm:text-[12px] font-medium h-8 rounded flex items-center justify-center gap-1.5 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      Edit LaTeX
                    </div>
                  </div>

                </div>
              </div>
            </main>
          </div>
        </div>
      </main>

      {/* Tech Strip */}
      <section id="stack" className="py-10 sm:py-12 border-y border-white/5 bg-transparent overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-medium text-[#52525b] uppercase tracking-widest mb-6 sm:mb-8">Powering the Architecture</p>
          <div className="flex flex-wrap justify-center items-center gap-5 sm:gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">React 19</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Tailwind v4</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">LangGraph</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Firecrawl</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Cloudinary</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">PostgreSQL</div>
            <div className="text-base sm:text-xl font-bold text-white hover:text-white transition-opacity font-display tracking-tight">Supabase Auth</div>
          </div>
        </div>
      </section>

      {/* Project Status API-style block */}
      <section id="status" className="py-16 sm:py-24 px-4 sm:px-6 bg-[#09090b] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-white/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="max-w-6xl mx-auto flex justify-center">
          <div className="relative w-full sm:w-4/5 md:w-1/2">
            <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur-sm p-2 shadow-2xl relative">
              <div className="absolute inset-0 bg-linear-to-t from-[#09090b]/98 via-transparent to-transparent z-10 pointer-events-none"></div>

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
                <span>{'{'}</span><br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"track"</span>: <span className="text-[#ce9178]">"Fix My Format, Agent Paperpal"</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"event"</span>: <span className="text-[#ce9178]">"HackaMined 2026"</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"open_source"</span>: <span className="text-[#569cd6]">true</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"maintained_by"</span>: <span className="text-[#ce9178]">"Juhil Savani"</span>,<br/>
                {'\u00A0\u00A0'}<span className="text-[#9cdcfe]">"features"</span>: [<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"DOCX/PDF parsing"</span>,<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Agentic rule interpretation"</span>,<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"LaTeX autonomous fixing"</span>,<br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Instant update using server sent events"</span><br/>
                {'\u00A0\u00A0\u00A0\u00A0'}<span className="text-[#ce9178]">"Cloudinary secure delivery"</span><br/>
                {'\u00A0\u00A0'}]<br/>
                <span>{'}'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="system-design" className="pt-6 pb-16 sm:pb-24 px-4 sm:px-6 bg-[#09090b] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">System Architecture</h2>
            <p className="text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
              The data flow from user interaction to AI response.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-transparent via-white/20 to-transparent -z-10"></div>

            {[
              { step: '1', title: 'Upload & Parse', desc: 'Securely uploads DOCX/PDF to Cloudinary and extracts raw text + metadata.' },
              { step: '2', title: 'Rules & Context', desc: 'Uses Firecrawl to scrape target journal formatting guidelines.' },
              { step: '3', title: 'Agentic Pipeline', desc: 'LangGraph orchestrates Detection, Fix generation, and Critic validation.' },
              { step: '4', title: 'Secure Delivery', desc: 'Outputs formatted LaTeX and provides a signed, expiring Cloudinary URL.' },
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

      {/* Frequently Asked Questions (FAQs) */}
      <section id="faqs" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/5 bg-[#09090b]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                question: 'What is the scale of the formatting problem?',
                answer: 'Manual reformatting costs $1B+ annually, wastes 30+ hours per manuscript, and contributes to 30-70% of desk rejections. PaperPilot solves this quantified, high-impact problem autonomously.',
              },
              {
                question: 'Why uses an Agent instead of Templates?',
                answer: 'Guidelines live in PDFs and prose pages—there is no machine-readable API for them. Output must be publication ready, and consistency is global. An agentic rule interpreter can handle unstructured HTML guidelines scraped from journals and dynamically adjust text.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`border border-white/10 rounded-lg bg-[#18181b]/50 overflow-hidden transition-all duration-300 hover:bg-[#18181b]`}
              >
                <button
                  onClick={() => toggleNote(index)}
                  className="w-full flex items-center justify-between p-4 sm:p-6 text-left focus:outline-none cursor-pointer gap-3"
                >
                  <span className="font-medium text-sm sm:text-lg">{item.question}</span>
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
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden bg-[#09090b] border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-[#09090b] to-[#09090b] opacity-50"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">Want to explore the code?</h2>
          <p className="text-base sm:text-xl text-[#a1a1aa] mb-8 sm:mb-10 max-w-2xl mx-auto">
            Experience the future of academic publishing formatting with PaperPilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://github.com/JuhilSavani/hackmnd26" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-[#fafafa] border border-transparent text-[#18181b] font-medium rounded-lg hover:bg-[#fafafa]/90 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2 group">
              View Source Code
            </a>
            <Link to="/workspace" className="w-full sm:w-auto px-8 py-3.5 bg-white/5 border border-white/10 text-[#fafafa] font-medium rounded-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-white/5 bg-[#09090b] text-sm text-[#a1a1aa]">
        <div className="max-w-7xl mx-auto">

          {/* Mobile layout */}
          <div className="flex flex-col items-start gap-5 md:hidden">
            {/* Brand */}
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-linear-to-br from-white to-zinc-400 shadow-[0_0_12px_rgba(255,255,255,0.5)]"></div>
                <span className="font-bold text-white text-lg">PaperPilot</span>
              </div>
              <p className="text-xs text-[#52525b]">Agentic Manuscript Formatter.</p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/5" />

            {/* Links + Copyright on same row */}
            <div className="flex w-full items-center justify-between">
              <div className="flex gap-5 font-medium text-xs">
                <a href="https://github.com/JuhilSavani/hackmnd26" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Github</a>
                <a href="mailto:savanijuhil@gmail.com" className="hover:text-white transition-colors">Contact</a>
              </div>
              <p className="text-xs text-[#52525b]">© 2026 PaperPilot</p>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex flex-row justify-between items-center gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-linear-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
                <span className="font-bold text-white text-xl">PaperPilot</span>
              </div>
              <p>Agentic Manuscript Formatter.</p>
            </div>
            <div className="flex gap-8 font-medium">
              <a href="https://github.com/JuhilSavani/hackmnd26" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Github</a>
              <a href="mailto:savanijuhil@gmail.com" className="hover:text-white transition-colors">Contact Developer</a>
            </div>
            <div className="text-right">
              <p>© 2026 PaperPilot. HackaMined 2026.</p>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
