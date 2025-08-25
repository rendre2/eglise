'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  CheckCircle, 
  Clock,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Award,
  Lock,
  Video,
  Headphones,
  RefreshCw
} from 'lucide-react'
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
  chapter: {
    id: string
    title: string
    description: string
    order: number
    allContentsCompleted?: boolean
    moduleInfo: {
      id: string
      title: string
    }
    quiz?: {
      id: string
      title: string
      passingScore: number
    }
  }
  navigation: {
    previous: Content | null
    next: Content | null
  }
}

export default function ContentDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [localProgress, setLocalProgress] = useState(0)
  const [updateInProgress, setUpdateInProgress] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // Redirection si non connecté
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  // Fonction pour mettre à jour la progression
  const updateProgress = useCallback(async (watchTime: number, forceComplete: boolean = false) => {
    if (updateInProgress || !content || !params.id) return
    
    setUpdateInProgress(true)
    try {
      // Un contenu est complété UNIQUEMENT à 100%
      const isCompleted = forceComplete || (watchTime >= content.duration)
      
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
        // Si le contenu est complété à 100%, déclencher la redirection vers le QCM
        if (isCompleted && !content.isCompleted) {
          setContent(prev => prev ? { ...prev, isCompleted: true } : null)
          setShowCompletionModal(true)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error)
    } finally {
      setUpdateInProgress(false)
    }
  }, [updateInProgress, content, params.id])

  // Charger les données du contenu
  useEffect(() => {
    if (session && params.id) {
      const fetchContent = async () => {
        try {
          const response = await fetch(`/api/content/${params.id}`)
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Erreur lors de la récupération du contenu')
          }
          const data = await response.json()
          if (data.success) {
            setContent(data)
            setLocalProgress(data.progress || 0)
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

  // Gestion du lecteur média
  useEffect(() => {
    const media = mediaRef.current
    if (!media || !content) return

    const updateTime = () => {
      const current = media.currentTime
      setCurrentTime(current)
      
      if (media.duration > 0) {
        const progress = (current / media.duration) * 100
        setLocalProgress(progress)
        
        // Validation stricte à 100%
        if (progress >= 100 && !content.isCompleted) {
          updateProgress(current, true)
        }
      }
    }

    const updateDuration = () => {
      if (media.duration && !isNaN(media.duration)) {
        setDuration(media.duration)
        // Reprendre là où l'utilisateur s'était arrêté
        if (content.watchTime > 0 && content.watchTime < media.duration) {
          media.currentTime = content.watchTime
        }
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    
    const handleError = (e: Event) => {
      console.error('Erreur de lecture média:', e)
      toast.error(`Erreur lors de la lecture ${content.type === 'VIDEO' ? 'de la vidéo' : 'de l\'audio'}`)
    }

    const handleLoadStart = () => {
      setLoading(true)
    }

    const handleCanPlay = () => {
      setLoading(false)
    }

    media.addEventListener('timeupdate', updateTime)
    media.addEventListener('loadedmetadata', updateDuration)
    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('error', handleError)
    media.addEventListener('loadstart', handleLoadStart)
    media.addEventListener('canplay', handleCanPlay)

    // Mise à jour périodique de la progression
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current)
    }
    
    progressUpdateInterval.current = setInterval(() => {
      if (isPlaying && media.currentTime > 0) {
        updateProgress(media.currentTime)
      }
    }, 5000) // Toutes les 5 secondes

    return () => {
      media.removeEventListener('timeupdate', updateTime)
      media.removeEventListener('loadedmetadata', updateDuration)
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('error', handleError)
      media.removeEventListener('loadstart', handleLoadStart)
      media.removeEventListener('canplay', handleCanPlay)
      
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
      }
      
      // Sauvegarder la progression avant de quitter
      if (media.currentTime > 0) {
        updateProgress(media.currentTime)
      }
    }
  }, [content, isPlaying, updateProgress])

  // Redirection automatique vers le QCM après complétion
  const handleRedirectToQuiz = () => {
   if (content?.chapter?.quiz) {
      setRedirecting(true)
      setTimeout(() => {
        router.push(`/quiz/${content.chapter.id}`)
      }, 2000)
    } else {
      // Pas de QCM, aller au chapitre suivant
      setRedirecting(true)
      setTimeout(() => {
        router.push('/modules')
      }, 2000)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0 min'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min` : `${minutes} min`
  }

  const togglePlay = () => {
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      media.pause()
    } else {
      const playPromise = media.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Erreur lors de la lecture:', error)
          toast.error(`Impossible de lire ${content?.type === 'VIDEO' ? 'la vidéo' : 'l\'audio'}`)
        })
      }
    }
  }

  const handleSeek = (seconds: number) => {
    const media = mediaRef.current
    if (!media || !media.duration) return
    
    const newTime = Math.max(0, Math.min(media.duration, media.currentTime + seconds))
    media.currentTime = newTime
  }

  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current
    if (!media || !media.duration) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickPosition = (event.clientX - rect.left) / rect.width
    const newTime = clickPosition * media.duration
    media.currentTime = newTime
  }

  const handleFullscreen = () => {
    const media = mediaRef.current
    if (!media || content?.type !== 'VIDEO') return

    if ((media as HTMLVideoElement).requestFullscreen) {
      (media as HTMLVideoElement).requestFullscreen()
    }
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
             {content.chapter.moduleInfo?.title || 'Module'}
            </Badge>
            <Badge variant="outline" className="text-green-600">
              {content.chapter.title}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Lecteur média */}
            <Card className="overflow-hidden shadow-xl">
              <div className="relative bg-black">
                {content.type === 'VIDEO' ? (
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={content.url}
                    className="w-full aspect-video"
                    preload="metadata"
                    onError={(e) => {
                      console.error('Erreur vidéo:', e)
                      toast.error('Impossible de charger la vidéo')
                    }}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                    <div className="text-center text-white">
                      <Headphones className="w-24 h-24 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
                      <p className="text-purple-200">Contenu audio</p>
                    </div>
                    <audio
                      ref={mediaRef as React.RefObject<HTMLAudioElement>}
                      src={content.url}
                      preload="metadata"
                      className="hidden"
                      onError={(e) => {
                        console.error('Erreur audio:', e)
                        toast.error('Impossible de charger l\'audio')
                      }}
                    />
                  </div>
                )}
                
                {/* Contrôles média personnalisés */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="space-y-2">
                    {/* Barre de progression cliquable */}
                    <div 
                      className="w-full h-2 bg-white/20 rounded-full cursor-pointer"
                      onClick={handleProgressClick}
                    >
                      <div 
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    
                    {/* Contrôles */}
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={togglePlay}
                          className="text-white hover:bg-white/20"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSeek(-10)}
                          className="text-white hover:bg-white/20"
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSeek(10)}
                          className="text-white hover:bg-white/20"
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center space-x-2 text-sm">
                          <span>{formatTime(currentTime)}</span>
                          <span>/</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                        >
                          <Volume2 className="w-5 h-5" />
                        </Button>
                        
                        {content.type === 'VIDEO' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleFullscreen}
                            className="text-white hover:bg-white/20"
                          >
                            <Maximize className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Progression */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-500" />
                  Progression du Contenu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Progression</span>
                    <span className="font-semibold">{Math.round(localProgress)}%</span>
                  </div>
                  <Progress value={localProgress} className="h-3" />
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Temps visionné: {formatTime(currentTime)}</span>
                    <span>Durée totale: {formatTime(duration)}</span>
                  </div>
                  
                  {content.isCompleted ? (
                    <div className="flex items-center text-green-600 font-semibold">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Contenu terminé à 100% !
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Important :</strong> Vous devez regarder/écouter le contenu jusqu'à 100% pour accéder au QCM.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
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
                    
                   {content.navigation?.next ? (
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
                        <Link href={`/quiz/${content.chapter.id}`}>
                          <Button className="w-full bg-green-500 hover:bg-green-600">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Passer le QCM du chapitre
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full bg-gray-400">
                          <Lock className="w-4 h-4 mr-2" />
                          QCM disponible après 100% de tous les contenus
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Aucun QCM pour ce chapitre</p>
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

        {/* Modal de complétion */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <DialogTitle className="text-2xl text-green-600 mb-4">
                  🎉 Contenu Terminé !
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="text-center space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-semibold">
                  Félicitations ! Vous avez terminé ce {content?.type === 'VIDEO' ? 'vidéo' : 'audio'} à 100%.
                </p>
              </div>
              
              {content?.chapter.quiz ? (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    {redirecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                        Redirection vers le QCM...
                      </>
                    ) : (
                      'Vous allez maintenant passer le QCM pour valider ce chapitre.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-orange-800 text-sm">
                    Aucun QCM pour ce chapitre. Redirection vers les modules...
                  </p>
                </div>
              )}
              
              <Button 
                onClick={handleRedirectToQuiz}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={redirecting}
              >
                {content?.chapter.quiz ? 'Passer le QCM maintenant' : 'Continuer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  )
}