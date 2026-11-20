"use client";
import { useParams } from "next/navigation";
import { DiffView } from "@/features/queue/DiffView";

export default function DiffPage() {
  const { id } = useParams<{ id: string }>();
  return <DiffView id={id} />;
}
