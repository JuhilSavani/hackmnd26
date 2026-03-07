import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Check, Download, SquarePen } from 'lucide-react';
import Sidebar from '@/utils/components/Sidebar';
import DocumentUpload from '@/utils/components/DocumentUpload';
import { useAuth } from '@/utils/hooks/useAuth';
import { loadThreadDetailsAction } from '@/utils/actions/thread.actions';
import { generateSecureUrlAction } from '@/utils/actions/thread.actions';
import { uploadDocumentToCloudinary } from '@/utils/actions/upload.actions';
import { streamDocumentExtraction, streamAgentExecution } from '@/utils/actions/stream.actions';

const SidebarInactiveIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect height="12" width="14" x="3" y="4" rx="3" ry="3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    <line x1="8" y1="4" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Workspace() {
  const { auth } = useAuth();
  const [threads, setThreads] = useState([]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" }} className="bg-[#09090b] text-[#fafafa] overflow-hidden">
      <Sidebar threads={threads} setThreads={setThreads} />
      <MainContent setThreads={setThreads} />
    </SidebarProvider>
  );
}

function MainContent({ setThreads }) {
  const { open, toggleSidebar } = useSidebar();
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();

  // Thread details state (for existing threads)
  const [submission, setSubmission] = useState(null);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [error, setError] = useState(null);

  // Upload + streaming state
  const [isUploading, setIsUploading] = useState(false);
  const [extractionLogs, setExtractionLogs] = useState([]);
  const [nodeText, setNodeText] = useState({});
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [complianceExpanded, setComplianceExpanded] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState({ pdf: null, tex: null });
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState({ pdf: false, tex: false });
  const [complianceScore, setComplianceScore] = useState(null);
  const abortStreamRef = useRef(null);
  const currentThreadIdRef = useRef(null);
  const bottomRef = useRef(null);

  // LOAD THREAD EFFECT — mirrors the ChatWindow pattern
  useEffect(() => {
    // Case A: New workspace (no threadId) → reset state
    if (!threadId) {
      setSubmission(null);
      setExtractionLogs([]);
      setError(null);
      setNodeText({});
      setPipelineComplete(false);
      setStepsExpanded(false);
      setComplianceExpanded(false);
      setDownloadUrls({ pdf: null, tex: null });
      setIsGenerating({ pdf: false, tex: false });
      setComplianceScore(null);
      setIsUploading(false);
      return;
    }

    // Case B: We just created this thread locally → SKIP FETCH
    if (currentThreadIdRef.current === threadId) {
      currentThreadIdRef.current = null;
      return;
    }

    // Explicitly reset the UI state when switching to an existing thread
    // This removes the "ghost" overlap issues.
    setSubmission(null);
    setExtractionLogs([]);
    setNodeText({});
    setPipelineComplete(false);
    setStepsExpanded(false);
    setComplianceExpanded(false);
    setDownloadUrls({ pdf: null, tex: null });
    setIsGenerating({ pdf: false, tex: false });
    setComplianceScore(null);
    setIsUploading(false);
    setError(null);

    // Case C: Navigating to an existing thread → Fetch from DB
    let isMounted = true;

    const fetchThread = async () => {
      setIsThreadLoading(true);
      const { thread, agentState, error } = await loadThreadDetailsAction(threadId);

      if (isMounted) {
        if (!error && thread) {
          setSubmission({
            id: thread.threadId,
            fileName: thread.title || 'Previous Document',
            url: thread.guidelinesUrl,
            publicId: thread.publicId,
            status: 'success'
          });
          
          if (agentState) {
             const newNodeText = {};
             if (agentState.detectSummary) newNodeText.node1 = agentState.detectSummary;
             if (agentState.fixSummary) newNodeText.node3 = agentState.fixSummary;
             setNodeText(newNodeText);
             if (agentState.complianceScore) setComplianceScore(agentState.complianceScore);
             
             // If we have summaries, assume the pipeline was completed
             if (agentState.detectSummary || agentState.fixSummary) {
                 setPipelineComplete(true);
             }
          }
        } else {
          setError(error || "Could not load thread details.");
          setSubmission(null);
        }
        setIsThreadLoading(false);
      }
    };

    fetchThread();
    return () => { isMounted = false; };
  }, [threadId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) abortStreamRef.current();
    };
  }, []);

  // Auto-scroll to bottom when streaming content updates
  useEffect(() => {
    if (!pipelineComplete || isUploading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [extractionLogs, nodeText, complianceScore, pipelineComplete, isUploading]);

  // SUBMIT HANDLER — receives { file, guidelinesUrl } from DocumentUpload
  const handleSubmit = async ({ file, guidelinesUrl }) => {
    setIsUploading(true);
    setError(null);
    setExtractionLogs([]);
    setNodeText({});
    setPipelineComplete(false);
    setComplianceExpanded(false);
    setDownloadUrls({ pdf: null, tex: null });
    setComplianceScore(null);

    // Optimistic UI — show the document card immediately
    const currentSubmission = {
      id: Date.now(),
      fileName: file.name,
      url: guidelinesUrl,
      status: 'uploading'
    };
    setSubmission(currentSubmission);

    try {
      // Generate or use existing Thread ID
      const activeThreadId = threadId || `${auth?.user?.id || 'anon'}_${Date.now()}`;
      const isNewThread = !threadId;

      if (isNewThread) {
        // Flag this threadId so the useEffect skips the DB fetch
        currentThreadIdRef.current = activeThreadId;

        setThreads(prev => [{
          threadId: activeThreadId,
          title: file.name,
          updatedAt: new Date().toISOString()
        }, ...(prev || [])]);

        // Immediately navigate to preserve the URL schema
        navigate(`/workspace/${activeThreadId}`, { replace: true });
      }

      // 1. Upload to Cloudinary
      const cloudinaryResult = await uploadDocumentToCloudinary(file);

      const payload = {
        threadId: activeThreadId,
        publicId: cloudinaryResult.public_id,
        fileName: file.name,
        guidelinesUrl: guidelinesUrl
      };

      // 2. Mark as uploaded successfully
      setSubmission(prev => ({ ...prev, status: 'success', publicId: payload.publicId }));

      // 3. Start SSE Document Extraction Stream
      const { stream, abort } = streamDocumentExtraction(payload);
      abortStreamRef.current = abort;

      let extractionSuccess = false;
      for await (const event of stream) {
        if (event.type === 'error') {
          setError(event.val);
          break;
        } else if (event.type === 'loading' || event.type === 'processing' || event.type === 'success') {
          setExtractionLogs(prev => [...prev, { type: event.type, text: event.val, id: Date.now() + Math.random() }]);
          if (event.type === 'success') extractionSuccess = true;
        }
      }

      // 4. Start Agent SSE Stream (if extraction succeeded)
      if (extractionSuccess && !abortStreamRef.current?.signal?.aborted) {
        const { stream: agentStream, abort: abortAgent } = streamAgentExecution({ threadId: activeThreadId });
        abortStreamRef.current = abortAgent;

        const nodeNames = {
          node1: "Detection Phase",
          node2: "Formatting Fixes",
          node3: "Critic Validation",
        };

        for await (const event of agentStream) {
          if (event.type === 'error') {
            setError(event.val);
            break;
          }

          const friendlyName = nodeNames[event.node] || event.node;

          if (event.type === 'node_start') {
            setExtractionLogs(prev => [...prev, { type: 'processing', text: `Agent started: ${friendlyName}`, id: Date.now() + Math.random() }]);
          } else if (event.type === 'processing') {
            // New custom processing labels from the backend
            setExtractionLogs(prev => [...prev, { type: 'processing', text: event.text, id: Date.now() + Math.random() }]);
          } else if (event.type === 'token') {
            // Append progressive text for the specific node
            setNodeText(prev => ({
              ...prev,
              [event.node]: (prev[event.node] || '') + event.val
            }));
          } else if (event.type === 'node_update') {
            if (event.updates && event.updates.length > 0) {
              setExtractionLogs(prev => {
                const msg = `  ↳ Analyzing: [${event.updates.join(', ')}]`;
                if (prev.length > 0 && prev[prev.length - 1].text === msg) return prev;
                return [...prev, { type: 'loading', text: msg, id: Date.now() + Math.random() }];
              });
            }
          } else if (event.type === 'compliance_score') {
            setComplianceScore(event.val);
          } else if (event.type === 'node_end') {
            setExtractionLogs(prev => [...prev, { type: 'success', text: `Agent finished: ${friendlyName}`, id: Date.now() + Math.random() }]);
          }
        }
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process manuscript.');
      setSubmission(prev => prev ? { ...prev, status: 'error', error: err.message } : null);
    } finally {
      setIsUploading(false);
      setPipelineComplete(true);
      abortStreamRef.current = null;
    }
  };

  const handleDownload = async (format) => {
    setIsGenerating(prev => ({ ...prev, [format]: true }));
    setError(null);
    try {
      const { downloadUrl, error } = await generateSecureUrlAction(threadId, format);
      if (error) {
        setError(error);
      } else if (downloadUrl) {
        setDownloadUrls(prev => ({ ...prev, [format]: downloadUrl }));
        // Auto-trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = format === 'pdf' ? 'manuscript.pdf' : '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to generate ${format.toUpperCase()} download.`);
    } finally {
      setIsGenerating(prev => ({ ...prev, [format]: false }));
    }
  };

  const contentStateClasses = open 
    ? "bg-[#09090b] my-2 mr-2 rounded-md border-white/5 shadow-2xl" 
    : "bg-[#09090b] m-0 rounded-none border-transparent";

  const isNewSession = !submission && !threadId;

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
            {isNewSession ? "New Format Request" : "PaperPilot Workspace"}
          </span>
        </div>
      </header>

      {/* Loading bar */}
      <div className="relative h-[2px] w-full overflow-hidden shrink-0">
        {isThreadLoading && (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[meteor_1.5s_linear_infinite]" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full scroll-smooth pt-10">

        {/* STATE 1: New session — show upload form */}
        {isNewSession && !isUploading && (
          <DocumentUpload onSubmit={handleSubmit} isUploading={isUploading} />
        )}

        {/* STATE 2: Submission exists (upload in progress or existing thread loaded) — show blue card + logs */}
        {submission && (
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-4">
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Blue Document Card */}
              <div className="w-full mb-2">
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-md p-4 w-full shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-[#18181b] rounded-md flex items-center justify-center shrink-0 border border-white/10 shadow-sm">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-[#fafafa] leading-snug mb-1 truncate max-w-[250px] sm:max-w-sm md:max-w-md" title={submission.fileName}>
                        {submission.fileName}
                      </h3>
                      <div className="flex items-center gap-2 text-[13px] min-w-0">
                        <span className="text-[#a1a1aa] shrink-0">Guidelines URL:</span> 
                        <a href={submission.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" title={submission.url}>
                          {submission.url}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SSE Pipeline Tasks — visible during upload OR if logs/summaries exist */}
              {(isUploading || extractionLogs.length > 0 || Object.keys(nodeText).length > 0) && (
                <div className="flex gap-4 w-full">
                  <div className="flex-1 bg-transparent">
                    <div className="border border-white/10 rounded-md bg-[#18181b]/50 p-5 my-2 shadow-sm">

                      {/* Task Steps — collapsible after completion */}
                      {pipelineComplete ? (
                        extractionLogs.length > 0 && (
                          <div className="mb-4">
                            <button
                              onClick={() => setStepsExpanded(prev => !prev)}
                              className="flex items-center justify-between w-full px-4 py-3 bg-black/40 hover:bg-black/60 border border-white/5 rounded-md text-sm font-medium text-[#fafafa] transition-all duration-200 select-none group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500/10 text-green-500">
                                  <Check className="w-4 h-4" />
                                </div>
                                <span className="tracking-wide">Pipeline Processing Complete</span>
                                <span className="text-[11px] text-[#a1a1aa] px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                  {extractionLogs.length} steps
                                </span>
                              </div>
                              <span className={`transition-transform duration-300 text-[#a1a1aa] group-hover:text-[#fafafa] ${stepsExpanded ? 'rotate-180' : ''}`}>
                                <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${stepsExpanded ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}
                            >
                              <div className="p-4 bg-black/20 rounded-md border border-white/5 ml-1">
                                <ul className="space-y-2.5 list-none pl-0 font-mono text-[12px]">
                                  {extractionLogs.map((log) => (
                                    <li key={log.id} className="flex items-center gap-3 text-[#a1a1aa]">
                                      <Check className="w-3.5 h-3.5 text-green-500/60 shrink-0" />
                                      <span>{log.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        extractionLogs.length === 0 ? (
                          <div className="flex items-center gap-3 text-sm text-[#a1a1aa] italic px-2 pb-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            Connecting to processing server...
                          </div>
                        ) : (
                          <div className="p-4 bg-black/40 rounded-md border border-white/5 mb-4">
                            <ul className="space-y-3 text-sm text-[#a1a1aa] list-none pl-0 font-mono text-[12px]">
                              {extractionLogs.map((log, index) => {
                                const isLatest = index === extractionLogs.length - 1;
                                const isRunning = isLatest && !pipelineComplete;
                                return (
                                  <li key={log.id} className="flex items-center gap-3">
                                    {isRunning
                                      ? <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                                      : <Check className="w-4 h-4 text-green-500 shrink-0" />
                                    }
                                    <span className={isRunning ? "text-[#fafafa]" : "text-[#71717a]"}>{log.text}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )
                      )}

                      {/* Streamed Narration Summaries — always visible */}
                      {Object.keys(nodeText).length > 0 && (
                        <div className={`space-y-3 ${pipelineComplete ? '' : 'mt-4 pt-4 border-t border-white/5'}`}>
                          {Object.entries(nodeText).map(([node, text]) => (
                            <div key={node} className="text-sm text-[#e4e4e7] bg-black/40 border border-white/5 p-4 rounded-md leading-relaxed shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                <span className="text-blue-400 font-semibold text-[11px] uppercase tracking-wider">
                                  {node === 'node1' ? 'Detection Summary' : 'Fix Summary'}
                                </span>
                              </div>
                              <div className="pl-3 border-l-2 border-white/5 pb-1">
                                {text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {/* Compliance Dashboard */}
              {complianceScore && complianceScore.rules && complianceScore.rules.length > 0 && (
                <div className="w-full mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border border-white/10 rounded-md bg-[#18181b]/50 overflow-hidden">
                    <button
                      onClick={() => setComplianceExpanded(prev => !prev)}
                      className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-semibold text-[#fafafa] group-hover:text-white transition-colors">Compliance Score</h3>
                        </div>
                        <p className="text-[13px] text-[#a1a1aa] group-hover:text-[#d4d4d8] transition-colors">{complianceScore.total_fixes_applied} fix{complianceScore.total_fixes_applied !== 1 ? 'es' : ''} applied</p>
                      </div>
                      <div className="flex items-center gap-6 text-left">
                        <div className="relative w-14 h-14">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.5" fill="none"
                              stroke={complianceScore.overall_score >= 80 ? '#22c55e' : complianceScore.overall_score >= 50 ? '#eab308' : '#ef4444'}
                              strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${complianceScore.overall_score * 0.9738} 97.38`}
                            />
                          </svg>
                          <span className={`absolute inset-0 flex items-center justify-center text-[14px] font-bold ${
                            complianceScore.overall_score >= 80 ? 'text-green-400' : complianceScore.overall_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{complianceScore.overall_score}</span>
                        </div>
                        <svg
                          className={`w-5 h-5 transition-transform duration-300 text-[#a1a1aa] group-hover:text-white ${complianceExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                          <path d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </button>
                    
                    <div
                      className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${complianceExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="px-6 pb-6 text-[#a1a1aa] leading-relaxed">
                        <div className="space-y-1.5 list-none">
                          {complianceScore.rules.map((rule, i) => (
                            <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg bg-black/20 border border-white/5 transition-opacity duration-300 delay-100 ${complianceExpanded ? 'opacity-100' : 'opacity-0'}`}>
                              <span className="text-[14px] w-5 shrink-0 flex justify-center">
                                {rule.status === 'pass' ? '✅' : rule.status === 'warning' ? '⚠️' : '❌'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] text-[#e4e4e7] font-medium truncate">{rule.name}</div>
                                <div className="text-[11px] text-[#71717a] truncate">{rule.detail}</div>
                              </div>
                              <span className={`text-[13px] font-mono font-semibold shrink-0 ${
                                rule.status === 'pass' ? 'text-green-400' : rule.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                              }`}>{rule.score}/{rule.max}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Buttons — PDF and LaTeX */}
              {pipelineComplete && (
                <div className="w-full mb-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-[1.5] flex items-center justify-between gap-2 bg-[#18181b]/80 p-1.5 rounded-md border border-white/5 shadow-sm">
                      <Button 
                        className="flex-1 bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-semibold h-[38px] rounded-md transition-all shadow-md group border border-transparent"
                        onClick={() => handleDownload(downloadFormat)}
                        disabled={isGenerating.pdf || isGenerating.tex}
                      >
                        {isGenerating[downloadFormat] ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {downloadFormat === 'pdf' ? 'Compiling PDF...' : 'Generating LaTeX...'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </span>
                        )}
                      </Button>
                      <div className="flex items-center gap-2 pl-3 group">
                        <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider group-focus-within:text-[#fafafa] transition-colors">Format</span>
                        <select 
                          value={downloadFormat}
                          onChange={(e) => setDownloadFormat(e.target.value)}
                          className="bg-[#09090b] border border-white/10 text-[#fafafa] text-[13px] font-medium h-[38px] py-1 px-3 cursor-pointer rounded-md focus:ring-0 appearance-none outline-none pr-8 relative transition-colors hover:border-white/20"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                          disabled={isGenerating.pdf || isGenerating.tex}
                        >
                          <option value="pdf">PDF</option>
                          <option value="tex">LaTeX</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-[1] flex bg-[#18181b]/80 p-1.5 rounded-md border border-white/5 shadow-sm">
                      <Button
                        className="flex-1 bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-semibold h-[38px] rounded-md transition-all shadow-md group border border-transparent"
                        onClick={() => navigate(`/workspace/${threadId}/editor`)}
                        disabled={!threadId || isGenerating.pdf || isGenerating.tex}
                      >
                        <span className="flex items-center gap-2">
                          <SquarePen className="w-5 h-5" />
                          Edit LaTeX
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="w-full max-w-3xl mx-auto p-4">
            <div className="text-red-400 text-center p-4 border border-red-500/20 bg-red-500/5 rounded-lg">{error}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </SidebarInset>
  );
}
