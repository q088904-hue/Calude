// Shared Web Speech API types and factory.
//
// TypeScript's lib.dom.d.ts does not include SpeechRecognition / webkitSpeechRecognition,
// so we define minimal interfaces here and export a getSRClass() helper that safely
// resolves the constructor from window at runtime.
//
// Usage:
//   import { getSRClass } from "@/lib/stagecraft/speechRecognition";
//   import type { SREvent, SRInstance } from "@/lib/stagecraft/speechRecognition";

export interface SREvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SRInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SREvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/** Returns the SpeechRecognition constructor, or null if unavailable. */
export function getSRClass(): (new () => SRInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  return (W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null) as
    | (new () => SRInstance)
    | null;
}
