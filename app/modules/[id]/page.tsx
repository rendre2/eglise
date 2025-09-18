'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  Clock,
  Video,
  Headphones,
  ArrowLeft,
  ArrowRight,
  Award,
  Lock,
  BookOpen,
} from 'lucide-react'
import { ContentPlayer } from '@/components/content-player'
import Link from 'next/link'
import { toast } from 'sonner'

interface Content {
  id: string
  title: string
  type: 'VIDEO' | 'AUDIO'
  url: string
  duration: number
  order: number
  description?: string
  isCompleted: boolean
  progress: number
  watchTime: number
}

interface Quiz {
  id: string
  title: string
  passingScore: number
  userResult?: {
    score: number
    passed: boolean
    createdAt: string
  }
}

interface Chapter {
  id: string
  title: string
  description: string
  order: number
  contents: Content[]
  quiz?: Quiz
  allContentsCompleted: boolean
  moduleInfo: {
    id: string
    title: string
  }
}

interface Navigation {
  previous: Content | null
  next: Content | null
}

interface ApiResponse {
  success: boolean
  message?: string
}

interface ContentResponse extends Content, ApiResponse {
  chapter: Chapter
  navigation: Navigation
}

export default function ContentDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [content, setContent] = useState<ContentResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirection si non connecté
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fonction pour mettre à jour la progression
  const handleProgressUpdate = async (watchTime: number, isCompleted: boolean = false) => {
    if (!content || !params.id) return
    
    try {
      const response = await fetch(`/api/content-progress/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          watchTime: Math.floor(watchTime), 
          isCompleted 
        })
      })
      
      if (!response.ok) {
        console.error('Erreur lors de la mise à jour de la progression')
      } else {
        // Marquer le contenu comme complété localement
        if (isCompleted) {
          setContent(prev => prev ? { ...prev, isCompleted: true } : null)
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de la progression:', error)
    }
  }

  // Charger les données du contenu
  useEffect(() => {
    if (session && params.id) {
      const fetchContent = async () => {
        try {
          const response = await fetch(`/api/content/${params.id}`)
          if (!response.ok) {
            const errorData: ApiResponse = await response.json()
            throw new Error(errorData.message || 'Erreur lors de la récupération du contenu')
          }
          const data: ContentResponse = await response.json()
          if (data.success) {
            setContent(data)
          } else {
            throw new Error(data.message || 'Erreur lors de la récupération du contenu')
          }
        } catch (error) {
          console.error('Erreur lors du chargement du contenu:', error)
          const errorMessage = error instanceof Error ? error.message : 'Impossible de charger le contenu'
          toast.error(errorMessage)
          router.push('/modules')
        } finally {
          setLoading(false)
        }
      }
      fetchContent()
    }
  }, [session, params.id, router])

  // Fonction pour gérer la complétion du contenu
  const handleContentCompletion = () => {
    // Mettre à jour l'état local sans recharger la page
    setContent(prev => prev ? { ...prev, isCompleted: true } : null)
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0 min'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min` : `${minutes} min`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contenu non trouvé</h2>
          <Link href="/modules">
            <Button>Retour aux modules</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Navigation supérieure */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/modules"
            className="flex items-center text-blue-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux modules
          </Link>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-blue-600">
              {content.chapter.moduleInfo.title}
            </Badge>
            <Badge variant="outline" className="text-green-600">
              {content.chapter.title}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Lecteur média avec le composant ContentPlayer */}
            <Card className="overflow-hidden shadow-xl">
              <ContentPlayer 
                content={{
                  id: content.id,
                  title: content.title,
                  type: content.type,
                  url: content.url,
                  duration: content.duration,
                  watchTime: content.watchTime,
                  isCompleted: content.isCompleted,
                  progress: content.progress
                }}
                onProgressUpdate={handleProgressUpdate}
                onCompletion={handleContentCompletion}
              />
            </Card>
          </div>

          <div className="space-y-6">
            {/* Informations du contenu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl text-blue-900">
                  {content.type === 'VIDEO' ? <Video className="w-6 h-6 mr-2" /> : <Headphones className="w-6 h-6 mr-2" />}
                  {content.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  {content.description || 'Description non disponible'}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(content.duration)}
                </div>

                <Separator className="my-4" />

                <h4 className="font-semibold text-blue-900 mb-3">Chapitre: {content.chapter.title}</h4>
                <p className="text-sm text-gray-600">{content.chapter.description}</p>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Navigation entre contenus */}
                  <div className="flex justify-between mb-4">
                    {content.navigation.previous ? (
                      <Link href={`/content/${content.navigation.previous.id}`}>
                        <Button variant="outline" size="sm">
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Précédent
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Précédent
                      </Button>
                    )}
                    
                    {content.navigation.next ? (
                      <Link href={`/content/${content.navigation.next.id}`}>
                        <Button variant="outline" size="sm">
                          Suivant
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Suivant
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Accès au quiz */}
                  {content.chapter.quiz ? (
                    <>
                      {content.chapter.allContentsCompleted ? (
                        <Link href={`/quiz/${content.chapter.quiz.id}`}>
                          <Button className="w-full bg-green-500 hover:bg-green-600">
                            <BookOpen className="w-4 h-4 mr-2" />
                            {content.chapter.quiz.userResult ? 'Repasser le quiz' : 'Passer le quiz du chapitre'}
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full bg-gray-400">
                          <Lock className="w-4 h-4 mr-2" />
                          Quiz disponible après tous les contenus
                        </Button>
                      )}
                      
                      {content.chapter.quiz.userResult && (
                        <div className={`text-center p-3 rounded-lg ${
                          content.chapter.quiz.userResult.passed 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          <Award className="w-5 h-5 mx-auto mb-1" />
                          <p className="text-sm font-semibold">
                            Quiz {content.chapter.quiz.userResult.passed ? 'réussi' : 'échoué'} : {content.chapter.quiz.userResult.score}%
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Aucun quiz pour ce chapitre</p>
                    </div>
                  )}
                  
                  <Link href="/modules">
                    <Button variant="outline" className="w-full">
                      Retour aux modules
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}