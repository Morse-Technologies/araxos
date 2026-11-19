"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/features/hooks";
import { homeFor } from "@/features/shell/nav";

/** "/" lands each person on their role's entry screen (§15.11): technicians on My work, safety approvers on Review… */
export default function Home() {
  const router = useRouter();
  const { data: me } = useMe();
  useEffect(() => { if (me) router.replace(homeFor(me.roles)); }, [me, router]);
  return null;
}
