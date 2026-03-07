// nodes/node1_detect.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DetectionOutputSchema } from "../state.js";
import { buildDetectPrompt } from "../prompts/detect.prompt.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(DetectionOutputSchema);

const streamModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
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
  
  const summaryPrompt = `You are presenting a detection report to a researcher who just uploaded their manuscript. Write a comprehensive, well-structured summary of the findings. Do not use markdown formatting like bold (**) or headers (#). Use plain text only.

Structure your summary as follows:

1. Open with the identified target journal and citation style, and state the total number of issues detected.

2. Break down the issues by category (e.g., Citation & Reference Issues, Structural Issues, Formatting Issues). For each category, briefly explain what was found and how many issues fall under it.

3. Highlight the most critical issues that need immediate attention — mention specific examples where possible (e.g., "References 4 through 18 are missing DOI fields", "Figure labels inconsistently alternate between Fig. and Figure").

4. Close with an overall compliance assessment — is the manuscript close to being compliant, or does it need significant work?

Keep the tone professional and informative. Aim for 6-10 sentences that give the researcher a clear picture of what was found and what matters most.

Here are the detection results:
Target Journal: ${result.target_journal}
Total Issues Detected: ${result.detected_issues.length}
Issue Details:
${result.detected_issues.map((i, idx) => `${idx + 1}. [${i.type}] ${i.description} (Location: ${i.location || 'N/A'})`).join('\n')}`;
  
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
