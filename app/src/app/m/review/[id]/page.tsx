"use client";
import { useParams } from "next/navigation";
import { ReviewScreen } from "@/features/mobile/Review";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ReviewScreen key={id} id={id} />;
}
