import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "../hooks/useAuth"
import { loadAllThreadsAction } from "../actions/thread.actions"

import { MessageSquare, Plus, Search, LogOut, Pin, Trash2 } from "lucide-react"
import useLogout from "../hooks/useLogout"
import { usePinnedThreads } from "../hooks/usePinnedThreads"
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteThreadAction } from "../actions/thread.actions"


const SidebarActiveIcon = ({ className = "w-4 h-5" }) => (
  <svg 
    viewBox="0 0 20 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path 
      d="m6,4h2v12h-2c-1.656,0-3-1.344-3-3v-6c0-1.656,1.344-3,3-3Z" 
      fill="currentColor" 
      strokeWidth="0"
    />
    <rect 
      height="12" width="14" x="3" y="4" 
      rx="3" ry="3" 
      fill="none" 
      stroke="currentColor" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth="2" 
    />
  </svg>
);

export default function Sidebar({ threads = [], setThreads }) {
  const { toggleSidebar } = useSidebar()
  const { auth } = useAuth()
  const { logout, logoutLoading } = useLogout()
  const navigate = useNavigate()
  const { threadId } = useParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    
    let isMounted = true;
    const fetchThreads = async () => {
      setIsLoading(true);
      const res = await loadAllThreadsAction();
      if (isMounted) {
        if (!res.error && res.threads) {
          setThreads(res.threads);
        }
        setIsLoading(false);
      }
    };
    fetchThreads();
    
    return () => { isMounted = false; };
  }, [auth.isAuthenticated, setThreads]);

  // Initialize with threads that are already pinned from server
  const { pinned, togglePin } = usePinnedThreads(
    threads.filter(t => t.isPinned).map(t => t.threadId)
  );

  const [threadToDelete, setThreadToDelete] = useState(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!threadToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteThreadAction(threadToDelete.threadId)
      if (result.error) {
        console.error(result.error)
        // Optionally show toast error here
      } else {
        // Optimistic update
        setThreads(prev => prev.filter(t => t.threadId !== threadToDelete.threadId))
        
        if (threadToDelete.threadId === threadId) {
          navigate('/workspace')
        }
      }
    } catch (error) {
      console.error("Failed to delete", error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      // Allow animation to finish before clearing data, or just leave it
      setTimeout(() => setThreadToDelete(null), 300) 
    }
  }

  const handleNewChat = () => {
    // Navigate to base workspace route - thread will be created on first message
    navigate('/workspace')
    setSearchQuery("")
  }

  const handleThreadClick = (thread) => {
    navigate(`/workspace/${thread.threadId}`)
  }

  // Filter first
  const filtered = threads.filter(thread => 
    (thread.title || "Untitled Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into pinned and unpinned
  const pinnedThreads = filtered.filter(t => pinned.has(t.threadId)).sort((a, b) => {
    // Sort pinned threads by updated date (or any other criteria)
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  
  const otherThreads = filtered.filter(t => !pinned.has(t.threadId)).sort((a, b) => {
    // Sort other threads by date
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const renderThreadItem = (thread) => (
    <SidebarMenuItem key={thread.threadId}>
      <SidebarMenuButton
        onClick={() => handleThreadClick(thread)}
        isActive={thread.threadId === threadId}
        className="px-4 group/thread relative w-full hover:bg-zinc-800 active:bg-zinc-800 data-[active=true]:bg-zinc-800 text-zinc-400 hover:text-white active:text-white data-[active=true]:text-white h-auto items-start transition-colors"
      >
        <MessageSquare className="h-4 w-4 mt-1 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1 relative">
          <div className="flex items-center justify-between">
            <span className="truncate font-medium text-sm text-zinc-300 group-data-[active=true]/thread:text-white group-hover/thread:text-white group-active/thread:text-white transition-colors pr-6">
              {thread.title || "Untitled Chat"}
            </span>
            {pinned.has(thread.threadId) && (
              <Pin className="h-3 w-3 text-zinc-400 rotate-45 shrink-0 block group-hover/thread:hidden" />
            )}
          </div>
          <span className="text-xs text-zinc-500 truncate group-data-[active=true]/thread:text-zinc-400 group-hover/thread:text-zinc-400 group-active/thread:text-zinc-400 transition-colors">
            {(!thread.updatedAt || isNaN(new Date(thread.updatedAt).getTime())) 
              ? "" 
              : new Date(thread.updatedAt).toLocaleDateString()}
          </span>
          
          {/* Hover Actions */}
          <div className="absolute right-0 top-0 h-full flex items-center gap-1 pl-8 bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent opacity-0 translate-x-[100px] group-hover/thread:opacity-100 group-hover/thread:translate-x-0 transition-all duration-200 ease-out">
            <div 
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                togglePin(thread.threadId);
              }}
              className="p-1.5 hover:bg-white/10 rounded-md text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
              title={pinned.has(thread.threadId) ? "Unpin thread" : "Pin thread"}
            >
              <Pin className={`h-3.5 w-3.5 ${pinned.has(thread.threadId) ? "fill-current text-[#fafafa]" : ""}`} />
            </div>
            <div 
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setThreadToDelete(thread);
                setIsDeleteDialogOpen(true);
              }}
              className="p-1.5 hover:bg-red-500/20 rounded-md text-[#a1a1aa] hover:text-red-400 transition-colors"
              title="Delete thread"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <>
    <UISidebar 
      variant="sidebar" 
      side="left" 
      collapsible="offcanvas" 
      className="border-none bg-[#09090b] text-[#fafafa] [&>[data-slot=sidebar-gap]]:hidden [&>[data-slot=sidebar-container]]:!z-50 [&>[data-slot=sidebar-container]]:shadow-2xl"
    >
      <SidebarHeader className="pt-6 pb-0 bg-[#09090b]">
        <div className="px-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 font-bold text-[1.1rem] tracking-tight text-[#fafafa]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
               <span className="font-semibold text-2xl tracking-tight">PaperPilot</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="h-8 w-8 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-white/5"
          >
            <SidebarActiveIcon/>
          </Button>
        </div>
       
        <div className="px-2">
          <Button 
            onClick={handleNewChat}
            disabled={!auth.isAuthenticated}
            className="w-full justify-start gap-3 bg-[#18181b]/50 text-[#fafafa] hover:bg-white/5 border border-white/5 shadow-none h-10 px-4 transition-all hover:border-white/10" 
            size="sm"
          >
            <Plus className="h-4 w-4 text-[#a1a1aa]" />
            <span className="font-medium">New Chat</span>
          </Button>
        </div>

        <div className="flex flex-col w-full px-2 mt-4">
          <div className="relative group px-2">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[#fafafa] pl-8 py-2 text-sm border-b border-white/5 focus:border-white/40 focus:outline-none transition-all placeholder-[#52525b] peer"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b] peer-focus:text-[#cacaca] transition-colors pointer-events-none" />
          </div>
          <div className="relative h-[2px] w-full overflow-hidden">
            {isLoading && <div className="meteor-effect" />}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 bg-[#09090b]">
        <SidebarMenu>
          {/* Pinned Threads Section */}
          {pinnedThreads.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider">
                Pinned
              </div>
              {pinnedThreads.map(renderThreadItem)}
              
              {/* Separator */}
              {otherThreads.length > 0 && <div className="mx-4 my-2 h-px bg-white/5" />}
            </>
          )}

          {/* Other Threads Section */}
          {otherThreads.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-[#52525b] uppercase tracking-wider">
                Recent
              </div>
              {otherThreads.map(renderThreadItem)}
            </>
          )}
        </SidebarMenu>

        {threads.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[#52525b]">
            No chat threads yet.<br/>Start a new chat!
          </div>
        )}
        
        {threads.length > 0 && pinnedThreads.length === 0 && otherThreads.length === 0 && (
           <div className="px-4 py-12 text-center text-sm text-[#52525b]">
            No results found.
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 bg-[#09090b]">
          <div className="flex items-center justify-between mx-2 mb-2 border-t border-white/5 pt-4 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5 text-[#fafafa] font-medium text-sm">
                {auth.user.username?.[0]?.toUpperCase()}
              </div>
              <span className="truncate text-sm font-medium text-[#fafafa]">{auth.user.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              disabled={logoutLoading}
              className="h-8 w-8 text-[#a1a1aa] hover:text-red-400 hover:bg-white/5"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
         
      </SidebarFooter>
    </UISidebar>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent className="bg-[#09090b] border-white/10 text-[#fafafa] sm:rounded-2xl shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#a1a1aa]">
            This action cannot be undone. This will permanently delete the chat thread
            <span className="font-semibold text-[#fafafa]"> "{threadToDelete?.title || 'Untitled Chat'}" </span>
            and remove all associated messages.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 hover:text-[#fafafa] text-[#fafafa]">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDelete}
            disabled={isDeleting}
            className="bg-gray-300 hover:bg-gray-200 text-zinc-800 border-none"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  )
}