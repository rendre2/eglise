'use client'

import { CheckCircle, XCircle } from 'lucide-react'

interface QuestionViewProps {
  question: {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false';
    options?: string[];
    correctAnswer?: number | boolean; // Correction: s'assurer que c'est bien boolean, pas juste true
  };
  index: number;
  isReviewMode?: boolean;
  userAnswer?: number | boolean;
  isCorrect?: boolean;
}

export function QuestionView({ 
  question, 
  index, 
  isReviewMode = false,
  userAnswer,
  isCorrect
}: QuestionViewProps) {
  // Normalize types to avoid mismatches (e.g., '2' vs 2 for multiple_choice)
  const normalizedCorrectAnswer = (() => {
    if (question.type === 'multiple_choice') {
      if (typeof question.correctAnswer === 'string') {
        const n = parseInt(question.correctAnswer as unknown as string, 10)
        return Number.isNaN(n) ? undefined : n
      }
      return typeof question.correctAnswer === 'number' ? question.correctAnswer : undefined
    } else {
      // true/false
      if (typeof question.correctAnswer === 'string') {
        return question.correctAnswer === 'true'
      }
      return typeof question.correctAnswer === 'boolean' ? question.correctAnswer : undefined
    }
  })()

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 flex-1">
          {index + 1}. {question.question}
        </h4>
        {isReviewMode && isCorrect !== undefined && (
          isCorrect ? (
            <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 ml-2" />
          )
        )}
      </div>
      
      <div className="text-sm space-y-3 mt-2">
        {question.type === 'multiple_choice' ? (
          <div className="space-y-2">
            {question.options?.map((option, optIndex) => (
              <div 
                key={optIndex} 
                className={`p-3 rounded-lg ${
                  isReviewMode
                    ? optIndex === (normalizedCorrectAnswer as number) 
                      ? 'bg-green-50 border border-green-200' 
                      : optIndex === userAnswer && optIndex !== (normalizedCorrectAnswer as number)
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  {isReviewMode && optIndex === (normalizedCorrectAnswer as number) && (
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  )}
                  {isReviewMode && optIndex === userAnswer && optIndex !== (normalizedCorrectAnswer as number) && (
                    <XCircle className="w-4 h-4 text-red-600 mr-2" />
                  )}
                  {!isReviewMode && (
                    <div className="w-4 h-4 mr-2" />
                  )}
                  <span className={
                    isReviewMode && optIndex === (normalizedCorrectAnswer as number)
                      ? 'text-green-700 font-medium' 
                      : isReviewMode && optIndex === userAnswer && optIndex !== (normalizedCorrectAnswer as number)
                        ? 'text-red-700 font-medium'
                        : ''
                  }>
                    {option}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div 
              className={`p-3 rounded-lg ${
                isReviewMode
                  ? (normalizedCorrectAnswer as boolean) === true 
                    ? 'bg-green-50 border border-green-200' 
                    : userAnswer === true && (normalizedCorrectAnswer as boolean) === false // Correction: comparaison explicite avec false
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {isReviewMode && (normalizedCorrectAnswer as boolean) === true && (
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                )}
                {isReviewMode && userAnswer === true && (normalizedCorrectAnswer as boolean) === false && (
                  <XCircle className="w-4 h-4 text-red-600 mr-2" />
                )}
                {!isReviewMode && (
                  <div className="w-4 h-4 mr-2" />
                )}
                <span className={
                  isReviewMode && (normalizedCorrectAnswer as boolean) === true 
                    ? 'text-green-700 font-medium' 
                    : isReviewMode && userAnswer === true && (normalizedCorrectAnswer as boolean) === false
                      ? 'text-red-700 font-medium'
                      : ''
                }>
                  Vrai
                </span>
              </div>
            </div>
            <div 
              className={`p-3 rounded-lg ${
                isReviewMode
                  ? (normalizedCorrectAnswer as boolean) === false 
                    ? 'bg-green-50 border border-green-200' 
                    : userAnswer === false && (normalizedCorrectAnswer as boolean) === true // Correction: comparaison explicite avec true
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {isReviewMode && (normalizedCorrectAnswer as boolean) === false && (
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                )}
                {isReviewMode && userAnswer === false && (normalizedCorrectAnswer as boolean) === true && (
                  <XCircle className="w-4 h-4 text-red-600 mr-2" />
                )}
                {!isReviewMode && (
                  <div className="w-4 h-4 mr-2" />
                )}
                <span className={
                  isReviewMode && (normalizedCorrectAnswer as boolean) === false 
                    ? 'text-green-700 font-medium' 
                    : isReviewMode && userAnswer === false && (normalizedCorrectAnswer as boolean) === true
                      ? 'text-red-700 font-medium'
                      : ''
                }>
                  Faux
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}