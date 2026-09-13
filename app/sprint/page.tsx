"use client";

import SprintGame from "@/components/SprintGame";
import { useRouter } from "next/navigation";

export default function SprintPage() {
  const router = useRouter();

  return (
    <SprintGame
      onExit={() => router.push("/sprint")}
    />
  );
}
