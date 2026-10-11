// Source content is approved; wording is selected only after semantic routing.
// Numeric literals and links must match; contextual meaning is checked by the
// semantic routing instructions and the final outbound safety gate.
export function preservesKnowledgeLiterals(draft, source) {
  const literals = text => {
    const value = String(text || "");
    return JSON.stringify({
      links: [...new Set(value.match(/https?:\/\/[^\s<>]+/g) || [])].sort(),
      numbers: [...new Set(value.replace(/https?:\/\/[^\s<>]+/g, "").match(/\d+(?:[.,]\d+)*/g) || [])].sort(),
    });
  };
  return literals(draft) === literals(source);
}
