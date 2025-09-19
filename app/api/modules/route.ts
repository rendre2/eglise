export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { moduleService } from '@/lib/module-service'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Si l'utilisateur n'est pas connecté, retourner des modules vides
    if (!session?.user?.id) {
      // Récupérer uniquement les modules publics sans progression
      const { modules } = await moduleService.getModulesWithProgress(undefined)
      return NextResponse.json({ 
        modules,
        success: true
      })
    }
    
    // Utiliser le service centralisé pour récupérer les modules avec progression
    const { modules, userStats } = await moduleService.getModulesWithProgress(
      session.user.id
    )

    // Vérifier si l'email n'est pas vérifié (géré par le service)
    if (!userStats) {
      return NextResponse.json({
        error: 'Email non vérifié',
        message: 'Veuillez vérifier votre email avant d\'accéder aux modules',
        emailNotVerified: true,
        modules, // Retourner quand même les modules pour l'affichage
        success: false
      }, { status: 403 })
    }

    return NextResponse.json({ 
      modules,
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