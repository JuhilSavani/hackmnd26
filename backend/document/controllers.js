import cloudinary from "../configs/cloudinary.configs.js";
import { Thread } from "../models/thread.models.js";
import { extractDocument } from "../utils/extract.js";
import { FirecrawlClient } from "@mendable/firecrawl-js";

/**
 * @route   POST /api/document/process
 * @desc    Main entry point for handling document extraction via Server-Sent Events (SSE)
 */
export const processDocumentStream = async (req, res) => {
  const { threadId, publicId, fileName, guidelinesUrl } = req.body;
  const userId = req.user?.id || req.user?.userId || "anon";

  // 1. Set SSE Required Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  res.on('close', () => controller.abort());

  try {
    if (!threadId || !publicId || !fileName) {
      throw new Error("Missing required fields: threadId, publicId, or fileName.");
    }

    // 2. Database validation/update
    
    // We assume the thread might have been created already by the workspace UI, 
    // or we create/update it here with the newly uploaded artifacts.
    await Thread.upsert({
      threadId,
      userId,
      publicId,
      guidelinesUrl,
      title: fileName || "Untitled"
    });

    if (controller.signal.aborted) return;

    // 3. SECURE FETCH FROM CLOUDINARY
    res.write(`data: ${JSON.stringify({ type: "loading", val: "Downloading document securely from storage..." })}\n\n`);
    
    const signedUrl = cloudinary.utils.private_download_url(
      publicId, 
      "",
      {
        resource_type: "raw",   // Documents are raw
        type: "authenticated",
        expires_at: Math.floor(Date.now() / 1000) + 300, 
        attachment: false
      }
    );

    const docResponse = await fetch(signedUrl, { signal: controller.signal });

    console.log(signedUrl);
    if (!docResponse.ok) {
      throw new Error(`Cloudinary fetch failed: ${docResponse.status} ${docResponse.statusText}`);
    }

    const buffer = await docResponse.arrayBuffer();

    if (controller.signal.aborted) return;

    // 4. EXTRACTION PIPELINE
    res.write(`data: ${JSON.stringify({ type: "processing", val: "Parsing underlying file structure and metadata..." })}\n\n`);
    
    const { text, metadata } = await extractDocument(buffer, fileName);

    if (controller.signal.aborted) return;

    // 5. SERVER LOGGING
    console.log(`\n================================`);
    console.log(`🟢 EXTRACTION SUCCESS: ${fileName}`);
    console.log(`Thread ID: ${threadId}`);
    console.log(`Extracted Text Length: ${text.length} chars`);
    console.log(`Extracted Text Sample (first 500 chars):\n${text.substring(0, 500)}...`);
    if (metadata) {
       console.log(`Extracted Metadata Keys: ${Object.keys(metadata).join(', ')}`);
    } else {
       console.log(`Extracted Metadata: null (PDF)`);
    }
    console.log(`================================\n`);

    if (controller.signal.aborted) return;

    // 6. FETCH GUIDELINES via Firecrawl
    let guidelinesContent = null;

    if (guidelinesUrl) {
      res.write(`data: ${JSON.stringify({ type: "processing", val: "Scraping guidelines from provided URL..." })}\n\n`);

      try {
        const firecrawl = new FirecrawlClient({ apiKey: process.env.FIRECRAWL_API_KEY });
        const scrapeResult = await firecrawl.scrape(guidelinesUrl, { 
          formats: ["markdown"],
          onlyMainContent: true
        });

        if (scrapeResult && scrapeResult.markdown) {
          guidelinesContent = scrapeResult.markdown;
          console.log(`\n📄 GUIDELINES SCRAPED: ${guidelinesUrl}`);
          console.log(`   Content length: ${guidelinesContent.length} chars`);
        } else {
          console.warn(`⚠️ Firecrawl scrape returned no markdown for: ${guidelinesUrl}`);
        }
      } catch (scrapeErr) {
        console.error(`⚠️ Firecrawl scrape failed for ${guidelinesUrl}:`, scrapeErr.message);
        // Non-fatal: we still save the document extraction even if guidelines fail
        res.write(`data: ${JSON.stringify({ type: "processing", val: "Guidelines fetch encountered an issue, continuing..." })}\n\n`);
      }
    }

    if (controller.signal.aborted) return;

    // 7. DB PERSISTENCE — store extracted text, document type, and guidelines in the Thread
    const documentType = fileName.split('.').pop().toLowerCase();

    await Thread.update(
      { extractedText: text, documentType, guidelinesContent, documentMetadata: metadata },
      { where: { threadId } }
    );

    res.write(`data: ${JSON.stringify({ type: "success", status: "done", val: "Parsing finished and context initialized." })}\n\n`);

  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'Abort') {
      console.log('🚫 Document Stream aborted by client');
      return;
    }
    console.error("Document Processing Error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", val: error.message || "Internal server error during document processing." })}\n\n`);
  } finally {
    // 7. Signal end of stream
    res.write("data: [DONE]\n\n");
    res.end();
  }
};

/**
 * Build the complete, compilable LaTeX document from agent state.
 * Extracts from LangGraph checkpoint, post-processes (escapes bare &),
 * and wraps with a full preamble.
 */
async function buildFinalLatex(thread) {
  const { buildGraph } = await import("../agent/graph.js");
  const { checkpointer } = await import("../configs/sequelize.configs.js");

  const graph = buildGraph({ checkpointer });
  const agentRunId = thread.agentRunId;
  if (!agentRunId) throw new Error("Agent has not been run for this thread yet");

  const state = await graph.getState({ configurable: { thread_id: agentRunId } });
  const rawBodyLatex = state.values?.document_latex;
  if (!rawBodyLatex) throw new Error("No compiled latex document exists for this thread yet");

  // Post-process: escape bare & outside tabular environments.
  const bodyLatex = rawBodyLatex
    .split(/(\\begin\{tabular\}[\s\S]*?\\end\{tabular\})/g)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/(?<!\\)&/g, '\\&');
    })
    .join('');

  return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{url}
\\usepackage{hyperref}
\\usepackage[numbers]{natbib}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{setspace}
\\usepackage{caption}
\\usepackage{float}
\\usepackage{booktabs}
\\usepackage{microtype}

% Define \\doi command used by the agent for DOI placeholders
\\providecommand{\\doi}[1]{\\texttt{doi:#1}}

\\begin{document}

${bodyLatex.trim()}

\\end{document}
`;
}

/**
 * @route   GET /api/document/finalize/:threadId?format=tex|pdf
 * @desc    Generate a downloadable LaTeX or compiled PDF for the thread.
 *          - format=tex (default): uploads .tex to Cloudinary, returns signed URL
 *          - format=pdf: compiles via latexonline.cc, streams PDF to browser
 */
export const finalizeDocument = async (req, res) => {
  const { threadId } = req.params;
  const format = (req.query.format || "tex").toLowerCase();
  const userId = req.user?.id || req.user?.userId || "anon";

  try {
    const thread = await Thread.findOne({ where: { threadId, userId } });
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const finalLatex = await buildFinalLatex(thread);

    // ── TEX download ──────────────────────────────────────────────────────
    if (format === "tex") {
      const { uploadLatexToCloudinary, generateDownloadUrl } = await import("../configs/cloudinary.configs.js");
      const uploadResult = await uploadLatexToCloudinary(finalLatex, threadId, userId);
      await Thread.update({ finalDocumentId: uploadResult.public_id }, { where: { threadId } });
      const signedLink = generateDownloadUrl(uploadResult.public_id);
      return res.status(200).json({ downloadUrl: signedLink });
    }

    // ── PDF download ──────────────────────────────────────────────────────
    if (format === "pdf") {
      // Use latex.ytotech.com REST API — accepts JSON, returns compiled PDF
      const compileResponse = await fetch("https://latex.ytotech.com/builds/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compiler: "pdflatex",
          resources: [
            { main: true, content: finalLatex }
          ]
        }),
      });

      if (!compileResponse.ok) {
        const errText = await compileResponse.text().catch(() => "Unknown compilation error");
        console.error("[PDF Compile] ytotech error:", compileResponse.status, errText);
        return res.status(502).json({ error: "PDF compilation failed. The LaTeX may contain errors." });
      }

      const fileName = (thread.title || "manuscript").replace(/\.[^.]+$/, "");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);

      // Stream the PDF response body directly to the client
      const reader = compileResponse.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      return pump();
    }

    return res.status(400).json({ error: `Invalid format "${format}". Use "pdf" or "tex".` });

  } catch (err) {
    console.error("Finalize Document Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate document" });
  }
};
