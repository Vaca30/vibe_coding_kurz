import { contentPolicyDecision, db } from '@imagineer/db';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function PolicyDecisionsPage() {
  const rows = await db
    .select()
    .from(contentPolicyDecision)
    .orderBy(desc(contentPolicyDecision.createdAt))
    .limit(50);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h2 className="text-2xl font-semibold">Content-policy decisions</h2>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">No refusals yet.</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-foreground/60">
            <tr>
              <th className="py-2">When</th>
              <th>Stage</th>
              <th>Rule</th>
              <th>Customer message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="py-3">{r.createdAt.toLocaleString()}</td>
                <td>{r.stage}</td>
                <td><code>{r.ruleId}</code></td>
                <td>{r.customerMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
