export function buildCriticPrompt({ document_latex, parsed_guidelines_content, applied_fixes }) {
  return [
    {
      role: "system",
      content: `You are the final validator before a research manuscript is submitted to an academic journal.
Your job is to determine which issues genuinely remain after the fix pass, and which are resolved or unresolvable.

YOU HAVE TWO CATASTROPHIC FAILURE MODES — AVOID BOTH:

FAILURE MODE 1 — FALSE NEGATIVE (under-reporting):
You say is_compliant: true when real fixable issues remain.
Result: broken manuscript ships to the user.

FAILURE MODE 2 — FALSE POSITIVE (over-reporting):
You report issues that are already resolved, or issues that cannot be auto-fixed.
Result: the pipeline loops infinitely, consuming API quota, never producing output.

FAILURE MODE 2 IS MORE DANGEROUS IN PRACTICE. The pipeline has a 5-iteration cap.
False positives waste those iterations and may exhaust them before real issues are fixed.

═══════════════════════════════════════════════════════════
PERMANENTLY RESOLVED — NEVER REPORT THESE AS REMAINING ISSUES
═══════════════════════════════════════════════════════════

1. \\doi{UNKNOWN} is NOT a missing DOI. It is the correct sentinel for an unknown DOI.
   If a \\bibitem contains \\doi{UNKNOWN}, the missing_doi issue for that reference IS RESOLVED.
   Do NOT report \\doi{UNKNOWN} as a remaining issue. Ever.

2. Orphaned references (\\bibitem with no \\cite{}) — the pipeline cannot auto-fix these.
   If you flagged this in a previous pass and it still exists, do NOT re-report it.
   It is unfixable by this system. Mark as resolved for pipeline purposes.

3. Font or spacing issues when no formatting_metadata was provided —
   these cannot be confirmed without metadata. Do not re-report them.

4. Any issue where the correct fix value cannot be determined from the document text alone
   (e.g., a real DOI number, a missing author that cannot be inferred) — unfixable, do not loop on it.

═══════════════════════════════════════════════════════════
WHAT YOU SHOULD REPORT AS REMAINING ISSUES
═══════════════════════════════════════════════════════════

Report an issue as remaining ONLY when ALL of these are true:
a) The issue is visible and confirmable in the current document_latex text above.
b) The issue was NOT introduced by a recent fix (regressions go in a separate check).
c) A mechanical string-replacement CAN fix it — the fix does not require external data.
d) The issue is NOT in the "permanently resolved" list above.

If an issue meets criteria a and b but NOT c — it is unfixable. Do not report it as remaining.
Note it in the description as "unfixable — requires human resolution" and exclude it from remaining_issues.

═══════════════════════════════════════════════════════════
STABILITY RULE — PREVENTS INFINITE LOOPS
═══════════════════════════════════════════════════════════
If you are seeing the same issues reported across multiple consecutive passes
(you can infer this from the applied_fixes list — fixes were applied but the same issue persists),
the issue is likely unfixable by the pipeline. Report is_compliant: true and stop.
Do not loop more than twice on the same unfixed issue type.`,
    },
    {
      role: "user",
      content: `
## CURRENT PATCHED LATEX DOCUMENT (validate this exact text)
\`\`\`latex
${document_latex}
\`\`\`

${parsed_guidelines_content
  ? `## JOURNAL GUIDELINES (compliance benchmark)
${parsed_guidelines_content}`
  : `## JOURNAL GUIDELINES: Not provided — validate against the citation style present in the document.`
}

## FIXES APPLIED IN THIS PASS (do not re-report these as issues unless the fix introduced a regression)
${applied_fixes.length > 0
  ? applied_fixes.map((f) => `- [${f.issue_ref}] ${f.description}`).join("\n")
  : "- No fixes were applied in this pass."}

---

## VALIDATION PROTOCOL

Execute every check below in order. Do not skip any check.
After all checks, apply the decision rule at the bottom.

---

### CHECK 1 — CITATION ↔ REFERENCE INTEGRITY

Extract the complete set of cite keys used in \\cite{} commands throughout the document body.
Extract the complete set of bibitem keys defined in \\bibitem{} commands.

These two key sets must be identical for the document to be compliant.

Report as unmatched_citation ONLY when:
- A \\cite{key} exists but the exact key is NOT present in any \\bibitem{} — one entry per missing bibitem key.
- A \\bibitem{key} exists but the exact key is NOT used in any \\cite{} — flag only if this is a NEW orphan
  not caused by a fix that correctly removed a \\cite{} in this pass.

DO NOT report:
- \\cite{} in commented-out lines (% prefix).
- \\bibitem{} in commented-out lines.
- Any pair that was correctly matched in this pass via an applied fix.

### CHECK 2 — DOI FIELD VALIDATION

For each \\bibitem that is a journal article or conference paper, check the DOI field.

ACCEPTABLE states (do NOT flag any of these):
- Has \\doi{10.XXXX/...} — valid DOI, compliant.
- Has \\doi{UNKNOWN} — correctly marked unknown, compliant. THIS IS RESOLVED. DO NOT FLAG.
- Reference type is book, book chapter, thesis, or other non-journal — DOI optional, do not flag.

REPORT as missing_doi ONLY when:
- The reference is a journal article AND has NO \\doi{} field whatsoever (neither UNKNOWN nor a real DOI).

Count the total number of unfixed missing_doi references and report them as ONE grouped issue,
not as one issue per reference.

### CHECK 3 — REFERENCE LIST ORDER

Numbered styles: are \\bibitem entries in sequential order with no gaps or repeats?
If the entire list was replaced in this pass by an applied fix, assume it is correct unless
you can see a visible numbering error.

Author-date styles: are entries alphabetically ordered by first author surname?
Same-author entries ordered by year? Same-author same-year entries suffixed a, b, c?

Report as broken_ref_numbering only if you can point to a specific out-of-order pair.
"It might be wrong" is not sufficient — you must see the actual misordering.

### CHECK 4 — AUTHOR FORMAT

Check the author field of each \\bibitem against the document's citation style.

APA 7th — compliant format: "Surname, F. M., \\& Surname, F. M."
Non-compliant: "and" between authors, wrong name order, no comma after surname, missing initials period.

Vancouver — compliant: "Surname FM, Surname FM."
Non-compliant: periods after initials, full first names, "and" connector.

If all \\bibitem entries have consistent correct author format, do NOT report anything.
If you already applied fixes to author format in this pass, assume they are correct unless
you can see a specific remaining malformatted entry — state which \\bibitem key.

### CHECK 5 — HEADING HIERARCHY

Map all heading commands to their levels.
Flag only confirmed skips: \\section directly followed (without any \\subsection) by \\subsubsection.
Do not flag single-level documents, or documents where a subsection appears before the subsubsection
(that is valid structure).

### CHECK 6 — ABSTRACT FORMAT

Check: does a \\begin{abstract}...\\end{abstract} block exist?
Check: is the abstract a single paragraph (no blank lines inside the environment)?
Check word count only if you can clearly count it from the text (rough estimate, do not spend precision here).
Check: does a Keywords line exist immediately after \\end{abstract}?

Report only what you can confirm is wrong. "May be missing" is not a finding.

### CHECK 7 — FIGURE AND TABLE LABEL CONSISTENCY

Find all "Figure N" and "Fig. N" references in the document.
Find all "Table N" and "Tbl. N" references in the document.

If BOTH short and long form appear → remaining issue.
If only ONE form appear → compliant. Do not flag.

If an applied fix changed some labels in this pass, check whether any minority-form labels still remain.

### CHECK 8 — FIX REGRESSION CHECK

For each fix in the "Fixes Applied" list above, verify the fix did not introduce a new problem.

Signs of a bad fix:
- A \\bibitem key changed → breaks all \\cite{} pointing to it.
- A line was deleted that contained other content.
- A \\begin{} was added without a matching \\end{}.
- An author name was changed to a different author's name.

If you detect a regression, report it as a new issue with description:
"Regression from [issue_ref]: [describe what broke]"

### CHECK 9 — STRUCTURAL COMPLETENESS

Verify these elements exist somewhere in the document:
- \\title{} or equivalent (non-empty)
- \\author{} or equivalent
- \\begin{abstract} environment
- At least one \\section{} for body content
- \\begin{thebibliography} with at least one \\bibitem

Report as the appropriate issue type only if one of these is genuinely absent.
Do not report if the element exists but is formatted differently than you expected —
formatting is a separate check from existence.

### CHECK 10 — INLINE FORMATTING AND MATH COMPLIANCE
Verify that:
- Greek letters are in math mode ($\\alpha$ not \\textalpha)
- Subscripts/superscripts in non-math use \\textsubscript{} or \\textsuperscript{} appropriately, OR are in math mode if variables/units.
- Special characters (&, %, $, #, _) are escaped.
- \\affil{} is NOT used (must be replaced with \\begin{center}...\\end{center})
If any violation exists, report as a formatting issue.

---

## DECISION RULE

After completing all nine checks, apply this logic:

Step 1: Build remaining_issues from all confirmed findings above.

Step 2: Remove from remaining_issues any finding that is:
  - In the "permanently resolved" list from the system prompt
  - Not fixable by mechanical string replacement
  - The same issue that appeared in the previous pass and was not fixed (stability rule)

Step 3:
  If remaining_issues is empty after Step 2 → set is_compliant: true
  If remaining_issues has entries → set is_compliant: false

DO NOT set is_compliant: false out of caution.
DO NOT set is_compliant: false for issues you "think might exist" but cannot confirm from the text.
DO NOT set is_compliant: false for issues that are in the permanently-resolved list.

is_compliant: true means: no further automated fixes are possible or needed.
This is the correct exit state even if \\doi{UNKNOWN} entries remain —
those require human resolution and are outside the pipeline's scope.

---

## REQUIRED FORMAT FOR EACH REMAINING ISSUE ENTRY

Every issue in remaining_issues MUST have:
- id: unique string (e.g., "remaining_001")
- type: one of the valid enum values
- description: specific, actionable, names the exact \\bibitem key or \\cite key or line content
- location: the exact LaTeX anchor (e.g., "\\bibitem{chen2019}", "\\cite{zhao2024}", "\\section{Methods}")

INVALID descriptions (do not use these):
- "Author formatting may need review"
- "Some references might be missing DOIs"
- "The abstract could be improved"

VALID descriptions:
- "\\bibitem{chen2019} is a journal article with no \\doi{} field. Requires \\doi{UNKNOWN} insertion."
- "\\cite{zhao2024} in paragraph 3 of the Introduction has no matching \\bibitem{zhao2024} in the bibliography."
- "\\subsubsection{Data Collection} appears directly under \\section{Methods} with no \\subsection between them."
`,
    },
  ];
}
