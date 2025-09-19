'use client'

import { useReducer, useEffect, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { quizReducer, initialQuizState } from './quizReducer'
import { Quiz, QuizSubmitResponse, QuizResult, ReviewQuestion, AlreadyCompletedResponse } from './types'
import { QuizService } from '@/lib/client-services'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { QuestionView } from './components/QuestionView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award, 
  ArrowLeft, 
  ArrowRight,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Trophy,
  RotateCcw
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function QuizPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [state, dispatch] = useReducer(quizReducer, initialQuizState)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: number | boolean }>({})
  const [showResults, setShowResults] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizSubmitResponse | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [alreadyCompleted, setAlreadyCompleted] = useState<QuizResult | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showFailureModal, setShowFailureModal] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Redirection si non connecté
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Charger les données du quiz en utilisant le service client
  useEffect(() => {
    if (session && params.id) {
      const chapterId = Array.isArray(params.id) ? params.id[0] : params.id;
      const fetchQuiz = async () => {
        try {
          setLoading(true)
          
          // Utiliser le service client pour récupérer le quiz
          const data = await QuizService.getQuiz(chapterId)
          
          // Cas spécial : quiz déjà complété (avec alreadyCompleted)
          if ('alreadyCompleted' in data) {
            const completedData = data as unknown as AlreadyCompletedResponse
            setAlreadyCompleted(completedData.result)
            
            // Stocker les questions pour le mode révision si disponibles
            if (completedData.reviewMode && completedData.questions) {
              setReviewQuestions(completedData.questions)
            }
            
            toast.info('Vous avez déjà complété ce quiz avec succès')
            return
          }
          
          // Quiz normal
          const quizData = data as Quiz
          setQuiz(quizData)
          setTimeLeft(quizData.timeLimit * 60)
          
        } catch (error: any) {
          console.error('Erreur lors du chargement du quiz:', error)
          toast.error(error.message || 'Impossible de charger le quiz')
          router.push('/modules')
        } finally {
          setLoading(false)
        }
      }
      fetchQuiz()
    }
  }, [session, params.id, router])

  // Fonction pour soumettre le quiz en utilisant le service client
  const handleSubmitQuiz = useCallback(async () => {
    if (!quiz || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Utiliser le service client pour soumettre le quiz
      const result = await QuizService.submitQuiz(quiz.id, answers)
      
      if (result.success) {
        setQuizResult(result)
        setShowResults(true)
        
        if (result.passed) {
          // Succès - Modal avec redirection automatique
          setShowSuccessModal(true)
          toast.success(`Félicitations ! Quiz réussi avec ${result.score}% !`)
          
          // Redirection automatique après 3 secondes
          setTimeout(() => {
            setRedirecting(true)
            setTimeout(() => {
              router.push('/modules')
            }, 2000)
          }, 3000)
        } else {
          // Échec - Modal permettant de repasser le QCM
          setShowFailureModal(true)
          toast.error(`QCM non validé (${result.score}%). Vous devez obtenir au moins ${quiz.passingScore}% pour valider le chapitre.`)
        }
      } else {
        throw new Error(result.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement du résultat:', error)
      toast.error(error.message || 'Impossible d\'enregistrer le résultat du quiz')
    } finally {
      setIsSubmitting(false)
    }
  }, [quiz, answers, isSubmitting, router])

  // Timer
  useEffect(() => {
    if (!quizStarted || showResults || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, showResults, timeLeft, handleSubmitQuiz])

  const startQuiz = () => {
    setQuizStarted(true)
  }

  const retryQuiz = () => {
    // Réinitialiser le quiz pour une nouvelle tentative
    setAnswers({})
    setCurrentQuestion(0)
    setShowResults(false)
    setQuizResult(null)
    setShowFailureModal(false)
    setQuizStarted(false)
    setTimeLeft(quiz ? quiz.timeLimit * 60 : 0)
  }

  const handleAnswerChange = (questionId: string, answerValue: number | boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerValue
    }))
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return 'text-green-600'
    if (score >= passingScore * 0.8) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const allQuestionsAnswered = () => {
    if (!quiz) return false
    return quiz.questions.every(q => answers[q.id] !== undefined)
  }

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du quiz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/modules"
            className="flex items-center text-blue-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux modules
          </Link>
          {quizStarted && !showResults && quiz && (
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-orange-600">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(timeLeft)}
              </Badge>
              <Badge variant="outline" className="text-blue-600">
                Question {currentQuestion + 1}/{quiz.questions.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Quiz déjà complété - Mode révision */}
        {alreadyCompleted && reviewMode && reviewQuestions.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-blue-900">
                  Révision du QCM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-900">
                  {reviewQuestions.length} questions. Les bonnes réponses sont marquées en vert.
                </div>

                {reviewQuestions.map((question, index) => (
                  <QuestionView 
                    key={question.id}
                    question={question}
                    index={index}
                    isReviewMode
                  />
                ))}

                <Button 
                  onClick={() => setReviewMode(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  Retour au résumé
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Quiz déjà complété - Résumé */}
        {alreadyCompleted && !reviewMode && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-blue-900">
                  Quiz déjà complété avec succès
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2 text-green-600">
                    {alreadyCompleted.score}%
                  </div>
                  <p className="text-gray-600 mb-2">Quiz réussi !</p>
                  <p className="text-sm text-gray-500">
                    Complété le {formatDate(alreadyCompleted.completedAt)}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Félicitations !</h4>
                      <p className="text-sm text-green-800">
                        Vous avez déjà réussi ce quiz. Vous pouvez maintenant continuer vers le chapitre suivant.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-3">
                  <Button 
                    onClick={() => setReviewMode(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Revoir le QCM
                  </Button>
                  
                  <Link href="/modules">
                    <Button className="w-full bg-green-500 hover:bg-green-600">
                      Continuer vers les modules
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz non démarré */}
        {!alreadyCompleted && quiz && !quizStarted && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-blue-900">
                  {quiz.title}
                </CardTitle>
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Badge variant="outline">
                    Module {quiz.moduleInfo?.order || 'N/A'}: {quiz.moduleInfo?.title || 'Module'}
                  </Badge>
                  <Badge variant="outline">
                    Chapitre: {quiz.chapterInfo?.title || 'Chapitre'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Instructions :</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• {quiz.totalQuestions} questions</li>
                    <li>• Temps limite : {quiz.timeLimit} minutes</li>
                    <li>• Score minimum requis : {quiz.passingScore}%</li>
                    <li>• {quiz.instructions?.canRetry ? 'Quiz peut être repris en cas d\'échec' : 'Quiz validé une seule fois'}</li>
                  </ul>
                </div>

                {quiz.previousAttempt && !quiz.previousAttempt.passed && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-orange-900 mb-1">Tentative précédente :</h4>
                        <p className="text-sm text-orange-800">
                          Vous avez déjà tenté ce quiz (Score: {quiz.previousAttempt.score}%). 
                          Vous pouvez réessayer jusqu'à ce que vous obteniez le score requis.
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Dernière tentative : {formatDate(quiz.previousAttempt.attemptedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-900 mb-1">Important :</h4>
                      <p className="text-sm text-orange-800">
                        Vous devez réussir ce quiz pour valider le chapitre et débloquer le suivant. 
                        Assurez-vous d'avoir bien assimilé le contenu avant de commencer.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={startQuiz}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-3"
                >
                  Commencer le Quiz
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz en cours */}
        {!alreadyCompleted && quiz && quizStarted && !showResults && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl text-blue-900">
                    Question {currentQuestion + 1} sur {quiz.questions.length}
                  </CardTitle>
                  <Badge variant="outline" className="text-orange-600">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(timeLeft)}
                  </Badge>
                </div>
                <Progress value={(Object.keys(answers).length / quiz.questions.length) * 100} className="h-2" />
              </CardHeader>
              
              <CardContent className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {quiz.questions[currentQuestion].question}
                </h3>

                {/* Questions à choix multiples */}
                {quiz.questions[currentQuestion].type === 'multiple_choice' ? (
                  <RadioGroup
                    value={typeof answers[quiz.questions[currentQuestion].id] === 'number' ? 
                      answers[quiz.questions[currentQuestion].id].toString() : undefined}
                    onValueChange={(value) => 
                      handleAnswerChange(quiz.questions[currentQuestion].id, parseInt(value))
                    }
                  >
                    {quiz.questions[currentQuestion].options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  /* Questions Vrai/Faux */
                  <RadioGroup
                    value={typeof answers[quiz.questions[currentQuestion].id] === 'boolean' ? 
                      answers[quiz.questions[currentQuestion].id].toString() : undefined}
                    onValueChange={(value) => 
                      handleAnswerChange(quiz.questions[currentQuestion].id, value === 'true')
                    }
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true" className="flex-1 cursor-pointer">
                        Vrai
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false" className="flex-1 cursor-pointer">
                        Faux
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Précédent
                  </Button>

                  {currentQuestion === quiz.questions.length - 1 ? (
                    <Button
                      onClick={handleSubmitQuiz}
                      className="bg-green-500 hover:bg-green-600"
                      disabled={!allQuestionsAnswered() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        'Terminer le Quiz'
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                      disabled={answers[quiz.questions[currentQuestion].id] === undefined}
                    >
                      Suivant
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>

                <div className="mt-4 text-sm text-gray-500 text-center">
                  {Object.keys(answers).length} sur {quiz.questions.length} questions répondues
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de succès */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-green-600" />
                </div>
                <DialogTitle className="text-2xl text-green-600 mb-4">
                  🎉 Quiz Réussi !
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="text-center space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-semibold text-lg">
                  Score : {quizResult?.score}%
                </p>
                <p className="text-green-700 text-sm">
                  Chapitre validé avec succès !
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  {redirecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                      Redirection vers le chapitre suivant...
                    </>
                  ) : (
                    'Redirection automatique dans quelques secondes...'
                  )}
                </p>
              </div>
              
              <Button 
                onClick={() => router.push('/modules')}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={redirecting}
              >
                Continuer maintenant
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal d'échec */}
        <Dialog open={showFailureModal} onOpenChange={setShowFailureModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <DialogTitle className="text-2xl text-red-600 mb-4">
                  QCM Non Validé
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="text-center space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800 font-semibold text-lg">
                  Score : {quizResult?.score}%
                </p>
                <p className="text-red-700 text-sm">
                  Minimum requis : {quiz?.passingScore}%
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-orange-800 text-sm">
                  Vous devez repasser le QCM pour valider ce chapitre et débloquer le suivant.
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={retryQuiz}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Repasser le QCM
                </Button>
                
                <Link href="/modules">
                  <Button variant="outline" className="w-full">
                    Retour aux modules
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Résultats détaillés (affiché après les modals) */}
        {!alreadyCompleted && showResults && quiz && quizResult && !showSuccessModal && !showFailureModal && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  quizResult.passed ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {quizResult.passed ? (
                    <Award className="w-10 h-10 text-green-600" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-600" />
                  )}
                </div>
                <CardTitle className="text-2xl text-blue-900">
                  Résultats Détaillés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(quizResult.score, quiz.passingScore)}`}>
                    {quizResult.score}%
                  </div>
                  <p className="text-gray-600">
                    {quizResult.passed ? 'Chapitre validé !' : 'Score insuffisant pour valider le chapitre.'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {quizResult.correctAnswers}
                      </div>
                      <div className="text-sm text-gray-600">Bonnes réponses</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {quizResult.totalQuestions}
                      </div>
                      <div className="text-sm text-gray-600">Total questions</div>
                    </div>
                  </div>
                </div>

                {/* Détail des réponses */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-900">Détail des réponses :</h3>
                  {quizResult.results.map((result, index) => {
                    const question = quiz.questions.find(q => q.id === result.questionId)
                    if (!question) return null
                    
                    return (
                      <div key={result.questionId} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex-1">
                            {index + 1}. {question.question}
                          </h4>
                          {result.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 ml-2" />
                          )}
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {question.type === 'multiple_choice' ? (
                            <>
                              <p>
                                <span className="font-medium">Votre réponse : </span>
                                <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                  {question.options && typeof result.userAnswer === 'number' ? 
                                    question.options[result.userAnswer] : 'Aucune réponse'}
                                </span>
                              </p>
                              {!result.isCorrect && (
                                <p>
                                  <span className="font-medium">Bonne réponse : </span>
                                  <span className="text-green-600">
                                    {question.options && typeof result.correctAnswer === 'number' ? 
                                      question.options[result.correctAnswer] : 'N/A'}
                                  </span>
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p>
                                <span className="font-medium">Votre réponse : </span>
                                <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                  {typeof result.userAnswer === 'boolean' ? 
                                    (result.userAnswer ? 'Vrai' : 'Faux') : 'Aucune réponse'}
                                </span>
                              </p>
                              {!result.isCorrect && (
                                <p>
                                  <span className="font-medium">Bonne réponse : </span>
                                  <span className="text-green-600">
                                    {typeof result.correctAnswer === 'boolean' ? 
                                      (result.correctAnswer ? 'Vrai' : 'Faux') : 'N/A'}
                                  </span>
                                </p>
                              )}
                            </>
                          )}
                          
                          {result.explanation && (
                            <p className="text-gray-600 italic mt-2 p-2 bg-gray-50 rounded">
                              <strong>Explication:</strong> {result.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col space-y-3">
                  {quizResult.passed ? (
                    <Link href="/modules">
                      <Button className="w-full bg-green-500 hover:bg-green-600">
                        Continuer vers le chapitre suivant
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Button 
                        onClick={retryQuiz}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Repasser le QCM
                      </Button>
                      <Link href="/modules">
                        <Button variant="outline" className="w-full">
                          Retour aux modules
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}