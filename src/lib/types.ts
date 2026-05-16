export interface AnalysisScore {
  category: string;
  score: number;
  maxScore: number;
}

export interface InsightData {
  id: string;
  title: string;
  icon: string;
  content: string;
  type: 'analysis' | 'strength' | 'improvement' | 'opportunity';
}

export interface AnalysisResult {
  overallScore: number;
  verdict: 'Excellent' | 'Strong' | 'Good' | 'Needs Work' | 'Weak';
  verdictSummary: string;
  scores: AnalysisScore[];
  insights: InsightData[];
}

export type AppState = 'landing' | 'upload' | 'preview' | 'analyzing' | 'results';
