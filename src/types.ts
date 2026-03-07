export enum AppStep {
  INPUT = 0,
  MATRIX = 1,
  SPECS = 2,
  EXAM = 3,
}

export interface Lesson {
  id: string;
  name: string;
  periods: number;
  weekStart?: number;
  weekEnd?: number;
}

export interface Chapter {
  id: string;
  name: string;
  totalPeriods: number;
  lessons: Lesson[];
}

export interface LevelConfig {
  biet: number;
  hieu: number;
  van_dung: number;
}

export interface QuestionConfig {
  type1: LevelConfig;
  type2: { 
    count: number; 
    counts: LevelConfig; // Number of items (ý) per level
  };
  type3: LevelConfig;
  essay: LevelConfig;
}

export interface InputData {
  educationLevel: string; // 'TieuHoc' | 'THCS' | 'THPT'
  subject: string;
  grade: string;
  duration: number;
  examType: string;
  model: string; // Selected Gemini model
  topics: string;
  additionalNotes: string;
  chapters: Chapter[];
  ratioMode: 'auto' | 'manual';
  knowledgeRatio: string; // e.g., "4-3-3", "5-3-2"
  questionConfig: QuestionConfig;
}

export interface GenerationState {
  matrix: string;
  specs: string;
  exam: string;
  isLoading: boolean;
  error: string | null;
}
