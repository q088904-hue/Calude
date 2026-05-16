// Shared types for the Stagecraft interview practice agent.

export type Round =
  | "hr"
  | "hiring-manager"
  | "portfolio"
  | "leadership"
  | "stress"
  | "mixed";

export type Difficulty = "warm-up" | "realistic" | "tough";

export type FocusMode = "grammar" | "confidence" | "brevity" | null;

export interface Profile {
  name: string;
  location: string;
  currentRole: string;
  tenure: string;
  targetRoles: string[];
  targetMarkets: string[];
  realNumbers: string[]; // immutable list — only these may appear in sample answers
  craft: string[];
  education: string[];
  starStories: StarStory[];
  voiceSamples: string[]; // 3–5 of the user's strongest answers, used as style anchors
  weakPatterns: string[]; // seeded from v2 prompt's Indian-English list
}

export interface StarStory {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
}

export interface SessionConfig {
  targetRole: string; // e.g. "Creative Director — generic"
  round: Round;
  questionCount: number;
  difficulty: Difficulty;
  focus: FocusMode;
}

export interface QAItem {
  index: number; // 1-based
  round: Round;
  question: string;
  answer: string; // transcribed
  feedback: string; // raw 5-block markdown
  scores: { content: number; english: number; delivery: number };
  patterns: string[]; // detected pattern tags, e.g. ["dropped article", "run-on"]
  audioBlobRef?: string; // optional, for replay (path or url)
  durationMs?: number;
  createdAt: string; // ISO
}

export interface SessionRecord {
  id: string;
  config: SessionConfig;
  warmUp?: { transcript: string; createdAt: string };
  items: QAItem[];
  report?: string; // generated at end
  startedAt: string;
  endedAt?: string;
}

export interface GradeRequestBody {
  sessionId: string;
  questionIndex: number;
  round: Round;
  question: string;
  answer: string;
  focus: FocusMode;
  difficulty: Difficulty;
}

export interface MemorizedAnswer {
  id: string;
  question: string;
  answer: string; // the sample answer the user wants to memorize
  sourceSessionId: string;
  sourceQuestionIndex: number;
  createdAt: string;
  // Optional spaced-repetition state (used in later phases).
  reviewCount?: number;
  lastReviewedAt?: string;
}
