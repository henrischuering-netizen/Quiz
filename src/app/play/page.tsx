"use client";

import dynamic from "next/dynamic";

// Nur im Browser rendern: der Spielstand wird aus localStorage geladen.
const GameApp = dynamic(() => import("@/components/GameApp"), { ssr: false });

export default function PlayPage() {
  return <GameApp />;
}
