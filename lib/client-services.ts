/**
 * Services client pour interagir avec les API depuis le frontend
 */
import { QuizData, QuizSubmitResponse } from '@/types/quiz';

/**
 * Service pour les quiz
 */
export class QuizService {
  /**
   * Récupère les données d'un quiz
   * @param chapterId ID du chapitre
   * @returns Données du quiz
   */
  static async getQuiz(chapterId: string): Promise<QuizData> {
    const response = await fetch(`/api/quiz/${chapterId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la récupération du quiz');
    }
    
    return response.json();
  }

  /**
   * Soumet les réponses d'un quiz
   * @param quizId ID du quiz
   * @param answers Réponses de l'utilisateur
   * @returns Résultat de la soumission
   */
  static async submitQuiz(quizId: string, answers: Record<string, number | boolean>): Promise<QuizSubmitResponse> {
    const response = await fetch(`/api/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la soumission du quiz');
    }
    
    return response.json();
  }
}

/**
 * Service pour les modules
 */
export class ModuleClient {
  /**
   * Récupère tous les modules avec leur progression
   * @returns Modules avec progression
   */
  static async getModules() {
    const response = await fetch('/api/modules');
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Cas spécial: email non vérifié
      if (errorData.emailNotVerified) {
        throw new Error('Veuillez vérifier votre email avant d\'accéder aux modules');
      }
      
      throw new Error(errorData.error || 'Erreur lors de la récupération des modules');
    }
    
    return response.json();
  }
}

/**
 * Service pour la progression des contenus
 */
export class ContentProgressClient {
  /**
   * Met à jour la progression d'un contenu
   * @param contentId ID du contenu
   * @param watchTime Temps de visionnage en secondes
   * @param duration Durée totale du contenu
   * @returns Progression mise à jour
   */
  static async updateProgress(contentId: string, watchTime: number, duration: number) {
    const response = await fetch(`/api/content-progress/${contentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchTime, duration })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la mise à jour de la progression');
    }
    
    return response.json();
  }
}
