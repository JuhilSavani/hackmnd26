// nodes/node3_critic.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CriticOutputSchema, ComplianceScoreSchema } from "../state.js";
import { buildCriticPrompt } from "../prompts/critic.prompt.js";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(CriticOutputSchema);

const streamModel = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  temperature: 0,
  streaming: true,
  apiKey: process.env.GEMINI_API_KEY,
});

const scoringModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
}).withStructuredOutput(ComplianceScoreSchema);

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
      console.log(`         \u2713 Applied : ${fix.description}`);
    } else {
      const reason = occurrences === 0 ? "target not found" : "target not unique";
      failedFixes.push({ ...fix, error: reason });
      console.log(`         \u2717 Failed  : ${fix.description} \u2014 ${reason}`);
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
    console.log(`[Node 3] Looping back \u2192 iteration ${iteration + 1}`);
    return {
      document_latex:  patchedLatex,
      detected_issues: criticResult.remaining_issues,
      applied_fixes:   newlyApplied,
      is_loop:         true,
      iteration:       iteration + 1,
      fixes:           [],
    };
  }

  // ── Exit ─────────────────────────────────────────────────

  const allApplied = [...applied_fixes, ...newlyApplied];

  console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("  Pipeline complete");
  console.log(`  Iterations used : ${iteration + 1}`);
  console.log(`  Total fixes     : ${allApplied.length}`);
  console.log("  Changelog:");
  allApplied.forEach((f) => console.log(`    \u2022 ${f.description}`));
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  // ── Final Summary Generation (Only on exit) ───────────────────────────────
  const streamCallback = config?.configurable?.streamCallback;
  let fixSummary = "";

  console.log(`[Node 3] Streaming prep: shouldLoop=${shouldLoop}, hasStreamCallback=${!!streamCallback}, allApplied.length=${allApplied.length}`);

  if (!shouldLoop) {
    if (allApplied.length > 0) {
      const summaryPrompt = "Summarize the fixes applied to the manuscript in 2-3 sentences max. Do not use markdown like bolding. Be concise.\nTotal Fixes Applied: " + allApplied.length + "\nDetails: " + allApplied.map((f) => f.description).join('; ');

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

  // ── Compliance Score Generation ───────────────────────────────────────────
  console.log(`[Node 3] Generating compliance score...`);

  const scoringSystemMsg = [
    "You are a journal compliance auditor. Score the manuscript on exactly 10 categories, 10 points each (100 total).",
    "",
    "SCORING CATEGORIES (in this exact order):",
    "1. Citation Integrity - Do all cite commands have matching bibitem entries and vice versa?",
    "2. DOI Fields - Do all journal article references have a doi field (UNKNOWN counts as present)?",
    "3. Reference Ordering - Are references numbered sequentially or alphabetically per style?",
    "4. Author Format - Are author names consistently formatted per citation style?",
    "5. Heading Hierarchy - No skipped heading levels?",
    "6. Abstract Format - Has abstract environment, single paragraph, keywords present?",
    "7. Figure and Table Labels - Consistent use of Figure/Fig. and Table/Tbl.?",
    "8. Fix Regression Free - No regressions introduced by applied fixes?",
    "9. Structural Completeness - Has title, author, abstract, sections, bibliography?",
    "10. Inline Formatting - Greek letters in math mode, special chars escaped?",
    "",
    "SCORING GUIDE:",
    "- 10/10: Fully compliant, no issues",
    "- 7-9/10: Minor issues (1-2 entries slightly off)",
    "- 4-6/10: Several issues found",
    "- 1-3/10: Major violations",
    "- 0/10: Category completely violated or missing",
    "",
    'status mapping: score 10 = "pass", score 7-9 = "warning", score 0-6 = "fail"',
    "",
    "overall_score MUST equal the sum of all 10 individual scores.",
    "total_fixes_applied = " + allApplied.length
  ].join("\n");

  const guidelinesSection = parsed_guidelines_content
    ? "JOURNAL GUIDELINES:\n" + parsed_guidelines_content
    : "No specific guidelines provided. Score against the citation style present in the document.";

  const fixesSection = allApplied.length > 0
    ? "FIXES APPLIED (" + allApplied.length + " total):\n" + allApplied.map((f) => "- " + f.description).join("\n")
    : "No fixes were needed.";

  const scoringPrompt = [
    { role: "system", content: scoringSystemMsg },
    {
      role: "user",
      content: "PATCHED LATEX DOCUMENT TO SCORE:\n" + patchedLatex + "\n\n" + guidelinesSection + "\n\n" + fixesSection + "\n\nGenerate the compliance score now."
    }
  ];

  let complianceScore = null;
  try {
    complianceScore = await scoringModel.invoke(scoringPrompt);
    console.log(`[Node 3] Compliance score : ${complianceScore.overall_score}/100`);
    console.log(`[Node 3] Rules count      : ${complianceScore.rules?.length}`);

    if (streamCallback) {
      streamCallback({ type: "compliance_score", val: complianceScore });
    }
  } catch (scoreErr) {
    console.error("[Node 3] Scoring failed:", scoreErr);
    // Fallback \u2014 don't crash the pipeline over a scoring failure
    complianceScore = {
      overall_score: 0,
      rules: [],
      total_fixes_applied: allApplied.length,
    };
    if (streamCallback) {
      streamCallback({ type: "compliance_score", val: complianceScore });
    }
  }

  return {
    document_latex:     patchedLatex,
    detected_issues:    criticResult.remaining_issues,
    applied_fixes:      newlyApplied,
    is_loop:            false,
    compliance_score:   complianceScore,
    ...( !shouldLoop && { fix_summary: fixSummary } )
  };
}
