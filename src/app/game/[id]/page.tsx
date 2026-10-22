"use client";

import { use } from "react";
import GameRoom from "@/components/GameRoom";
import RequireAuth from "@/components/RequireAuth";

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <GameRoom id={id} />
    </RequireAuth>
  );
}
