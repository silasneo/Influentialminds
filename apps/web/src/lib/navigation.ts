export interface NavLink {
  href: string;
  label: string;
}

/**
 * Lives outside the header because the footer renders on the server. A server
 * component importing a value from a `"use client"` module receives a client
 * reference rather than the value itself, which fails only at request time.
 */
export const PRIMARY_NAV: NavLink[] = [
  { href: "/episodes", label: "Conversations" },
  { href: "/topics", label: "Ideas" },
  { href: "/guests", label: "People" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "About" },
];
