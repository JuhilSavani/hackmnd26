// nodes/node2_fix.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { FixOutputSchema } from "../state.js";
import { buildFixPrompt } from "../prompts/fix.prompt.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(FixOutputSchema);

export async function node2Fix(state) {
  console.log(`\n[Node 2] Generating fixes (iteration ${state.iteration}, mode: ${state.is_loop ? "B-loop" : "A-first"})...`);

  const prompt = buildFixPrompt({
    document_latex:            state.document_latex,
    detected_issues:           state.detected_issues,
    parsed_guidelines_content: state.parsed_guidelines_content,
    is_loop:                   state.is_loop,
  });

  const promptChars = JSON.stringify(prompt).length;
  console.log(`[Node 2] Prompt length    : ${promptChars} chars`);

  const result = await model.invoke(prompt);

  console.log(`[Node 2] Fixes generated : ${result.fixes.length}`);
  result.fixes.forEach((f) => console.log(`         • ${f.description}`));

  return { fixes: result.fixes };
}
