import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="page-header">
        <h1>
          Not in the <em>archive</em>
        </h1>
        <p>
          That page does not exist, or the conversation has not been published
          yet.
        </p>
      </div>
      <div className="page-body">
        <div className="empty-state">
          <h2>Where to next</h2>
          <p>
            Browse every published conversation, or ask the archive a question
            and let it find the passage for you.
          </p>
          <Link href="/episodes" className="button button--cobalt">
            Browse conversations
          </Link>
          <p style={{ marginTop: 24 }}>
            <Link href="/ask" className="text-link">
              Ask the archive
            </Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
