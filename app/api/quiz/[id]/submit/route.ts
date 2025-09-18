import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { progressService } from '@/lib/progress-service';
import { QuizSubmitResponse } from '@/types/quiz';

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

    try {
      // Utiliser le service centralisé pour soumettre le quiz
      const result: QuizSubmitResponse = await progressService.submitQuiz(
        session.user.id,
        params.id,
        answers
      );

      return NextResponse.json(result);
    } catch (serviceError) {
      // Gérer les erreurs spécifiques du service
      const errorMessage = serviceError instanceof Error ? serviceError.message : 'Erreur lors de la soumission du quiz';
      
      if (errorMessage.includes('déjà réussi')) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      
      if (errorMessage.includes('non trouvé')) {
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
      
      throw serviceError; // Relancer l'erreur pour la gestion globale
    }
  } catch (error) {
    console.error('Erreur lors de la soumission du quiz:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}