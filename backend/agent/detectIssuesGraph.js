// detectIssuesGraph.js
// Lightweight single-node graph for live editor "Detect Issues" feature.
// No persistence, no fix/critic loop — just detection.

import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { nodeDetectIssues } from "./nodes/node_detect_issues.js";

// ── Minimal state — no persistence needed ────────────────────────────────────
export const DetectIssuesAnnotation = Annotation.Root({
  // Inputs
  latex_content: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),
  guidelines_text: Annotation({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // Outputs
  target_journal: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),
  detected_issues: Annotation({
    reducer: (_, b) => b,
    default: () => [],
  }),
  summary: Annotation({
    reducer: (_, b) => b,
    default: () => "",
  }),
});

export function buildDetectIssuesGraph() {
  const graph = new StateGraph(DetectIssuesAnnotation)
    .addNode("detect", nodeDetectIssues)
    .addEdge("__start__", "detect")
    .addEdge("detect", END);

  return graph.compile();
}
