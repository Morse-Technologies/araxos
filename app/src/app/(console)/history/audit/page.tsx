import type { Metadata } from "next";
import { AuditLog } from "@/features/history/History";

export const metadata: Metadata = { title: "Auditoría" };
export default function AuditPage() { return <AuditLog />; }
