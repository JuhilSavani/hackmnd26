// nodes/node1_detect.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DetectionOutputSchema } from "../state.js";
import { buildDetectPrompt } from "../prompts/detect.prompt.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(DetectionOutputSchema);

const streamModel = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  streaming: true,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function node1Detect(state, config) {
  console.log("\n[Node 1] Starting detection...");

  const prompt = buildDetectPrompt({
    document_content:          state.document_content,
    formatting_metadata:       state.document_metadata,
    parsed_guidelines_content: state.parsed_guidelines_content,
  });

  const promptChars = JSON.stringify(prompt).length;
  console.log(`[Node 1] Prompt length    : ${promptChars} chars`);

  const result = await model.invoke(prompt);

  console.log(`[Node 1] Journal detected : ${result.target_journal}`);
  console.log(`[Node 1] Issues found     : ${result.detected_issues.length}`);
  console.log(`[Node 1] Summary          : ${result.summary}`);
  result.detected_issues.forEach((i) => console.log(`         • [${i.type}] ${i.description}`));

  // ── Secondary Streaming Call ──────────────────────────────────────────────
  const streamCallback = config?.configurable?.streamCallback;
  let detectSummary = "";
  
  const summaryPrompt = `Summarize these manuscript findings in 2-3 sentences max for the user. Do not use markdown like bolding. Be concise.
  Target Journal: ${result.target_journal}
  Total Issues Detected: ${result.detected_issues.length}
  Details: ${result.detected_issues.map((i) => `[${i.type}] ${i.description}`).join('; ')}`;
  
  if (streamCallback) {
    const stream = await streamModel.stream(summaryPrompt);
    for await (const chunk of stream) {
      detectSummary += chunk.content;
      streamCallback({ type: "token", node: "node1", val: chunk.content });
    }
    // Add a newline at the end of the stream for clean UI grouping later
    streamCallback({ type: "token", node: "node1", val: "\n\n" });
  } else {
    // If not streaming, just invoke to get the summary
    const summaryResult = await streamModel.invoke(summaryPrompt);
    detectSummary = summaryResult.content;
  }

  return {
    target_journal:  result.target_journal,
    detected_issues: result.detected_issues,
    document_latex:  result.document_latex,
    detect_summary:  detectSummary,
  };
}
