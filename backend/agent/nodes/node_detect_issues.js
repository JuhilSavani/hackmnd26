// nodes/node_detect_issues.js
// Lightweight detection-only node for the live editor "Detect Issues" feature.
// Single LLM call — returns structured issues directly, no streaming.

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { IssueSchema } from "../state.js";
import { buildLiveDetectPrompt } from "../prompts/detect.prompt.live.js";

// ── Detection-only output schema ──────────────────────────────────────────────
const LiveDetectionOutputSchema = z
  .object({
    target_journal: z
      .string()
      .describe(
        "Specific journal name or citation style detected. " +
          "Be precise: 'APA 7th Edition', 'Vancouver', 'PNAS house style', 'IEEE'. " +
          "Never return just 'APA' — always include the edition."
      ),
    summary: z
      .string()
      .describe(
        "2-3 sentences covering: total number of issues found, which categories " +
          "dominate, and overall compliance level. Do not list individual issues here."
      ),
    detected_issues: z
      .array(IssueSchema)
      .describe(
        "All confirmed formatting violations. Group structurally identical " +
          "violations of the same type into ONE entry. Only create separate entries " +
          "when instances require different fixes."
      ),
  })
  .describe("Structured output from live editor detection pass.");

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(LiveDetectionOutputSchema);

export async function nodeDetectIssues(state, config) {
  console.log("\n[Detect Issues] Starting detection...");

  const prompt = buildLiveDetectPrompt({
    latex_content: state.latex_content,
    guidelines_text: state.guidelines_text,
  });

  const promptChars = JSON.stringify(prompt).length;
  console.log(`[Detect Issues] Prompt length: ${promptChars} chars`);

  const result = await model.invoke(prompt, config);

  console.log(`[Detect Issues] Journal detected : ${result.target_journal}`);
  console.log(`[Detect Issues] Issues found     : ${result.detected_issues.length}`);
  console.log(`[Detect Issues] Summary          : ${result.summary}`);
  result.detected_issues.forEach((i) =>
    console.log(`         • [${i.type}] ${i.description}`)
  );

  return {
    target_journal: result.target_journal,
    detected_issues: result.detected_issues,
    summary: result.summary,
  };
}
