"use client";
import { useParams } from "next/navigation";
import { NoteDetail } from "@/features/queue/NoteDetail";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  return <NoteDetail key={id} id={id} />;
}
