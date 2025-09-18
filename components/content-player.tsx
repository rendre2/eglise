'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  CheckCircle, 
  Clock,
  Headphones,
} from 'lucide-react'
import { toast } from 'sonner'

interface ContentPlayerProps {
  content: {
    id: string
    title: string
    type: 'VIDEO' | 'AUDIO'
    url: string
    duration: number
    watchTime: number
    isCompleted: boolean
    progress: number
  }
  onProgressUpdate: (watchTime: number, isCompleted: boolean) => Promise<void>
  onCompletion?: () => void
}

export function ContentPlayer({ content, onProgressUpdate, onCompletion }: ContentPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [localProgress, setLocalProgress] = useState(content.progress || 0)
  const [updateInProgress, setUpdateInProgress] = useState(false)
  const [isCompleted, setIsCompleted] = useState(content.isCompleted || false)
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  // Fonction pour mettre à jour la progression
  const updateProgress = useCallback(async (watchTime: number, completed: boolean = false) => {
    if (updateInProgress || !content) return
    
    setUpdateInProgress(true)
    try {
      await onProgressUpdate(Math.floor(watchTime), completed)
      
      // Marquer le contenu comme complété localement
      if (completed) {
        setIsCompleted(true)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression:', error)
    } finally {
      setUpdateInProgress(false)
    }
  }, [updateInProgress, content, onProgressUpdate])

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
        
        // Marquer comme complété à 100%
        if (progress >= 100 && !isCompleted) {
          updateProgress(current, true)
          toast.success(`${content.type === 'VIDEO' ? 'Vidéo' : 'Audio'} terminé ! Passez au contenu suivant.`)
          
          // Notifier le composant parent
          if (onCompletion) {
            onCompletion()
          }
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
      // Gérer le chargement si nécessaire
    }

    const handleCanPlay = () => {
      // Gérer quand le média est prêt à être joué
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
    }, 10000) // Toutes les 10 secondes

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
        updateProgress(media.currentTime, localProgress >= 100)
      }
    }
  }, [content, isPlaying, localProgress, updateProgress, isCompleted, onCompletion])

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
          toast.error(`Impossible de lire ${content.type === 'VIDEO' ? 'la vidéo' : 'l\'audio'}`)
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
    if (!media || content.type !== 'VIDEO') return

    if ((media as HTMLVideoElement).requestFullscreen) {
      (media as HTMLVideoElement).requestFullscreen()
    }
  }

  return (
    <div className="space-y-4">
      {/* Lecteur média */}
      <div className="relative bg-black rounded-lg overflow-hidden">
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

      {/* Progression */}
      <div className="space-y-4 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-orange-500" />
            <span className="font-medium">Progression</span>
          </div>
          <span className="font-semibold">{Math.round(localProgress)}%</span>
        </div>
        
        <Progress value={localProgress} className="h-3" />
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>Temps visionné: {formatTime(currentTime)}</span>
          <span>Durée totale: {formatTime(duration)}</span>
        </div>
        
        {isCompleted && (
          <div className="flex items-center text-green-600 font-semibold">
            <CheckCircle className="w-5 h-5 mr-2" />
            Contenu terminé !
          </div>
        )}
      </div>
    </div>
  )
}
