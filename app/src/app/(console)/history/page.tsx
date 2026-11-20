import type { Metadata } from "next";
import { ClosedNotes } from "@/features/history/History";

export const metadata: Metadata = { title: "Historial" };
export default function HistoryPage() { return <ClosedNotes />; }
