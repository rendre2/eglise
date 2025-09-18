import { Quiz, QuizSubmitResponse, QuizResult, ReviewQuestion } from './types';

// Définition des types d'état et d'action
export interface QuizState {
  quiz: Quiz | null;
  currentQuestion: number;
  answers: Record<string, number | boolean>;
  showResults: boolean;
  quizResult: QuizSubmitResponse | null;
  timeLeft: number;
  quizStarted: boolean;
  isSubmitting: boolean;
  loading: boolean;
  alreadyCompleted: QuizResult | null;
  reviewMode: boolean;
  reviewQuestions: ReviewQuestion[];
  showSuccessModal: boolean;
  showFailureModal: boolean;
  redirecting: boolean;
}

export type QuizAction =
  | { type: 'SET_QUIZ'; payload: Quiz }
  | { type: 'SET_CURRENT_QUESTION'; payload: number }
  | { type: 'SET_ANSWER'; payload: { questionId: string; value: number | boolean } }
  | { type: 'SET_SHOW_RESULTS'; payload: boolean }
  | { type: 'SET_QUIZ_RESULT'; payload: QuizSubmitResponse }
  | { type: 'SET_TIME_LEFT'; payload: number }
  | { type: 'SET_QUIZ_STARTED'; payload: boolean }
  | { type: 'SET_IS_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ALREADY_COMPLETED'; payload: QuizResult | null }
  | { type: 'SET_REVIEW_MODE'; payload: boolean }
  | { type: 'SET_REVIEW_QUESTIONS'; payload: ReviewQuestion[] }
  | { type: 'SET_SHOW_SUCCESS_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_FAILURE_MODAL'; payload: boolean }
  | { type: 'SET_REDIRECTING'; payload: boolean }
  | { type: 'QUIZ_COMPLETED'; payload: { result: QuizResult; questions?: ReviewQuestion[] } };

// État initial
export const initialQuizState: QuizState = {
  quiz: null,
  currentQuestion: 0,
  answers: {},
  showResults: false,
  quizResult: null,
  timeLeft: 0,
  quizStarted: false,
  isSubmitting: false,
  loading: true,
  alreadyCompleted: null,
  reviewMode: false,
  reviewQuestions: [],
  showSuccessModal: false,
  showFailureModal: false,
  redirecting: false,
};

// Réducteur
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_QUIZ':
      return { ...state, quiz: action.payload, timeLeft: action.payload.timeLimit * 60 };
    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestion: action.payload };
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.payload.questionId]: action.payload.value },
      };
    case 'SET_SHOW_RESULTS':
      return { ...state, showResults: action.payload };
    case 'SET_QUIZ_RESULT':
      return { ...state, quizResult: action.payload };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    case 'SET_QUIZ_STARTED':
      return { ...state, quizStarted: action.payload };
    case 'SET_IS_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ALREADY_COMPLETED':
      return { ...state, alreadyCompleted: action.payload };
    case 'SET_REVIEW_MODE':
      return { ...state, reviewMode: action.payload };
    case 'SET_REVIEW_QUESTIONS':
      return { ...state, reviewQuestions: action.payload };
    case 'SET_SHOW_SUCCESS_MODAL':
      return { ...state, showSuccessModal: action.payload };
    case 'SET_SHOW_FAILURE_MODAL':
      return { ...state, showFailureModal: action.payload };
    case 'SET_REDIRECTING':
      return { ...state, redirecting: action.payload };
    case 'QUIZ_COMPLETED':
      return {
        ...state,
        alreadyCompleted: action.payload.result,
        reviewQuestions: action.payload.questions || [],
      };
    default:
      return state;
  }
}
