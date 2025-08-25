import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { answers } = body;

    // Validation des réponses
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Réponses manquantes ou invalides' }, { status: 400 });
    }

    // CORRECTION : params.id est maintenant le quizId directement
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        chapterId: true,
        title: true,
        questions: true, 
        passingScore: true,
        results: {
          where: { userId: session.user.id },
          select: { id: true, passed: true }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà réussi ce quiz
    const hasPassedBefore = quiz.results.some(result => result.passed);
    if (hasPassedBefore) {
      return NextResponse.json({ 
        error: 'Quiz déjà réussi, impossible de le refaire' 
      }, { status: 400 });
    }

    // Parser les questions
    let parsedQuestions;
    try {
      parsedQuestions = typeof quiz.questions === 'string' 
        ? JSON.parse(quiz.questions) 
        : quiz.questions;
    } catch (error) {
      return NextResponse.json({ error: 'Format de questions invalide' }, { status: 500 });
    }

    // Calculer le score côté serveur
    let correctAnswers = 0;
    const results = parsedQuestions.map((question: any) => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer;
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctAnswers++;
      
      return {
        questionId: question.id,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        explanation: question.explanation
      };
    });

    const totalQuestions = parsedQuestions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    // Supprimer l'ancien résultat s'il existe (pour permettre les tentatives multiples jusqu'à réussite)
    await prisma.quizResult.deleteMany({
      where: {
        userId: session.user.id,
        quizId: params.id
      }
    });

    // Créer le nouveau résultat
    const quizResult = await prisma.quizResult.create({
      data: {
        userId: session.user.id,
        quizId: params.id,
        score: score,
        answers: answers,
        passed: passed,
      },
    });

    // Si réussi, mettre à jour la progression du chapitre
    if (passed) {
      // Marquer le chapitre comme complété (contenu + QCM réussi)
      const chapterProgress = await prisma.chapterProgress.upsert({
        where: {
          userId_chapterId: {
            userId: session.user.id,
            chapterId: quiz.chapterId
          }
        },
        update: {
          isCompleted: true,
          completedAt: new Date()
        },
        create: {
          userId: session.user.id,
          chapterId: quiz.chapterId,
          isCompleted: true,
          completedAt: new Date()
        }
      });
      
      // Vérifier si le module est maintenant complété
      await checkAndUpdateModuleProgress(session.user.id, quiz.chapterId);
    }

    return NextResponse.json({
      success: true,
      score: score,
      passed: passed,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      results: results,
      message: passed ? 'Quiz réussi !' : `Score insuffisant (${score}%). Minimum requis : ${quiz.passingScore}%`
    });

  } catch (error) {
    console.error('Erreur lors de la soumission du quiz:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Fonction pour vérifier et mettre à jour la progression du module
async function checkAndUpdateModuleProgress(userId: string, chapterId: string) {
  try {
    // Récupérer le module du chapitre
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { 
        moduleId: true,
        module: {
          select: {
            chapters: {
              where: { isActive: true },
              select: { id: true }
            }
          }
        }
      }
    });

    if (!chapter) return;

    // Vérifier que tous les chapitres du module sont complétés
    const moduleChapterIds = chapter.module.chapters.map(c => c.id);
    
    const completedChapters = await prisma.chapterProgress.count({
      where: {
        userId,
        chapterId: { in: moduleChapterIds },
        isCompleted: true
      }
    });

    // Si tous les chapitres sont complétés, marquer le module comme terminé
    if (completedChapters === moduleChapterIds.length) {
      await prisma.moduleProgress.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: chapter.moduleId
          }
        },
        update: {
          isCompleted: true,
          completedAt: new Date()
        },
        create: {
          userId,
          moduleId: chapter.moduleId,
          isCompleted: true,
          completedAt: new Date()
        }
      });

      // Créer une notification de félicitations
      await prisma.notification.create({
        data: {
          userId,
          title: 'Module complété !',
          content: 'Félicitations ! Vous avez terminé un module complet. Le module suivant est maintenant débloqué.',
          type: 'SUCCESS'
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression du module:', error);
  }
}