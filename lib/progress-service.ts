import { prisma } from './prisma';
import { PrismaClient, Prisma } from '@prisma/client';
import { Cache } from './cache';
import { QuizQuestion, QuizSubmissionResult, QuizSubmitResponse } from '@/types/quiz';

// Types pour les transactions
type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Service centralisé pour gérer la progression des utilisateurs
 */
export class ProgressService {
  private static instance: ProgressService;
  private contentProgressCache = new Cache<any>();
  private chapterProgressCache = new Cache<any>();
  private moduleProgressCache = new Cache<any>();
  
  // Seuil de complétion unifié à 95%
  private readonly COMPLETION_THRESHOLD = 0.95;

  private constructor() {}

  public static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  /**
   * Met à jour la progression d'un contenu
   */
  public async updateContentProgress(
    userId: string,
    contentId: string,
    watchTime: number,
    contentDuration: number
  ): Promise<any> {
    const cacheKey = `content_progress_${userId}_${contentId}`;
    
    try {
      // Calculer si le contenu est complété (95% du temps de visionnage)
      const isCompleted = watchTime >= contentDuration * this.COMPLETION_THRESHOLD;
      
      // Utiliser une transaction pour garantir l'atomicité
      const result = await prisma.$transaction(async (tx) => {
        // Mettre à jour la progression du contenu
        const contentProgress = await tx.contentProgress.upsert({
          where: {
            userId_contentId: {
              userId,
              contentId
            }
          },
          update: {
            watchTime,
            isCompleted,
            ...(isCompleted && { completedAt: new Date() })
          },
          create: {
            userId,
            contentId,
            watchTime,
            isCompleted,
            ...(isCompleted && { completedAt: new Date() })
          },
          include: {
            content: {
              select: {
                chapterId: true,
                duration: true
              }
            }
          }
        });

        // Si le contenu est marqué comme complété, vérifier la progression du chapitre
        if (isCompleted) {
          await this.checkAndUpdateChapterProgress(tx, userId, contentProgress.content.chapterId);
        }

        return contentProgress;
      });

      // Mettre à jour le cache
      this.contentProgressCache.set(cacheKey, result);
      
      // Invalider les caches potentiellement affectés
      this.invalidateRelatedCaches(userId);
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la progression du contenu:', error);
      throw error;
    }
  }

  /**
   * Vérifie et met à jour la progression d'un chapitre
   */
  public async checkAndUpdateChapterProgress(
    tx: TransactionClient,
    userId: string,
    chapterId: string
  ): Promise<void> {
    try {
      // Récupérer tous les contenus du chapitre
      const chapterContents = await tx.content.findMany({
        where: { 
          chapterId,
          isActive: true 
        },
        select: { id: true }
      });

      // Récupérer la progression des contenus
      const contentProgressList = await tx.contentProgress.findMany({
        where: {
          userId,
          contentId: { in: chapterContents.map(c => c.id) }
        }
      });

      // Vérifier si tous les contenus sont complétés
      const allContentsCompleted = chapterContents.length > 0 && 
        chapterContents.every(content => 
          contentProgressList.some(progress => 
            progress.contentId === content.id && progress.isCompleted
          )
        );

      // Vérifier si le quiz du chapitre est réussi
      const chapterQuiz = await tx.quiz.findUnique({
        where: { chapterId },
        include: {
          results: {
            where: {
              userId,
              passed: true
            }
          }
        }
      });

      const quizPassed = chapterQuiz?.results.length ? chapterQuiz.results.some(r => r.passed) : true;
      
      // Un chapitre est complété si tous les contenus sont terminés ET le quiz est réussi (s'il existe)
      const isChapterCompleted = allContentsCompleted && quizPassed;

      if (isChapterCompleted) {
        // Mettre à jour la progression du chapitre
        await tx.chapterProgress.upsert({
          where: {
            userId_chapterId: {
              userId,
              chapterId
            }
          },
          update: {
            isCompleted: true,
            completedAt: new Date()
          },
          create: {
            userId,
            chapterId,
            isCompleted: true,
            completedAt: new Date()
          }
        });

        // Récupérer le moduleId du chapitre
        const chapter = await tx.chapter.findUnique({
          where: { id: chapterId },
          select: { moduleId: true }
        });

        if (chapter) {
          // Vérifier et mettre à jour la progression du module
          await this.checkAndUpdateModuleProgress(tx, userId, chapter.moduleId);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la progression du chapitre:', error);
      throw error;
    }
  }

  /**
   * Vérifie et met à jour la progression d'un module
   */
  public async checkAndUpdateModuleProgress(
    tx: TransactionClient,
    userId: string,
    moduleId: string
  ): Promise<void> {
    try {
      // Récupérer tous les chapitres du module
      const moduleChapters = await tx.chapter.findMany({
        where: { 
          moduleId,
          isActive: true 
        },
        select: { id: true }
      });

      // Récupérer la progression des chapitres
      const chapterProgressList = await tx.chapterProgress.findMany({
        where: {
          userId,
          chapterId: { in: moduleChapters.map(c => c.id) }
        }
      });

      // Vérifier si tous les chapitres sont complétés
      const allChaptersCompleted = moduleChapters.length > 0 && 
        moduleChapters.every(chapter => 
          chapterProgressList.some(progress => 
            progress.chapterId === chapter.id && progress.isCompleted
          )
        );

      if (allChaptersCompleted) {
        // Mettre à jour la progression du module
        await tx.moduleProgress.upsert({
          where: {
            userId_moduleId: {
              userId,
              moduleId
            }
          },
          update: {
            isCompleted: true,
            completedAt: new Date()
          },
          create: {
            userId,
            moduleId,
            isCompleted: true,
            completedAt: new Date()
          }
        });

        // Créer une notification de félicitations
        await tx.notification.create({
          data: {
            userId,
            title: 'Module complété !',
            content: 'Félicitations ! Vous avez terminé un module complet. Le module suivant est maintenant débloqué.',
            type: 'SUCCESS'
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la progression du module:', error);
      throw error;
    }
  }

  /**
   * Soumet un quiz et met à jour la progression
   */
  public async submitQuiz(
    userId: string,
    quizId: string,
    answers: Record<string, number | boolean>
  ): Promise<{
    success: boolean;
    score: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    results: QuizSubmissionResult[];
    message: string;
  }> {
    try {
      // Récupérer le quiz
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { 
          id: true, 
          chapterId: true,
          title: true,
          questions: true, 
          passingScore: true,
          results: {
            where: { userId, passed: true },
            select: { id: true }
          }
        }
      });

      if (!quiz) {
        throw new Error('Quiz non trouvé');
      }

      // Vérifier si l'utilisateur a déjà réussi ce quiz
      const hasPassedBefore = quiz.results.length > 0;
      if (hasPassedBefore) {
        throw new Error('Quiz déjà réussi, impossible de le refaire');
      }

      // Parser les questions
      let parsedQuestions: QuizQuestion[];
      try {
        parsedQuestions = typeof quiz.questions === 'string' 
          ? JSON.parse(quiz.questions) 
          : quiz.questions as unknown as QuizQuestion[];
      } catch (error) {
        throw new Error('Format de questions invalide');
      }

      // Calculer le score
      let correctAnswers = 0;
      const results = parsedQuestions.map((question) => {
        const userAnswer = answers[question.id];
        const correctAnswer = question.correctAnswer;
        const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) correctAnswers++;
        
        return {
          questionId: question.id,
          userAnswer,
          correctAnswer,
          isCorrect,
          explanation: question.explanation
        };
      });

      const totalQuestions = parsedQuestions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const passed = score >= quiz.passingScore;

      // Utiliser une transaction pour garantir l'atomicité
      await prisma.$transaction(async (tx) => {
        // Utiliser upsert au lieu de delete/create
        await tx.quizResult.upsert({
          where: {
            userId_quizId: {
              userId,
              quizId
            }
          },
          update: {
            score,
            answers,
            passed,
          },
          create: {
            userId,
            quizId,
            score,
            answers,
            passed,
          }
        });

        // Si réussi, mettre à jour la progression du chapitre
        if (passed) {
          // Vérifier et mettre à jour la progression du chapitre
          await this.checkAndUpdateChapterProgress(tx, userId, quiz.chapterId);
        }
      });

      // Invalider les caches potentiellement affectés
      this.invalidateRelatedCaches(userId);

      return {
        success: true,
        score,
        passed,
        correctAnswers,
        totalQuestions,
        results,
        message: passed 
          ? 'Quiz réussi !' 
          : `Score insuffisant (${score}%). Minimum requis : ${quiz.passingScore}%`
      };
    } catch (error) {
      console.error('Erreur lors de la soumission du quiz:', error);
      throw error;
    }
  }

  /**
   * Récupère la progression d'un utilisateur pour un module
   */
  public async getUserModuleProgress(userId: string, moduleId: string): Promise<any> {
    const cacheKey = `module_progress_${userId}_${moduleId}`;
    const cached = this.moduleProgressCache.get(cacheKey);
    
    if (cached) return cached;
    
    try {
      const progress = await prisma.moduleProgress.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId
          }
        }
      });
      
      this.moduleProgressCache.set(cacheKey, progress);
      return progress;
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression du module:', error);
      throw error;
    }
  }

  /**
   * Récupère la progression d'un utilisateur pour un chapitre
   */
  public async getUserChapterProgress(userId: string, chapterId: string): Promise<any> {
    const cacheKey = `chapter_progress_${userId}_${chapterId}`;
    const cached = this.chapterProgressCache.get(cacheKey);
    
    if (cached) return cached;
    
    try {
      const progress = await prisma.chapterProgress.findUnique({
        where: {
          userId_chapterId: {
            userId,
            chapterId
          }
        }
      });
      
      this.chapterProgressCache.set(cacheKey, progress);
      return progress;
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression du chapitre:', error);
      throw error;
    }
  }

  /**
   * Récupère la progression d'un utilisateur pour un contenu
   */
  public async getUserContentProgress(userId: string, contentId: string): Promise<any> {
    const cacheKey = `content_progress_${userId}_${contentId}`;
    const cached = this.contentProgressCache.get(cacheKey);
    
    if (cached) return cached;
    
    try {
      const progress = await prisma.contentProgress.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId
          }
        }
      });
      
      this.contentProgressCache.set(cacheKey, progress);
      return progress;
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression du contenu:', error);
      throw error;
    }
  }

  /**
   * Invalide les caches liés à un utilisateur
   */
  private invalidateRelatedCaches(userId: string): void {
    const userPattern = new RegExp(`_${userId}_`);
    this.contentProgressCache.invalidatePattern(userPattern);
    this.chapterProgressCache.invalidatePattern(userPattern);
    this.moduleProgressCache.invalidatePattern(userPattern);
  }
}

// Exporter une instance singleton
export const progressService = ProgressService.getInstance();
