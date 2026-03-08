import { randomUUID } from "crypto";
import { buildGraph } from "./graph.js";
import { buildDetectIssuesGraph } from "./detectIssuesGraph.js";
import { Thread } from "../models/thread.models.js";
import { checkpointer } from "../configs/sequelize.configs.js";

/**
 * @route   POST /api/agent/detect-issues
 * @desc    Run a lightweight detection-only agent on the editor's current LaTeX.
 *          Returns structured issues list via JSON.
 */
export const detectIssues = async (req, res) => {
  const { threadId, latex } = req.body;
  const userId = req.user.id;

  if (!threadId || !latex) {
    return res.status(400).json({ error: "Missing threadId or latex" });
  }

  // Setup disconnect handler to cancel LLM generation
  const abortController = new AbortController();
  req.on("close", () => {
    if (!res.headersSent) {
      console.log(`[Detect Issues] Client disconnected, aborting generation for ${threadId}`);
      abortController.abort();
    }
  });

  try {
    const thread = await Thread.findOne({ where: { threadId, userId } });
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const graph = buildDetectIssuesGraph(); // No checkpointer passed

    const initialState = {
      latex_content: latex,
      guidelines_text: thread.guidelinesContent || null,
    };

    const result = await graph.invoke(initialState, { signal: abortController.signal });

    return res.status(200).json({
      target_journal: result.target_journal,
      detected_issues: result.detected_issues,
      summary: result.summary,
    });

  } catch (err) {
    if (err.name === "AbortError") {
      console.log("[Detect Issues] Request aborted successfully.");
      return; // Headers already closed, doing nothing.
    }
    
    console.error("Detect Issues Error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal detection error" });
    }
  }
};

export const streamAgent = async (req, res) => {
  const { threadId } = req.body;
  const userId = req.user.id;

  if (!threadId) {
    return res.status(400).json({ error: "Missing threadId" });
  }

  try {
    const thread = await Thread.findOne({ where: { threadId, userId } });
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const { extractedText, documentMetadata, guidelinesContent } = thread;

    if (!extractedText) {
      return res.status(400).json({ error: "No document text extracted yet" });
    }

    // Set SSE Required Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Setup disconnect handler
    const controller = new AbortController();
    res.on("close", () => controller.abort());

    const streamCallback = (eventPayload) => {
      res.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
    };

    // Generate a fresh LangGraph thread ID for every agent run.
    // Reusing the same thread_id causes LangGraph to resume from the END
    // checkpoint which sends empty contents to Gemini → 400 "empty input".
    const agentRunId = randomUUID();
    await Thread.update({ agentRunId }, { where: { threadId } });

    const graph = buildGraph({ checkpointer });

    const stream = await graph.streamEvents(
      {
        document_content: extractedText,
        document_metadata: documentMetadata,
        parsed_guidelines_content: guidelinesContent || null,
      },
      {
        version: "v2",
        configurable: { 
          thread_id: agentRunId,
          streamCallback
        },
        signal: controller.signal,
      }
    );

    for await (const event of stream) {
      if (event.event === "on_chain_start" && event.name === "node1") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Analyzing document against formatting guidelines..." })}\n\n`);
      } else if (event.event === "on_chain_start" && event.name === "node2") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Applying identified formatting corrections..." })}\n\n`);
      } else if (event.event === "on_chain_start" && event.name === "node3") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Performing strict academic validation on applied corrections..." })}\n\n`);
      }
      // Node updates and ends are handled silently or by streamCallback inside nodes
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    if (err.name === "AbortError" || err.message === "AbortError") {
      console.log(`[SSE] Client disconnected from agent stream for thread ${threadId}`);
      return;
    }
    console.error("Agent Stream Error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", val: "Internal agent error" })}\n\n`);
    res.end();
  }
};
