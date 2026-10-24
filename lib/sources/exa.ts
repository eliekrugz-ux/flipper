import Exa from "exa-js";

// Exa: web search built for agents. Used by Scout to spot in-demand gear and by Marketer to find communities.
export function exa(): Exa | null {
  return process.env.EXA_API_KEY ? new Exa(process.env.EXA_API_KEY) : null;
}

export interface ExaHit {
  url: string;
  title?: string | null;
  highlights?: string[];
}

export async function search(
  query: string,
  opts: { numResults?: number; includeDomains?: string[]; startPublishedDate?: string } = {},
): Promise<ExaHit[]> {
  const client = exa();
  if (!client) return [];
  const res = await client.search(query, {
    type: "auto",
    numResults: opts.numResults ?? 10,
    includeDomains: opts.includeDomains,
    startPublishedDate: opts.startPublishedDate,
    contents: { highlights: true },
  });
  return res.results.map((r) => ({
    url: r.url,
    title: (r as { title?: string | null }).title,
    highlights: (r as { highlights?: string[] }).highlights,
  }));
}
