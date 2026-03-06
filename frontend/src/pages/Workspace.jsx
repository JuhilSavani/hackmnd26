import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import ChatSidebar from '@/utils/components/ChatSidebar';
import DocumentUploadInterface from '@/utils/components/DocumentUploadInterface';
import { useAuth } from '@/utils/hooks/useAuth';
import { loadChatThreadsAction } from '@/utils/actions/chat.actions';

const SidebarInactiveIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect height="12" width="14" x="3" y="4" rx="3" ry="3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Workspace() {
  const { auth } = useAuth();
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    
    let isMounted = true;
    const fetchThreads = async () => {
      setThreadsLoading(true);
      const res = await loadChatThreadsAction();
      if (isMounted) {
        if (!res.error && res.threads) {
          setThreads(res.threads);
        }
        setThreadsLoading(false);
      }
    };
    fetchThreads();
    
    return () => { isMounted = false; };
  }, [auth.isAuthenticated]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" }} className="bg-[#09090b] text-[#fafafa] overflow-hidden">
      <ChatSidebar threads={threads} isLoading={threadsLoading} setThreads={setThreads} />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  );
}

function MainContent({ setThreads }) {
  const { open, toggleSidebar } = useSidebar();
  const { threadId } = useParams();
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const contentStateClasses = open 
    ? "bg-[#09090b] my-2 mr-2 rounded-2xl border-white/5 shadow-2xl" 
    : "bg-[#09090b] m-0 rounded-none border-transparent";

  // If no threadId exists, we are in a "New Session"
  const isNewSession = !threadId;

  return (
    <SidebarInset className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col overflow-hidden border ${contentStateClasses} ${open ? 'h-[calc(100vh-1rem)]' : 'h-screen'}`}>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-6 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className={`transition-all duration-300 ${open ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100'}`}>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="-ml-2 h-8 w-8 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/5">
            <SidebarInactiveIcon />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          {!open && <span className="h-4 w-px bg-white/10 mr-2" />}
          <span className="text-sm font-medium text-[#fafafa]">
            {isNewSession ? "New Format Request" : "Workspace"}
          </span>
        </div>
      </header>

      {/* Loading bar stuck right below the header border */}
      <div className="relative h-[2px] w-full overflow-hidden shrink-0">
        {isThreadLoading && (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[meteor_1.5s_linear_infinite]" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full scroll-smooth pt-10">
        <DocumentUploadInterface threadId={threadId} setThreads={setThreads} setIsThreadLoading={setIsThreadLoading} />
      </div>
    </SidebarInset>
  );
}