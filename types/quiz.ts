/**
 * Types pour les questions et réponses de quiz
 */

export type QuestionType = 'multiple_choice' | 'true_false';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: number | boolean;
  explanation?: string;
}

export interface QuizQuestionForUser {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
}

export interface QuizResult {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export interface QuizSubmissionResult {
  questionId: string;
  userAnswer: number | boolean;
  correctAnswer: number | boolean;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizSubmitResponse {
  success: boolean;
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  results: QuizSubmissionResult[];
  message: string;
  error?: string;
}

export interface QuizData {
  id: string;
  chapterId: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
  totalQuestions: number;
  moduleInfo?: {
    id: string;
    title: string;
    order: number;
  };
  chapterInfo?: {
    id: string;
    title: string;
  };
  previousAttempt?: {
    score: number;
    passed: boolean;
    attemptedAt: string;
  };
  instructions?: {
    passingScore: number;
    timeLimit: number;
    canRetry: boolean;
    totalQuestions: number;
  };
}

export interface AlreadyCompletedResponse {
  message: string;
  alreadyCompleted: true;
  result: QuizResult;
  reviewMode: boolean;
  questions: QuizQuestion[];
  chapterInfo: {
    id: string;
    title: string;
  };
  moduleInfo: {
    id: string;
    title: string;
    order: number;
  };
  passingScore: number;
  title: string;
}
