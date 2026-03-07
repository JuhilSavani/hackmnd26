// nodes/node3_critic.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CriticOutputSchema } from "../state.js";
import { buildCriticPrompt } from "../prompts/critic.prompt.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(CriticOutputSchema);

const streamModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0.3,
  streaming: true,
  apiKey: process.env.GEMINI_API_KEY,
});

export async function node3Critic(state, config) {
  const { document_latex, fixes = [], applied_fixes, parsed_guidelines_content, iteration } = state;

  console.log(`\n[Node 3] Applying ${fixes.length} fix(es)...`);

  // ── Apply fixes — pure string replacement ────────────────────────────────
  let patchedLatex = document_latex;
  const newlyApplied = [];
  const failedFixes = [];

  for (const fix of fixes) {
    const occurrences = patchedLatex.split(fix.target).length - 1;

    if (occurrences === 1) {
      patchedLatex = patchedLatex.replace(fix.target, fix.replacement);
      newlyApplied.push(fix);
      console.log(`         ✓ Applied : ${fix.description}`);
    } else {
      const reason = occurrences === 0 ? "target not found" : "target not unique";
      failedFixes.push({ ...fix, error: reason });
      console.log(`         ✗ Failed  : ${fix.description} — ${reason}`);
    }
  }

  // ── Critic LLM call ───────────────────────────────────────────────────────
  console.log(`[Node 3] Running critic validation...`);

  const prompt = buildCriticPrompt({
    document_latex:            patchedLatex,
    parsed_guidelines_content: parsed_guidelines_content,
    applied_fixes:             newlyApplied,
  });

  const promptChars = JSON.stringify(prompt).length;
  console.log(`[Node 3] Prompt length    : ${promptChars} chars`);

  const criticResult = await model.invoke(prompt);

  console.log(`[Node 3] Compliant        : ${criticResult.is_compliant}`);
  console.log(`[Node 3] Remaining issues : ${criticResult.remaining_issues.length}`);

  const shouldLoop = criticResult.remaining_issues.length > 0 && iteration < 2;

  // ── Loop branch ───────────────────────────────────────────────────────────
  if (shouldLoop) {
    console.log(`[Node 3] Looping back → iteration ${iteration + 1}`);
    return {
      document_latex:  patchedLatex,
      detected_issues: criticResult.remaining_issues,
      applied_fixes:   newlyApplied,
      is_loop:         true,
      iteration:       iteration + 1,
      fixes:           [],
    };
  }

  // ── Exit ─────────────────────────────────────────────
  
  const allApplied = [...applied_fixes, ...newlyApplied];

  console.log("\n══════════════════════════════════════════");
  console.log("  Pipeline complete");
  console.log(`  Iterations used : ${iteration + 1}`);
  console.log(`  Total fixes     : ${allApplied.length}`);
  console.log("  Changelog:");
  allApplied.forEach((f) => console.log(`    • ${f.description}`));
  console.log("══════════════════════════════════════════\n");

  // ── Final Summary Generation (Only on exit) ───────────────────────────────
  const streamCallback = config?.configurable?.streamCallback;
  let fixSummary = "";
  
  console.log(`[Node 3] Streaming prep: shouldLoop=${shouldLoop}, hasStreamCallback=${!!streamCallback}, allApplied.length=${allApplied.length}`);
  
  if (!shouldLoop) {
    if (allApplied.length > 0) {
      const summaryPrompt = `Summarize the fixes applied to the manuscript in 2-3 sentences max. Do not use markdown like bolding. Be concise.
      Total Fixes Applied: ${allApplied.length}
      Details: ${allApplied.map((f) => f.description).join('; ')}`;
      
      if (streamCallback) {
        console.log(`[Node 3] Starting final summary stream to user...`);
        const stream = await streamModel.stream(summaryPrompt);
        let chunksSent = 0;
        for await (const chunk of stream) {
          chunksSent++;
          fixSummary += chunk.content;
          streamCallback({ type: "token", node: "node3", val: chunk.content });
        }
        console.log(`[Node 3] Stream complete. Sent ${chunksSent} chunks.`);
        streamCallback({ type: "token", node: "node3", val: "\n\n" });
      } else {
        const summaryResult = await streamModel.invoke(summaryPrompt);
        fixSummary = summaryResult.content;
      }
    } else {
      console.log(`[Node 3] No fixes applied, sending static summary...`);
      fixSummary = "No formatting fixes were required. The manuscript meets all guidelines.";
      if (streamCallback) {
        streamCallback({ type: "token", node: "node3", val: fixSummary + "\n\n" });
      }
    }
  }

  return {
    document_latex:     patchedLatex,
    detected_issues:    criticResult.remaining_issues,
    applied_fixes:      newlyApplied,
    is_loop:            false,
    ...( !shouldLoop && { fix_summary: fixSummary } )
  };
}
