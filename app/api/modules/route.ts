export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Récupérer tous les modules actifs avec leurs chapitres et contenus
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            contents: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                duration: true,
                order: true
              }
            },
            quiz: {
              select: {
                id: true,
                title: true,
                passingScore: true
              }
            }
          }
        },
        _count: {
          select: {
            moduleProgress: true
          }
        }
      }
    })

    let userStats = null
    let modulesWithProgress = modules.map(module => ({
      ...module,
      chapters: module.chapters || [],
      isCompleted: false,
      isUnlocked: false,
      progress: 0,
      allChaptersCompleted: false
    }))

    if (session?.user?.id) {
      try {
        // Vérifier si l'email est vérifié
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { emailVerified: true }
        })

        if (!user?.emailVerified) {
          return NextResponse.json({
            error: 'Email non vérifié',
            message: 'Veuillez vérifier votre email avant d\'accéder aux modules',
            emailNotVerified: true,
            success: false
          }, { status: 403 })
        }

        // Récupérer la progression de l'utilisateur
        const [moduleProgress, chapterProgress, contentProgress, quizResults] = await Promise.all([
          prisma.moduleProgress.findMany({
            where: { userId: session.user.id },
            include: {
              module: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }),
          prisma.chapterProgress.findMany({
            where: { userId: session.user.id },
            include: {
              chapter: {
                select: {
                  id: true,
                  moduleId: true
                }
              }
            }
          }),
          prisma.contentProgress.findMany({
            where: { userId: session.user.id },
            include: {
              content: {
                select: {
                  id: true,
                  chapterId: true,
                  duration: true
                }
              }
            }
          }),
          prisma.quizResult.findMany({
            where: { 
              userId: session.user.id,
              passed: true
            },
            include: {
              quiz: {
                select: {
                  chapterId: true
                }
              }
            }
          })
        ])

        // Calculer les statistiques utilisateur
        const totalWatchTime = contentProgress.reduce((sum, p) => sum + (p.watchTime || 0), 0)
        const completedModules = moduleProgress.filter(p => p.isCompleted).length
        const averageScore = quizResults.length > 0 
          ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
          : 0

        userStats = {
          totalModules: modules.length,
          completedModules,
          totalWatchTime,
          averageScore
        }

        // Créer des maps pour un accès rapide
        const moduleProgressMap = new Map(moduleProgress.map(p => [p.moduleId, p]))
        const chapterProgressMap = new Map(chapterProgress.map(p => [p.chapterId, p]))
        const contentProgressMap = new Map(contentProgress.map(p => [p.contentId, p]))
        const passedQuizChapterIds = new Set(quizResults.map(r => r.quiz?.chapterId).filter(Boolean))

        // Déterminer quels modules sont débloqués
        modulesWithProgress = modules.map((module, moduleIndex) => {
          const moduleProgressData = moduleProgressMap.get(module.id)
          const isFirstModule = moduleIndex === 0
          
          // Un module est débloqué si c'est le premier ou si le précédent est entièrement complété
          let isModuleUnlocked = isFirstModule
          if (!isFirstModule && moduleIndex > 0) {
            const previousModule = modules[moduleIndex - 1]
            const previousModuleProgress = moduleProgressMap.get(previousModule.id)
            isModuleUnlocked = previousModuleProgress?.isCompleted || false
          }

          // Calculer la progression des chapitres
          const chaptersWithProgress = (module.chapters || []).map((chapter, chapterIndex) => {
            const chapterProgressData = chapterProgressMap.get(chapter.id)
            const isFirstChapter = chapterIndex === 0
            
            // Un chapitre est débloqué si c'est le premier du module ET le module est débloqué
            // OU si le chapitre précédent est entièrement validé (contenu + QCM)
            let isChapterUnlocked = isFirstChapter && isModuleUnlocked
            if (!isFirstChapter && chapterIndex > 0 && module.chapters) {
              const previousChapter = module.chapters[chapterIndex - 1]
              const previousChapterProgress = chapterProgressMap.get(previousChapter.id)
              isChapterUnlocked = previousChapterProgress?.isCompleted || false
            }

            // Dans un chapitre, il n'y a qu'un seul contenu (vidéo OU audio)
            // Le contenu est débloqué si le chapitre est débloqué
            const contentsWithProgress = (chapter.contents || []).map((content) => {
              const contentProgressData = contentProgressMap.get(content.id)

              const progressPercentage = contentProgressData && content.duration > 0 
                ? Math.min(100, Math.round((contentProgressData.watchTime / content.duration) * 100))
                : 0

              return {
                ...content,
                isCompleted: contentProgressData?.isCompleted || false,
                isUnlocked: isChapterUnlocked,
                progress: progressPercentage,
                watchTime: contentProgressData?.watchTime || 0
              }
            })

            // Un chapitre est validé si son contenu est terminé ET le quiz est passé
            const allContentsCompleted = chapter.contents.length > 0 && 
              chapter.contents.every(content => contentProgressMap.get(content.id)?.isCompleted)
            
            // Vérifier si le quiz du chapitre est passé
            const quizPassed = chapter.quiz ? passedQuizChapterIds.has(chapter.id) : true
            
            // Le chapitre est validé seulement si le contenu est terminé ET le quiz passé
            const isChapterValidated = allContentsCompleted && quizPassed

            return {
              ...chapter,
              contents: contentsWithProgress,
              isCompleted: isChapterValidated,
              isUnlocked: isChapterUnlocked,
              allContentsCompleted,
              quizPassed,
              quiz: chapter.quiz ? {
                ...chapter.quiz,
                isPassed: quizPassed
              } : null
            }
          })

          // Un module est complété si tous ses chapitres sont validés
          const allChaptersCompleted = module.chapters.length > 0 && 
            chaptersWithProgress.every(chapter => chapter.isCompleted)

          // Calculer la progression globale du module (basée sur les chapitres validés)
          const totalChapters = module.chapters.length
          const completedChapters = chaptersWithProgress.filter(chapter => chapter.isCompleted).length
          
          const moduleProgressPercentage = totalChapters > 0 
            ? Math.round((completedChapters / totalChapters) * 100)
            : 0

          return {
            ...module,
            chapters: chaptersWithProgress,
            isCompleted: allChaptersCompleted,
            isUnlocked: isModuleUnlocked,
            progress: moduleProgressPercentage,
            allChaptersCompleted
          }
        })

      } catch (userError) {
        console.error('Erreur lors de la récupération des données utilisateur:', userError)
        // En cas d'erreur, on continue avec les modules de base
        modulesWithProgress = modules.map((module, moduleIndex) => ({
          ...module,
          chapters: (module.chapters || []).map((chapter, chapterIndex) => ({
            ...chapter,
            contents: (chapter.contents || []).map((content, contentIndex) => ({
              ...content,
              isCompleted: false,
              isUnlocked: moduleIndex === 0 && chapterIndex === 0 && contentIndex === 0,
              progress: 0,
              watchTime: 0
            })),
            isCompleted: false,
            isUnlocked: moduleIndex === 0 && chapterIndex === 0,
            allContentsCompleted: false,
            quizPassed: false,
            quiz: chapter.quiz ? {
              ...chapter.quiz,
              isPassed: false
            } : null
          })),
          isCompleted: false,
          isUnlocked: moduleIndex === 0,
          progress: 0,
          allChaptersCompleted: false
        }))
      }
    } else {
      // Pour les utilisateurs non connectés, aucun contenu n'est débloqué
      modulesWithProgress = modules.map((module, moduleIndex) => ({
        ...module,
        chapters: (module.chapters || []).map((chapter, chapterIndex) => ({
          ...chapter,
          contents: (chapter.contents || []).map((content, contentIndex) => ({
            ...content,
            isCompleted: false,
            isUnlocked: false, // Aucun contenu débloqué pour les non-connectés
            progress: 0,
            watchTime: 0
          })),
          isCompleted: false,
          isUnlocked: false,
          allContentsCompleted: false,
          quizPassed: false,
          quiz: chapter.quiz ? {
            ...chapter.quiz,
            isPassed: false
          } : null
        })),
        isCompleted: false,
        isUnlocked: false, // Aucun module débloqué pour les non-connectés
        progress: 0,
        allChaptersCompleted: false
      }))
    }

    return NextResponse.json({ 
      modules: modulesWithProgress,
      userStats,
      success: true
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error)
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      },
      { status: 500 }
    )
  }
}