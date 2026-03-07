// backend/pipeline/state.js
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";

// ── Zod schemas ───────────────────────────────────────────────────────────────
// .describe() is passed into Gemini's function-calling schema as field
// documentation — fill these in accurately so the model knows exactly
// what to put in each field.

export const IssueSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Unique issue identifier. Format: issue_001, issue_002, ... or remaining_001, remaining_002, ... in sequence."
      ),

    type: z
      .string()
      .describe("Category of the formatting violation. Pick the single most specific type from: missing_doi, unmatched_citation, duplicate_reference, broken_ref_numbering, heading_hierarchy_violation, mixed_figure_label, incorrect_author_format, spacing_deviation, margin_deviation, font_deviation, abstract_format, title_page_format."),

    description: z
      .string()
      .describe(
        "Specific, actionable description of what is wrong and where. " +
          "Must name the exact \\bibitem key, \\cite key, heading text, or " +
          "section. 'May need review' is not acceptable."
      ),

    location: z
      .string()
      .describe(
        "Exact LaTeX anchor where the issue occurs. Examples: " +
          "'\\\\bibitem{smith2019}', '\\\\cite{zhao2024}', '\\\\section{Methods}', " +
          "'\\\\bibitem{ref1} through \\\\bibitem{ref29}' for grouped issues."
      ),
  })
  .describe("A single confirmed formatting violation found in the manuscript.");

export const DetectionOutputSchema = z
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
          "violations of the same type into ONE entry (e.g. all 29 references " +
          "missing DOIs = one issue). Only create separate entries when instances " +
          "require different fixes."
      ),

    document_latex: z
      .string()
      .describe(
        "Complete LaTeX conversion of the ENTIRE manuscript — body and bibliography. " +
          "Do not truncate, summarize, or omit any section. " +
          "Does NOT include \\documentclass, \\usepackage, \\begin{document}, \\end{document}."
      ),
  })
  .describe("Structured output from Node 1 detection pass.");

export const FixSchema = z
  .object({
    id: z
      .string()
      .describe("Unique fix identifier. Format: fix_001, fix_002, ... in sequence."),

    issue_ref: z
      .string()
      .describe(
        "The id of the issue this fix resolves. Must match an id from detected_issues. " +
          "Multiple fix objects may share the same issue_ref when one issue " +
          "requires multiple replacements (e.g. 29 references each needing a DOI)."
      ),

    description: z
      .string()
      .describe(
        "Human-readable changelog entry. Specific: name the \\bibitem key or " +
          "heading being fixed. Example: 'Added \\doi{UNKNOWN} to smith2019 reference'."
      ),

    target: z
      .string()
      .describe(
        "VERBATIM substring from document_latex to find and replace. " +
          "Must appear EXACTLY ONCE in the document. " +
          "Include surrounding lines for uniqueness if the snippet repeats. " +
          "Copy character-for-character — do not retype or paraphrase."
      ),

    replacement: z
      .string()
      .describe(
        "The corrected LaTeX string that replaces target. " +
          "Must preserve all semantic content — only formatting changes permitted. " +
          "Empty string is valid when the fix is a deletion (e.g. removing a duplicate \\bibitem)."
      ),
  })
  .describe("A single find-and-replace operation to apply to document_latex.");

export const FixOutputSchema = z
  .object({
    fixes: z
      .array(FixSchema)
      .describe(
        "All fix operations to apply in this pass. One fix per issue instance. " +
          "Empty array is valid if no safe fixes can be produced."
      ),
  })
  .describe("Structured output from Node 2 fix generation pass.");

export const CriticOutputSchema = z
  .object({
    is_compliant: z
      .boolean()
      .describe(
        "True ONLY if zero fixable issues remain after all nine validation checks. " +
          "True is also correct when all remaining issues are unfixable by mechanical " +
          "string replacement (e.g. genuinely unknown DOIs already marked UNKNOWN). " +
          "Do not set false out of caution — false triggers another pipeline loop."
      ),

    remaining_issues: z
      .array(IssueSchema)
      .describe(
        "Issues that are still present and fixable by string replacement. " +
          "Empty array when is_compliant is true. " +
          "Do NOT include: \\doi{UNKNOWN} entries, orphaned \\bibitem with no \\cite, " +
          "font/spacing issues without formatting_metadata. Those are resolved or unfixable."
      ),
  })
  .describe("Structured output from Node 3 critic validation pass.");

export const ComplianceRuleSchema = z
  .object({
    name: z.string().describe("Category name, e.g. 'Citation Integrity', 'DOI Fields'."),
    status: z.enum(["pass", "warning", "fail"]).describe("pass = fully compliant, warning = minor issues, fail = major violation."),
    score: z.number().int().min(0).max(10).describe("Score out of 10 for this rule."),
    max: z.number().int().describe("Maximum possible score. Always set to 10."),
    detail: z.string().describe("One-line explanation of what was checked and the result."),
  })
  .describe("Score for a single compliance rule.");

export const ComplianceScoreSchema = z
  .object({
    overall_score: z.number().int().min(0).max(100).describe("Sum of all rule scores. 0-100."),
    rules: z.array(ComplianceRuleSchema).min(1).describe("Rule scores, one per validation check. Should have 10 entries."),
    total_fixes_applied: z.number().int().min(0).describe("Total number of fixes applied across all iterations."),
  })
  .describe("Compliance scoring output from the final validation pass.");

// ── LangGraph Annotation state ────────────────────────────────────────────────

export const PipelineAnnotation = Annotation.Root({
  // ── Inputs (set once, never mutated) ────────────────────────────────────────
  document_content: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // DOCX only — null for PDF path
  document_metadata: Annotation({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Fetched journal guidelines — null if not provided
  parsed_guidelines_content: Annotation({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // ── Node 1 outputs ───────────────────────────────────────────────────────────
  target_journal: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),

  detected_issues: Annotation({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // The LaTeX source — set by Node 1, mutated (replaced) by Node 3 each pass
  document_latex: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // Stored summary from the detection node
  detect_summary: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Node 2 outputs ───────────────────────────────────────────────────────────
  // Replaced each pass — Node 3 consumes and clears
  fixes: Annotation({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // ── Node 3 outputs ───────────────────────────────────────────────────────────
  // Append-only across all iterations — builds the full changelog
  applied_fixes: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // Stored summary from the final validation fix node
  fix_summary: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),

  // ── Loop control ─────────────────────────────────────────────────────────────
  is_loop: Annotation({
    reducer: (_, b) => b,
    default: () => false,
  }),

  // 0 = first pass (Node 2 Mode A), 1–5 = loop passes (Node 2 Mode B)
  // Node 3 stops looping when iteration >= 5 regardless of remaining issues
  iteration: Annotation({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  // ── Compliance Score ──────────────────────────────────────────────────────
  compliance_score: Annotation({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // ── Final output ─────────────────────────────────────────────────────────────
  latex_download_url: Annotation({
    reducer: (_, b) => b,
    default: () => null,
  }),
});