export type ReviewBundle = {
  generatedAt: string;
  droppedOrSkippedRowsApprox: number;
  numericLegend: Record<string, string>;
  courses: Course[];
};

export type TextBlock = { label: string; value: string };

export type Review = {
  source: "bsw" | "hss";
  courseCode: string;
  professor: string;
  professorKey: string;
  timestamp: string | null;
  labels: Record<string, number>;
  textBlocks: TextBlock[];
};

export type ProfessorAgg = {
  professorKey: string;
  professor: string;
  n: number;
  averages: Record<string, number>;
  snippet: string;
};

export type Course = {
  code: string;
  title: string;
  credits: number;
  slot: string;
  currentInstructor: string;
  reviewCount: number;
  overall: {
    n: number;
    averages: Record<string, number>;
    snippet: string;
  };
  byProfessor: ProfessorAgg[];
  reviews: Review[];
};
