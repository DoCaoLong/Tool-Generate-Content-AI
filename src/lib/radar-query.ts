const handlePattern = /^[A-Za-z0-9_]{1,15}$/;

export function projectXHandle(keywords: string, documents: string) {
  const keywordHandle = keywords.match(/@([A-Za-z0-9_]{1,15})/)?.[1];
  if (keywordHandle) return keywordHandle;
  return documents.match(/^X:\s*@?([A-Za-z0-9_]{1,15})\s*$/m)?.[1] || "";
}

export function buildRadarQuery(projectName: string, handle: string) {
  const name = projectName.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const terms: string[] = [];
  const seen = new Set<string>();
  const add = (term: string) => {
    const key = term.replace(/^@/, "").replace(/^"|"$/g, "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    terms.push(term);
  };
  const words = name.split(" ").filter(Boolean);
  if (words.length > 1) add(words[0]);
  if (name.includes(" ")) add(`"${name}"`);
  else if (name) add(name);
  const compact = name.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  if (compact) add(compact);
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (handlePattern.test(cleanHandle)) add(cleanHandle);
  if (!terms.length) return "";
  return `(${terms.join(" OR ")}) lang:en -filter:replies`;
}
