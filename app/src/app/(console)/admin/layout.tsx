import type { Metadata } from "next";
import { AdminHeader } from "@/features/admin/Admin";

export const metadata: Metadata = { title: "Administración" };
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <><AdminHeader />{children}</>;
}
