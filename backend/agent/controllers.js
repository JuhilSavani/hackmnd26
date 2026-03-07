import { buildGraph } from "./graph.js";
import { Thread } from "../models/thread.models.js";
import { checkpointer } from "../configs/sequelize.configs.js";

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
          thread_id: threadId,
          streamCallback
        },
        signal: controller.signal,
      }
    );

    for await (const event of stream) {
      if (event.event === "on_chain_start" && event.name === "node1") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Detection is being started" })}\n\n`);
      } else if (event.event === "on_chain_start" && event.name === "node2") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Now fix is being started" })}\n\n`);
      } else if (event.event === "on_chain_start" && event.name === "node3") {
         res.write(`data: ${JSON.stringify({ type: "processing", text: "Validation is being started" })}\n\n`);
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
