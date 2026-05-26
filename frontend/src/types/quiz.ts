export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;
};

export type AnswerResult = "idle" | "correct" | "wrong";
