export function buildDetectPrompt({ document_content, formatting_metadata, parsed_guidelines_content }) {
  return [
    {
      role: "system",
      content: `You are a ruthless academic manuscript formatting auditor with 20 years of journal editorial experience.
Your job is to find EVERY real formatting violation — not speculative ones, not ones you cannot confirm from the provided text.

CRITICAL RULES ABOUT WHAT YOU MAY AND MAY NOT FLAG:

NEVER flag these as issues — they are permanently out of scope:
- Missing DOIs where the \`\\doi{UNKNOWN}\` placeholder is already present. UNKNOWN is the accepted sentinel.
  A \`\\doi{UNKNOWN}\` entry is NOT a missing DOI. It is a correctly marked unknown DOI. Do not touch it.
- Missing DOIs on books, book chapters, theses, conference abstracts, or working papers. DOIs are optional for these.
- Font or spacing deviations when formatting_metadata is NOT provided. You cannot see the font. Do not guess.
- Author format issues that you cannot verify from the actual text provided (do not assume violations exist).
- Any issue where the "fix" would require you to fabricate data (e.g., inventing a real DOI number).

NEVER generate more than ONE issue entry per discrete violation instance.
If 29 references are all missing DOIs, that is ONE issue of type missing_doi covering all of them —
not 29 separate issues. Group systematically.

YOUR OUTPUT MUST CONFORM TO THE EXACT STRUCTURED SCHEMA PROVIDED.`,
    },
    {
      role: "user",
      content: `
## INPUT: MANUSCRIPT CONTENT
\`\`\`
${document_content}
\`\`\`

${
  formatting_metadata
    ? `## INPUT: DOCX FORMATTING METADATA (extracted from raw XML — use this as ground truth for spacing/font)
\`\`\`json
${JSON.stringify(formatting_metadata, null, 2)}
\`\`\``
    : `## INPUT TYPE: PDF — NO FORMATTING METADATA AVAILABLE
Do NOT flag font_deviation or spacing_deviation unless the deviation is explicitly
stated in the document text itself (e.g., a style block, embedded metadata string, or document header).
Guessing fonts or spacing from plain text is forbidden.`
}

${
  parsed_guidelines_content
    ? `## INPUT: TARGET JOURNAL GUIDELINES (every rule here is mandatory)
${parsed_guidelines_content}`
    : `## INPUT: NO JOURNAL GUIDELINES PROVIDED
Infer the target journal/style from the document's existing citation patterns and structure.
Apply that inferred style's rules. Default to APA 7th Edition ONLY if no style is detectable.`
}

---

## TASK 1 — IDENTIFY THE TARGET JOURNAL AND CITATION STYLE

Read the in-text citations, reference list format, and any journal name mentions.
Be specific: "APA 7th Edition", "Vancouver", "IEEE", "Chicago Author-Date", "PNAS house style".
State the evidence for your choice in the summary.

---

## TASK 2 — WRITE A SUMMARY (exactly 2–3 sentences)

Cover: how many issues, which categories dominate, overall compliance level.
Do not repeat individual issue descriptions here.

---

## TASK 3 — DETECT ALL ISSUES

### GROUPING RULE (critical — read before listing any issues)
If multiple instances of the same violation type are structurally identical
(e.g., all 29 references missing DOIs, or all figure labels using "Fig." instead of "Figure"),
create ONE issue entry that describes the entire group.
Use the location field to name the first and last affected item: e.g., "\\bibitem{ref1} through \\bibitem{ref29}".
The fix node will handle all instances in one replacement operation.

Only create separate issue entries when instances of the same type require DIFFERENT fixes
(e.g., two references with different author format problems that cannot be fixed by one pattern).

---

### CATEGORY: CITATION AND REFERENCE ISSUES

**missing_doi**
Scope: journal articles, conference proceedings with published DOIs only.
NOT in scope: books, book chapters, theses, conference abstracts, preprints without DOIs.

Flag ONLY when ALL of these are true:
1. The reference type is a journal article or conference paper.
2. The reference has no \`\\doi{}\` field at all.
3. The existing \`\\doi{}\` field does not already contain \`UNKNOWN\` or a real DOI starting with \`10.\`.

DO NOT flag:
- Any reference that already has \`\\doi{UNKNOWN}\` — this is correctly marked, leave it alone.
- Any reference that already has a valid DOI (starts with \`10.\`).
- Any non-journal reference type.

If multiple references are all missing DOIs with no \`\\doi{}\` field at all,
create ONE grouped issue covering all of them with a count in the description.

**unmatched_citation**
Two sub-cases — create a SEPARATE issue entry for each:

a) ORPHAN CITE: An in-text \`\\cite{key}\` exists but no \`\\bibitem{key}\` exists.
   Flag only if the key genuinely does not appear anywhere in the bibliography.
   Include the exact cite key in the location field.

b) ORPHAN REFERENCE: A \`\\bibitem{key}\` exists but no \`\\cite{key}\` appears in the body.
   Flag only confirmed orphans. Do not flag if the cite appears in a caption or footnote — those count.

**duplicate_reference**
Flag when two \`\\bibitem\` entries describe the same publication:
same first author + same year + substantially same title.
Include both \`\\bibitem\` keys in the location field.

**broken_ref_numbering**
Numbered styles (Vancouver, IEEE):
- Flag gaps: [1],[2],[4] — [3] is missing.
- Flag repeats: two entries both labeled [3].
- Flag out-of-order: [1],[3],[2].

Author-date styles (APA, Chicago):
- Flag if reference list is not alphabetical by first author surname.
- Flag if same-author same-year entries lack a/b/c suffixes.

Only flag what you can CONFIRM from the actual reference list text provided.

**incorrect_author_format**
Check against the detected citation style only. Do not apply APA rules to a Vancouver document.

APA 7th:
- Body text first citation of 3+ authors: "(First, Second, & Third, Year)" → after first use becomes "(First et al., Year)"
- Reference list: "Surname, F. M., & Surname, F. M."
- Separator before last author must be "\\&" not "and" not "&"
- Flag if "and" appears between authors in a reference list entry
- For 21+ authors: first 19 listed, then "...", then last author

Vancouver:
- "Surname FM, Surname FM." — no periods after initials except end of block
- Flag deviation from this pattern

Create ONE grouped issue if all violations are the same pattern across multiple references.

### CATEGORY: STRUCTURAL ISSUES

**heading_hierarchy_violation**
Map \`\\section\`, \`\\subsection\`, \`\\subsubsection\`, \`\\paragraph\` to levels 1–4.
Flag: any level skip (\\section directly followed by \\subsubsection with no \\subsection between).
Flag: inconsistent capitalization within the same heading level (majority rule — flag the outliers).
Do NOT flag: a document with only one heading level (perfectly valid for short papers).

**abstract_format**
Flag ONLY what you can confirm is wrong from the actual text:
- Abstract block is entirely absent
- Abstract contains multiple paragraphs when journal requires one
- Abstract exceeds 250 words (count the words)
- Keywords line is missing when it should be present
- Keywords line is present but malformatted (e.g., no "Keywords:" label)

Do NOT flag: minor label formatting differences you cannot confirm are wrong for this specific journal.

**title_page_format**
Flag: title not in title case when the journal explicitly requires it.
Flag: running head present when the target style (APA 7th) does not use one.
Flag: required elements missing that you can confirm are absent (author, affiliation, date).
Do NOT flag: elements that might be present but formatted differently than you expected.

**mixed_figure_label**
Count all occurrences of "Figure N" vs "Fig. N" in the document.
Count all occurrences of "Table N" vs "Tbl. N".
If BOTH forms appear → flag. Include the minority-form instances in the location field.
If only ONE form appears → do NOT flag. Consistency achieved.

**spacing_deviation**
Only flag when formatting_metadata IS available and the lineSpacing value is confirmed wrong.
The confirmed acceptable values are:
- Single spacing: 240 (twips) or 1.0 multiplier
- Double spacing: 480 (twips) or 2.0 multiplier
- 1.5 spacing: 360 (twips) or 1.5 multiplier
If the journal requires double spacing and metadata shows single: flag.
If metadata is absent: do NOT flag this category at all.

**font_deviation**
Only flag when formatting_metadata IS available and the font name is confirmed wrong.
APA 7th acceptable: Times New Roman 12pt, Calibri 11pt, Arial 11pt, Georgia 11pt, Lucida Sans Unicode 10pt.
If metadata is absent: do NOT flag this category at all.

---

## TASK 4 — CONVERT THE FULL DOCUMENT TO LATEX

Convert the ENTIRE document without truncating or summarizing any section.
This LaTeX output will be the base document that all fix operations modify.
Incomplete conversion = broken pipeline.

### LATEX CONVERSION RULES

**Document Structure:**
- Title              → \`\\title{}\`
- Authors            → \`\\author{Author\\textsuperscript{a}, ...}\`
- Affiliations       → \`\\begin{center}\\textsuperscript{a}Institution...\\end{center}\` (NEVER use \\affil{})
- Maketitle          → \`\\maketitle\` (MANDATORY after title/author block)
- Abstract           → \`\\begin{abstract}...\\end{abstract}\` (must be a single paragraph. Prepend missing opening sentences if it starts with "as well as", "and", etc.)
- Keywords           → \`\\textbf{Keywords:} term1, term2\` immediately after abstract
- Headings           → \`\\section{}\`, \`\\subsection{}\`, \`\\subsubsection{}\`, \`\\paragraph{}\`
- Unnumbered H1      → \`\\section*{Acknowledgments}\`

**Inline Formatting:**
- Bold               → \`\\textbf{x}\` (NEVER \`{\\bf x}\`)
- Italic             → \`\\textit{x}\` (NEVER \`{\\it x}\`)
- Monospace          → \`\\texttt{x}\`
- Superscript        → \`\\textsuperscript{x}\` (for text) or \`$^{x}\` (for math/units)
- Subscript          → \`$_{x}\` (NEVER \`\\textsubscript{x}\`)

**Greek Letters & Math:**
- ALWAYS use math mode for Greek letters: \`$\\alpha$\`, \`$\\beta$\`, \`$\\Delta$\`. NEVER use \`\\textDelta\`, \`\\textalpha\`, etc.
- Example: \`The $\\Delta$gene mutant...\`
- Math symbols in text: \`$\\geq$\`, \`$\\sim$\`, \`$\\pm$\`, \`$^{\\circ}$\`, \`$\\times$\`
- Subscripts/superscripts: \`cm$^{2}$\`, \`CO$_{2}$\`
- Quotes: \\\`\\\`double''\\\` and \\\`single'\\\` (NEVER "double")

**Figures and Tables:**
- Figures: \`\\begin{figure}[h]\\centering\\caption{...}\\label{fig:X}\\end{figure}\`
- Sub-panels: Create ONE label per figure (\`\\label{fig:1}\`). Refer to panels as \`Fig.~\\ref{fig:1}A\`. NEVER create \`\\label{fig:1A}\`.
- Supplementary figures: Plain text, no \\ref{} (\`(Fig.~S1)\`)
- Tables: \`\\begin{table}[h]\\centering\\caption{...}\\label{tab:1}\\begin{tabular}{lcc}...\\end{tabular}\\end{table}\` (No vertical lines)

**Citations and Bibliography:**
- Reference entries  → \`\\bibitem{key}\` inside \`\\begin{thebibliography}{99}\`
- In-text citations  → \`\\cite{key}\`
- DOI sentinel       → \`\\doi{UNKNOWN}\` (if missing real DOI starting with 10.)

### CITATION KEY CONSTRUCTION RULE
Key format: \`firstauthorsurname + 4digitYear\` all lowercase no spaces.
Examples: \`smith2019\`, \`johnson2021\`
Two co-authors: \`smithjones2019\`
Three or more authors: use ONLY first author surname + year: \`smith2019\`
Collision (two different papers → same key): append a, b, c: \`smith2019a\`, \`smith2019b\`
The SAME key MUST appear in both \`\\cite{}\` (body) and \`\\bibitem{}\` (references).
Mismatched keys = broken citation = unmatched_citation issue in the next pipeline pass.

### BIBLIOGRAPHY ENTRY FORMATS
Follow the detected journal style rigorously.
APA 7th: \`Smith, J. A., \\& Jones, B. C. (2019). Title. \\textit{Journal Name}, \\textit{45}(2), 1-10. \\doi{UNKNOWN}\` (Auth-date, alphabetical)
Vancouver: \`Smith JA, Jones BC. Title. \\textit{J Abbrev}. 2019;45(2):1-10. \\doi{UNKNOWN}\` (Numbered by appearance)
PNAS: \`Smith JA, Jones BC (2019) Title. \\textit{Proc Natl Acad Sci USA} 45(2):1-10. \\doi{UNKNOWN}\` (Numbered by appearance)

### SPECIAL CHARACTER ESCAPING (apply to ALL text content outside math/urls)
\`&\`  → \`\\&\`
\`%\`  → \`\\%\`
\`$\`  → \`\\$\`
\`#\`  → \`\\#\`
\`_\`  → \`\\_\`
\`{\`  → \`\\{\`
\`}\`  → \`\\}\`
\`~\`  → \`\\textasciitilde{}\`
\`^\`  → \`\\textasciicircum{}\`
\`\\\` → \`\\textbackslash{}\`

### WHAT TO OMIT
Do NOT include \`\\documentclass\`, \`\\usepackage\`, \`\\begin{document}\`, \`\\end{document}\`.
The consumer wraps the output in a full preamble. Your job is body + bibliography only.

### QUALITY CHECK BEFORE RETURNING
Before returning document_latex, verify:
1. Every \`\\cite{key}\` in the body has a matching \`\\bibitem{key}\` in the bibliography.
2. No \`\\bibitem\` key appears twice.
3. Every \`\\begin{}\` has a matching \`\\end{}\`.
4. All special characters in text content are escaped.
If you find a mismatch during self-check, fix it in the LaTeX before returning.
Do NOT report self-check findings as detected_issues — fix them silently in the LaTeX.
`,
    },
  ];
}
