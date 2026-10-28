import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "Editorial console",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <AdminConsole />;
}
