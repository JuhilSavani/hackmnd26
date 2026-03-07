import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import Loading from "@/utils/components/Loading"
import {
  compileLatexPreviewAction,
  loadLatexSourceAction,
  saveLatexSourceAction,
} from "@/utils/actions/document.actions"

const PREVIEW_DEBOUNCE_MS = 1000
const SAVE_DEBOUNCE_MS = 1500

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

  const previewAbortRef = useRef(null)
  const previewUrlRef = useRef(null)
  const hasLoadedRef = useRef(false)
  const skipNextSaveRef = useRef(false)

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
            onClick={() => downloadLatexFile({ latex, title })}
            className="cursor-pointer bg-[#fafafa] text-[#09090b] hover:bg-[#e4e4e7]"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto grid h-[calc(100vh-117px)] max-w-[1500px] gap-4 px-4 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <section className={`${activeMobilePane === "preview" ? "hidden lg:flex" : "flex"} min-h-0 flex-col`}>
          <div className="min-h-0 flex-1">
            <textarea
              value={latex}
              onChange={(event) => {
                setLatex(event.target.value)
                setSaveState("dirty")
              }}
              spellCheck={false}
              className="h-full min-h-[320px] w-full resize-none rounded-xl border border-white/10 bg-[#09090b] px-4 py-4 font-mono text-[13px] leading-6 text-[#f4f4f5] outline-none focus:border-white/20"
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
        </section>

        <section className={`${activeMobilePane === "code" ? "hidden lg:flex" : "flex"} min-h-0 flex-col`}>
          <div className="min-h-0 flex-1">
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
          </div>
        </section>
      </main>
    </div>
  )
}
