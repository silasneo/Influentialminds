import Link from "next/link";
import type { PageMeta } from "@influential-minds/contracts";

interface PaginationProps {
  meta: PageMeta;
  /** Base path without a page param, e.g. `/episodes`. */
  basePath: string;
  params?: Record<string, string | undefined>;
}

function hrefFor(
  basePath: string,
  page: number,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", `${page}`);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ meta, basePath, params = {} }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {meta.hasPreviousPage ? (
        <Link href={hrefFor(basePath, meta.page - 1, params)}>Previous</Link>
      ) : (
        <span>Previous</span>
      )}
      <span>
        Page {meta.page} of {meta.totalPages}
      </span>
      {meta.hasNextPage ? (
        <Link href={hrefFor(basePath, meta.page + 1, params)}>Next</Link>
      ) : (
        <span>Next</span>
      )}
    </nav>
  );
}
