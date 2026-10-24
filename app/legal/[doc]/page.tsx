import { notFound } from "next/navigation";
import { LEGAL_DEFAULTS, legalDocs, type LegalDocs } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL_DEFAULTS).map((doc) => ({ doc }));
}

// Text comes from the compliance agent's live version (falls back to the starting text).
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const key = (await params).doc as keyof LegalDocs;
  const { docs, updatedAt } = await legalDocs();
  const doc = docs[key];
  if (!doc) notFound();
  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })
    : "Oct 24, 2026";
  return (
    <main className="wrap grid12 gap-y-6 pt-12">
      <div className="col-span-12 md:col-span-4">
        <div className="label">Legal · updated {updated}</div>
        <h1 className="display mt-3 text-5xl">{doc.title}</h1>
      </div>
      <ol className="col-span-12 md:col-span-7 md:col-start-6 border-t-[3px] border-ink">
        {doc.body.map((p, i) => (
          <li key={p} className="grid grid-cols-[2.5rem_1fr] border-b border-hair py-4 text-ink-2">
            <span className="font-mono text-sm text-red">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-ink">{p}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
