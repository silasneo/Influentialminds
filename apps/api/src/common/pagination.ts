import type { PageMeta, Paginated } from "@influential-minds/contracts";

export function buildPageMeta(
  total: number,
  page: number,
  perPage: number
): PageMeta {
  const totalPages = perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1;
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number
): Paginated<T> {
  return { items, meta: buildPageMeta(total, page, perPage) };
}

export function skipTake(
  page: number,
  perPage: number
): { skip: number; take: number } {
  return { skip: (page - 1) * perPage, take: perPage };
}
