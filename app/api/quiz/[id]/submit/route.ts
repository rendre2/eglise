import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

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

    // Utiliser une transaction pour garantir l'atomicité des opérations
    const quizResult = await prisma.$transaction(async (tx) => {
      // Supprimer l'ancien résultat s'il existe (pour permettre les tentatives multiples jusqu'à réussite)
      await tx.quizResult.deleteMany({
        where: {
          userId: session.user.id,
          quizId: params.id
        }
      });

      // Créer le nouveau résultat
      const result = await tx.quizResult.create({
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
        await tx.chapterProgress.upsert({
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
        
        // Vérifier si tous les chapitres du module sont complétés
        const chapter = await tx.chapter.findUnique({
          where: { id: quiz.chapterId },
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

        if (chapter) {
          const moduleChapterIds = chapter.module.chapters.map(c => c.id);
          
          const completedChapters = await tx.chapterProgress.count({
            where: {
              userId: session.user.id,
              chapterId: { in: moduleChapterIds },
              isCompleted: true
            }
          });

          // Si tous les chapitres sont complétés, marquer le module comme terminé
          if (completedChapters === moduleChapterIds.length) {
            await tx.moduleProgress.upsert({
              where: {
                userId_moduleId: {
                  userId: session.user.id,
                  moduleId: chapter.moduleId
                }
              },
              update: {
                isCompleted: true,
                completedAt: new Date()
              },
              create: {
                userId: session.user.id,
                moduleId: chapter.moduleId,
                isCompleted: true,
                completedAt: new Date()
              }
            });

            // Créer une notification de félicitations
            await tx.notification.create({
              data: {
                userId: session.user.id,
                title: 'Module complété !',
                content: 'Félicitations ! Vous avez terminé un module complet. Le module suivant est maintenant débloqué.',
                type: 'SUCCESS'
              }
            });
          }
        }
      }
      
      return result;
    });
    

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

// La fonction checkAndUpdateModuleProgress a été intégrée dans la transaction