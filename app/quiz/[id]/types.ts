// Types pour les quiz
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[]; // Pour multiple_choice uniquement
}

export interface Quiz {
  id: string;
  chapterId: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number;
  totalQuestions: number;
  moduleInfo: {
    id: string;
    title: string;
    order: number;
  };
  chapterInfo: {
    id: string;
    title: string;
  };
  previousAttempt?: {
    score: number;
    passed: boolean;
    attemptedAt: string;
  } | null;
  instructions: {
    passingScore: number;
    timeLimit: number;
    canRetry: boolean;
    totalQuestions: number;
  };
}

export interface QuizResult {
  score: number;
  passed: boolean;
  completedAt: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options?: string[];
  correctAnswer: number | boolean;
}

export interface AlreadyCompletedResponse {
  message: string;  // API retourne "message", pas "error"
  alreadyCompleted: true;
  result: QuizResult;
  reviewMode?: boolean;
  questions?: ReviewQuestion[];
  chapterInfo?: {
    id: string;
    title: string;
  };
  moduleInfo?: {
    id: string;
    title: string;
    order: number;
  };
  passingScore?: number;
  title?: string;
}

export interface QuizSubmitResponse {
  success: boolean;
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  results: Array<{
    questionId: string;
    userAnswer: number | boolean;
    correctAnswer: number | boolean;
    isCorrect: boolean;
    explanation?: string;
  }>;
  message?: string;
  error?: string;
}
