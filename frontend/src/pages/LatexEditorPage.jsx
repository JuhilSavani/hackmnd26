import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Download, Loader2, RefreshCw, Search, X, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import Loading from "@/utils/components/Loading"
import {
  compileLatexPreviewAction,
  loadLatexSourceAction,
  saveLatexSourceAction,
  detectIssuesAction,
} from "@/utils/actions/document.actions"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

const PREVIEW_DEBOUNCE_MS = 1000
const SAVE_DEBOUNCE_MS = 1500

// ── Issue type label & color mapping ────────────────────────────────────────
const ISSUE_TYPE_CONFIG = {
  missing_doi:              { label: "Missing DOI",             color: "#f59e0b" },
  unmatched_citation:       { label: "Unmatched Citation",      color: "#ef4444" },
  duplicate_reference:      { label: "Duplicate Reference",     color: "#f97316" },
  broken_ref_numbering:     { label: "Broken Ref Numbering",    color: "#ef4444" },
  incorrect_author_format:  { label: "Author Format",           color: "#f59e0b" },
  heading_hierarchy_violation: { label: "Heading Hierarchy",    color: "#8b5cf6" },
  abstract_format:          { label: "Abstract Format",         color: "#06b6d4" },
  title_page_format:        { label: "Title Page Format",       color: "#06b6d4" },
  mixed_figure_label:       { label: "Mixed Figure Label",      color: "#f59e0b" },
  spacing_deviation:        { label: "Spacing Deviation",       color: "#a855f7" },
  font_deviation:           { label: "Font Deviation",          color: "#a855f7" },
}

function getIssueConfig(type) {
  return ISSUE_TYPE_CONFIG[type] || { label: type.replace(/_/g, " "), color: "#71717a" }
}

function downloadLatexFile({ latex, title }) {
  const blob = new Blob([latex], { type: "application/x-tex" })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const safeTitle = (title || "manuscript").replace(/[^\w.-]+/g, "-")

  anchor.href = objectUrl
  anchor.download = `${safeTitle || "manuscript"}.tex`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

export default function LatexEditorPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState("manuscript")
  const [latex, setLatex] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [previewError, setPreviewError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState("saved")
  const [activeMobilePane, setActiveMobilePane] = useState("code")
  const [previewRevision, setPreviewRevision] = useState(0)

  // ── Detect Issues state ─────────────────────────────────────────────────
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectSummary, setDetectSummary] = useState("")
  const [detectedIssues, setDetectedIssues] = useState([])
  const [targetJournal, setTargetJournal] = useState("")
  const [showIssuesPanel, setShowIssuesPanel] = useState(false)
  const [expandedIssue, setExpandedIssue] = useState(null)
  const [editorHeight, setEditorHeight] = useState(60) // percentage of left panel

  const previewAbortRef = useRef(null)
  const previewUrlRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  const detectAbortRef = useRef(null)
  const leftPanelRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const loadEditor = async () => {
      setIsLoading(true)
      setLoadError(null)

      const { title: loadedTitle, latex: loadedLatex, error } = await loadLatexSourceAction(threadId)

      if (!isMounted) return

      if (error) {
        setLoadError(error)
      } else {
        setTitle(loadedTitle || "manuscript")
        skipNextSaveRef.current = true
        setLatex(loadedLatex || "")
        hasLoadedRef.current = true
      }

      setIsLoading(false)
    }

    loadEditor()

    return () => {
      isMounted = false
      previewAbortRef.current?.abort()
      detectAbortRef.current?.abort()
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [threadId])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (!latex.trim()) {
      setIsCompiling(false)
      return
    }

    setIsCompiling(true)

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      previewAbortRef.current?.abort()
      previewAbortRef.current = controller
      setPreviewError(null)

      const { previewUrl: nextPreviewUrl, error, details, cancelled } = await compileLatexPreviewAction({
        threadId,
        latex,
        signal: controller.signal,
      })

      if (cancelled) return

      if (error) {
        setPreviewError(details ? `${error}\n\n${details}` : error)
      } else if (nextPreviewUrl) {
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current)
        }
        previewUrlRef.current = nextPreviewUrl
        setPreviewUrl(nextPreviewUrl)
      }

      setIsCompiling(false)
    }, PREVIEW_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [threadId, latex, previewRevision])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    const timeoutId = window.setTimeout(async () => {
      if (!latex.trim()) return

      setIsSaving(true)
      const { success } = await saveLatexSourceAction({ threadId, latex })
      setIsSaving(false)

      if (success) {
        setSaveState("saved")
      } else {
        setSaveState("error")
      }
    }, SAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [threadId, latex])

  // ── Detect Issues handler ─────────────────────────────────────────────────
  const handleDetectIssues = async () => {
    if (isDetecting || !latex.trim()) return

    // Abort any previous detection
    detectAbortRef.current?.abort()
    const controller = new AbortController()
    detectAbortRef.current = controller

    setIsDetecting(true)
    setDetectSummary("")
    setDetectedIssues([])
    setTargetJournal("")
    setShowIssuesPanel(true)
    setExpandedIssue(null)

    const result = await detectIssuesAction({
      threadId,
      latex,
      signal: controller.signal,
    })

    if (result.cancelled) return

    if (result.error) {
      setDetectSummary(`Error: ${result.error}`)
    } else {
      setDetectSummary(result.summary || "")
      setDetectedIssues(result.detected_issues || [])
      setTargetJournal(result.target_journal || "")
    }

    setIsDetecting(false)
  }

  // ── Vertical drag handler (editor ↔ issues) ──────────────────────────────
  const handleVerticalDragStart = useCallback((e) => {
    e.preventDefault()
    const startY = e.clientY
    const panel = leftPanelRef.current
    if (!panel) return

    const panelRect = panel.getBoundingClientRect()
    const startHeight = editorHeight

    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      const deltaPercent = (deltaY / panelRect.height) * 100
      const newHeight = Math.min(85, Math.max(20, startHeight + deltaPercent))
      setEditorHeight(newHeight)
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [editorHeight])

  if (isLoading) {
    return <Loading />
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-red-500/5 p-8 shadow-2xl">
          <h1 className="text-xl font-semibold tracking-tight">Unable to open editor</h1>
          <p className="mt-3 text-sm text-red-300/90 leading-relaxed">{loadError}</p>
          <Button
            onClick={() => navigate(`/workspace/${threadId}`)}
            className="mt-6 bg-[#fafafa] text-[#09090b] hover:bg-[#e4e4e7]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to workspace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <header className="border-b border-white/10 bg-[#09090b]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/workspace/${threadId}`)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#a1a1aa] transition-colors hover:cursor-pointer hover:bg-white/10 hover:text-[#fafafa]"
              aria-label="Back to workspace"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}.tex</h1>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              size="lg"
              variant="ghost"
              onClick={handleDetectIssues}
              className="cursor-pointer border border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 p-5.25"
              disabled={isDetecting || !latex.trim()}
            >
              {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isDetecting ? "Detecting..." : "Detect Issues"}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setPreviewRevision((current) => current + 1)}
              className="cursor-pointer border border-white/10 bg-white/5 text-[#fafafa] hover:bg-white/10 p-5.25"
              disabled={isCompiling}
            >
              {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh preview
            </Button>
            <Button
              size="lg"
              onClick={() => downloadLatexFile({ latex, title })}
              className="cursor-pointer bg-[#fafafa] text-[#09090b] hover:bg-[#e4e4e7]"
            >
              <Download className="h-4 w-4" />
              Download .tex
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1500px] gap-2 px-4 pb-4 md:hidden">
          <Button
            variant={activeMobilePane === "code" ? "default" : "ghost"}
            onClick={() => setActiveMobilePane("code")}
            className={activeMobilePane === "code" ? "flex-1 cursor-pointer bg-[#fafafa] text-[#09090b]" : "flex-1 cursor-pointer border border-white/10 bg-white/5 text-[#fafafa] hover:bg-white/10"}
          >
            Code
          </Button>
          <Button
            variant={activeMobilePane === "preview" ? "default" : "ghost"}
            onClick={() => setActiveMobilePane("preview")}
            className={activeMobilePane === "preview" ? "flex-1 cursor-pointer bg-[#fafafa] text-[#09090b]" : "flex-1 cursor-pointer border border-white/10 bg-white/5 text-[#fafafa] hover:bg-white/10"}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            onClick={handleDetectIssues}
            className="cursor-pointer border border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15"
            disabled={isDetecting}
          >
            {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => downloadLatexFile({ latex, title })}
            className="cursor-pointer bg-[#fafafa] text-[#09090b] hover:bg-[#e4e4e7]"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto h-[calc(100vh-117px)] max-w-[1500px] gap-4 px-4 py-4 md:px-6">
        
        {/* === MOBILE LAYOUT (CSS Flex) === */}
        <div className="flex h-full lg:hidden flex-col gap-4">
          <section className={`${activeMobilePane === "preview" ? "hidden" : "flex"} min-h-0 flex-col flex-1`}>
            <div className={`min-h-0 ${showIssuesPanel ? "flex-[0.6]" : "flex-1"} transition-all duration-300`}>
              <textarea
                value={latex}
                onChange={(event) => {
                  setLatex(event.target.value)
                  setSaveState("dirty")
                }}
                spellCheck={false}
                className="h-full min-h-[320px] w-full resize-none rounded-xl border border-white/10 bg-[#18181b]/50 px-4 py-4 font-mono text-[13px] leading-6 text-[#f4f4f5] outline-none focus:border-white/20"
                placeholder="Your generated LaTeX will appear here."
              />
            </div>

            {previewError && (
              <div className="mt-3 border border-red-500/15 bg-red-500/5 px-5 py-4 rounded-xl">
                <div className="mb-2 text-sm font-medium text-red-300">Compilation issue</div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/15 bg-black/30 p-4 font-mono text-xs leading-6 text-red-200/90">
                  {previewError}
                </pre>
              </div>
            )}

            {/* Mobile Issues Panel */}
            {showIssuesPanel && (
              <div className="mt-3 flex-[0.4] min-h-0 flex flex-col rounded-xl border border-amber-500/15 bg-[#0f0f11] overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-amber-500/5">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-200">
                      {isDetecting ? "Detecting issues..." : `${detectedIssues.length} issue${detectedIssues.length !== 1 ? "s" : ""} detected`}
                    </span>
                    {targetJournal && !isDetecting && (
                      <span className="text-xs text-[#71717a] ml-1">• {targetJournal}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                  {detectSummary && (
                    <div className="text-[13px] leading-relaxed text-[#a1a1aa] pb-3 border-b border-white/5">
                      {detectSummary}
                    </div>
                  )}
                  {detectedIssues.length > 0 && (
                    <div className="space-y-1.5">
                      {detectedIssues.map((issue, idx) => {
                        const config = getIssueConfig(issue.type)
                        const isExpanded = expandedIssue === idx
                        return (
                          <button
                            key={issue.id || idx}
                            type="button"
                            onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                            className="w-full text-left rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3 px-3.5 py-2.5">
                              <span className="mt-0.5">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[#52525b]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#52525b]" />}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
                                  <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>
                                </div>
                                <p className="mt-1 text-[12.5px] leading-relaxed text-[#d4d4d8] line-clamp-2">{issue.description}</p>
                                {isExpanded && issue.location && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-md bg-black/30 border border-white/5">
                                    <span className="text-[11px] text-[#71717a] font-mono">{issue.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {isDetecting && detectedIssues.length === 0 && !detectSummary && (
                    <div className="flex items-center justify-center py-8 text-sm text-[#52525b]">
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400/60" />
                      Analyzing your manuscript...
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={`${activeMobilePane === "code" ? "hidden" : "flex"} min-h-0 flex-col flex-1`}>
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
              {previewUrl ? (
                <iframe title="LaTeX preview" src={previewUrl} className="h-full w-full bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#0f0f11] text-[#a1a1aa]">
                  <div className="flex items-center gap-3 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    Building preview...
                  </div>
                </div>
              )}
              {isCompiling && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[meteor_1.2s_linear_infinite]" />
              )}
            </div>
          </section>
        </div>

        {/* === DESKTOP LAYOUT (Resizable Panels) === */}
        <div className="hidden lg:block h-full">
          <ResizablePanelGroup autoSaveId="latex-editor-layout">
            
            {/* LEFT HALF (Editor + Issues) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div ref={leftPanelRef} className="h-full flex flex-col pr-2">
                {/* Editor */}
                <div
                  className="min-h-[120px] overflow-hidden"
                  style={{ flex: showIssuesPanel ? `0 0 ${editorHeight}%` : "1 1 auto" }}
                >
                  <textarea
                    value={latex}
                    onChange={(event) => {
                      setLatex(event.target.value)
                      setSaveState("dirty")
                    }}
                    spellCheck={false}
                    className="h-full w-full resize-none rounded-xl border border-white/10 bg-[#18181b]/50 px-4 py-4 font-mono text-[13px] leading-6 text-[#f4f4f5] outline-none focus:border-white/20"
                    placeholder="Your generated LaTeX will appear here."
                  />
                </div>

                {previewError && (
                  <div className="mt-2 border border-red-500/15 bg-red-500/5 px-5 py-4 rounded-xl shrink-0">
                    <div className="mb-2 text-sm font-medium text-red-300">Compilation issue</div>
                    <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/15 bg-black/30 p-4 font-mono text-xs leading-6 text-red-200/90">
                      {previewError}
                    </pre>
                  </div>
                )}

                {/* Vertical drag handle between editor and issues */}
                {showIssuesPanel && (
                  <div
                    className="h-2 shrink-0 flex items-center justify-center cursor-row-resize group"
                    onMouseDown={handleVerticalDragStart}
                  >
                    <div className="w-10 h-1 rounded-full bg-white/10 group-hover:bg-white/25 transition-colors" />
                  </div>
                )}

                {/* Issues panel */}
                {showIssuesPanel && (
                  <div className="flex-1 min-h-[100px] flex flex-col rounded-xl border border-amber-500/15 bg-[#0f0f11] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-amber-500/5 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-200">
                          {isDetecting ? "Detecting issues..." : `${detectedIssues.length} issue${detectedIssues.length !== 1 ? "s" : ""} detected`}
                        </span>
                        {targetJournal && !isDetecting && (
                          <span className="text-xs text-[#71717a] ml-1">• {targetJournal}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                      {detectSummary && (
                        <div className="text-[13px] leading-relaxed text-[#a1a1aa] pb-3 border-b border-white/5">
                          {detectSummary}
                        </div>
                      )}

                      {detectedIssues.length > 0 && (
                        <div className="space-y-1.5">
                          {detectedIssues.map((issue, idx) => {
                            const config = getIssueConfig(issue.type)
                            const isExpanded = expandedIssue === idx
                            return (
                              <button
                                key={issue.id || idx}
                                type="button"
                                onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                                className="w-full text-left rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                              >
                                <div className="flex items-start gap-3 px-3.5 py-2.5">
                                  <span className="mt-0.5">
                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[#52525b]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#52525b]" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
                                      <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>
                                    </div>
                                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#d4d4d8] line-clamp-2">{issue.description}</p>
                                    {isExpanded && issue.location && (
                                      <div className="mt-2 px-2.5 py-1.5 rounded-md bg-black/30 border border-white/5">
                                        <span className="text-[11px] text-[#71717a] font-mono">{issue.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {isDetecting && detectedIssues.length === 0 && !detectSummary && (
                        <div className="flex items-center justify-center py-8 text-sm text-[#52525b]">
                          <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400/60" />
                          Analyzing your manuscript...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-transparent hover:bg-white/10 transition-colors" />

            {/* RIGHT HALF (Preview) */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full pl-2">
                <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
                  {previewUrl ? (
                    <iframe title="LaTeX preview" src={previewUrl} className="h-full w-full bg-white" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#0f0f11] text-[#a1a1aa]">
                      <div className="flex items-center gap-3 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                        Building preview...
                      </div>
                    </div>
                  )}

                  {isCompiling && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[meteor_1.2s_linear_infinite]" />
                  )}
                </div>
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  )
}
