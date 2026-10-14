import { preservesProtectedFacts } from "./protected-facts.mjs";

// Source content is approved; wording is selected only after semantic routing.
// Bounded factual checks supplement, rather than replace, semantic routing and
// the final outbound safety gate.
export function preservesKnowledgeLiterals(draft, source) {
  return preservesProtectedFacts(draft, source);
}
