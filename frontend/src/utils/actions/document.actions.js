import axios from "@/utils/axios"

export async function loadLatexSourceAction(threadId) {
  try {
    const { data } = await axios.get(`/document/source/${threadId}`)
    return {
      title: data.title,
      latex: data.latex,
      source: data.source,
      updatedAt: data.updatedAt,
      error: null,
    }
  } catch (error) {
    console.error("Failed to load LaTeX source:", error)
    return {
      error: error.response?.data?.error || error.message,
      details: error.response?.data?.details || null,
    }
  }
}

export async function saveLatexSourceAction({ threadId, latex }) {
  try {
    const { data } = await axios.put(`/document/source/${threadId}`, { latex })
    return { success: true, updatedAt: data.updatedAt, error: null }
  } catch (error) {
    console.error("Failed to save LaTeX source:", error)
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    }
  }
}

export async function compileLatexPreviewAction({ threadId, latex, signal }) {
  try {
    const response = await axios.post(
      "/document/preview",
      { threadId, latex },
      { responseType: "blob", signal }
    )

    const blobUrl = URL.createObjectURL(response.data)
    return { previewUrl: blobUrl, error: null }
  } catch (error) {
    const isCancelled = error.name === "CanceledError" || error.code === "ERR_CANCELED"

    if (isCancelled) {
      return { cancelled: true, error: null }
    }

    let details = null

    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        details = parsed.details || null
        return {
          error: parsed.error || error.message,
          details,
        }
      } catch {
        details = null
      }
    }

    return {
      error: error.response?.data?.error || error.message,
      details,
    }
  }
}
