import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    // Vérifier que le chapitre existe et est actif
    const chapter = await prisma.chapter.findUnique({
      where: { id: params.id },
      include: { 
        module: {
          select: {
            id: true,
            title: true,
            order: true,
            isActive: true
          }
        },
        contents: {
          where: { isActive: true },
          select: { id: true, duration: true }
        },
        quiz: {
          select: {
            id: true,
            title: true,
            questions: true,
            passingScore: true,
            results: {
              where: { userId: session.user.id },
              select: { id: true, score: true, passed: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    if (!chapter || !chapter.module.isActive) {
      return NextResponse.json({ error: 'Chapitre non trouvé ou inactif' }, { status: 404 })
    }

    if (!chapter.quiz) {
      return NextResponse.json({ error: 'Aucun quiz disponible pour ce chapitre' }, { status: 404 })
    }

    // Vérifier que l'utilisateur a terminé TOUS les contenus du chapitre
    if (chapter.contents.length === 0) {
      return NextResponse.json({ error: 'Aucun contenu disponible dans ce chapitre' }, { status: 404 })
    }

    const completedContents = await prisma.contentProgress.findMany({
      where: { 
        userId: session.user.id,
        contentId: { in: chapter.contents.map(c => c.id) },
        isCompleted: true
      }
    })

    if (completedContents.length < chapter.contents.length) {
      return NextResponse.json({ 
        error: 'Vous devez d\'abord terminer tous les contenus du chapitre pour accéder au QCM',
        details: `${chapter.contents.length - completedContents.length} contenu(s) restant(s) à terminer`
      }, { status: 403 })
    }

    const quiz = chapter.quiz

    // Si l'utilisateur a déjà réussi le quiz
    if (quiz.results.length > 0 && quiz.results[0].passed) {
      // Parser les questions pour les inclure dans la réponse
      let parsedQuestions;
      try {
        parsedQuestions = typeof quiz.questions === 'string' 
          ? JSON.parse(quiz.questions) 
          : quiz.questions;
      } catch (error) {
        console.error('Erreur lors du parsing des questions:', error);
        return NextResponse.json({ error: 'Format de questions invalide' }, { status: 500 });
      }
      
      // Inclure les questions avec les bonnes réponses pour la révision
      const questionsForReview = parsedQuestions.map((q: any) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options || undefined,
        correctAnswer: q.correctAnswer // Inclure la bonne réponse pour révision
      }));
      
      return NextResponse.json({ 
        message: 'Quiz déjà complété avec succès',
        alreadyCompleted: true,
        result: {
          score: quiz.results[0].score,
          passed: quiz.results[0].passed,
          completedAt: quiz.results[0].createdAt
        },
        reviewMode: true,
        questions: questionsForReview,
        chapterInfo: {
          id: chapter.id,
          title: chapter.title
        },
        moduleInfo: {
          id: chapter.module.id,
          title: chapter.module.title,
          order: chapter.module.order
        },
        passingScore: quiz.passingScore,
        title: quiz.title || `Quiz - ${chapter.title}`
      }, { status: 200 })
    }

    // Parser les questions JSON
    let parsedQuestions
    try {
      // S'assurer que les questions sont correctement parsées
      if (typeof quiz.questions === 'string') {
        parsedQuestions = JSON.parse(quiz.questions)
      } else if (typeof quiz.questions === 'object') {
        // Si c'est déjà un objet, on l'utilise directement
        parsedQuestions = quiz.questions
      } else {
        throw new Error('Format de questions non reconnu')
      }
      
      // Log pour debug
      console.log('Questions parsées:', JSON.stringify(parsedQuestions).substring(0, 200))
    } catch (error) {
      console.error('Erreur lors du parsing des questions:', error)
      return NextResponse.json({ error: 'Format de questions invalide' }, { status: 500 })
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return NextResponse.json({ error: 'Aucune question disponible pour ce quiz' }, { status: 404 })
    }

    // Retourner le quiz sans les bonnes réponses pour la sécurité
    const questionsForUser = parsedQuestions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options || undefined
    }))

    const timeEstimate = Math.max(10, Math.ceil(parsedQuestions.length * 1.5)) // 1.5 min par question, minimum 10 min

    return NextResponse.json({
      id: quiz.id,
      chapterId: chapter.id,
      title: quiz.title || `Quiz - ${chapter.title}`,
      questions: questionsForUser,
      passingScore: quiz.passingScore,
      timeLimit: timeEstimate,
      totalQuestions: parsedQuestions.length,
      moduleInfo: {
        id: chapter.module.id,
        title: chapter.module.title,
        order: chapter.module.order
      },
      chapterInfo: {
        id: chapter.id,
        title: chapter.title
      },
      previousAttempt: quiz.results.length > 0 ? {
        score: quiz.results[0].score,
        passed: quiz.results[0].passed,
        attemptedAt: quiz.results[0].createdAt
      } : null,
      instructions: {
        passingScore: quiz.passingScore,
        timeLimit: timeEstimate,
        canRetry: true,
        totalQuestions: parsedQuestions.length
      }
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du quiz:', error)
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}