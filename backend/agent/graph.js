// graph.js
import { StateGraph, END } from "@langchain/langgraph";
import { PipelineAnnotation } from "./state.js";
import { node1Detect } from "./nodes/node1_detect.js";
import { node2Fix }    from "./nodes/node2_fix.js";
import { node3Critic } from "./nodes/node3_critic.js";

export function buildGraph(config = {}) {
  const graph = new StateGraph(PipelineAnnotation)
    .addNode("node1", node1Detect)
    .addNode("node2", node2Fix)
    .addNode("node3", node3Critic)
    .addEdge("__start__", "node1")
    .addEdge("node1", "node2")
    .addEdge("node2", "node3")
    .addConditionalEdges("node3", (s) => s.is_loop ? "node2" : END, {
      node2: "node2",
      [END]: END,
    });

  return graph.compile(config);
}
