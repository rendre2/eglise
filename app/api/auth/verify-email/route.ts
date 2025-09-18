import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const rawEmail = searchParams.get('email')
    const email = rawEmail ? rawEmail.toLowerCase().trim() : null

    console.log('Tentative de vérification email:', { token, email })
    if (!token || !email) {
      console.log('Token ou email manquant')
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_verification_link', request.url))
    }

    // Vérifier si le token existe et n'est pas expiré
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token,
        expires: {
          gt: new Date()
        }
      }
    })

    console.log('Token trouvé:', !!verificationToken)
    if (!verificationToken) {
      console.log('Token invalide ou expiré')
      return NextResponse.redirect(new URL('/auth/signin?error=expired_verification_link', request.url))
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email! }
    })

    if (!existingUser) {
      console.log('Utilisateur non trouvé')
      return NextResponse.redirect(new URL('/auth/signin?error=user_not_found', request.url))
    }

    // Vérifier si l'email n'est pas déjà vérifié
    if (existingUser.emailVerified) {
      console.log('Email déjà vérifié')
      return NextResponse.redirect(new URL('/auth/signin?verified=already', request.url))
    }
    // Vérifier l'email de l'utilisateur
    const user = await prisma.user.update({
      where: { email: email! },
      data: { 
        emailVerified: new Date()
      }
    })

    console.log('Email vérifié pour:', user.email)
    // Supprimer le token utilisé
    await prisma.verificationToken.delete({
      where: {
        token: token
      }
    })
    console.log('Token supprimé')
    // Envoyer l'email de bienvenue
    try {
      await sendWelcomeEmail(user.email, `${user.prenom} ${user.nom}`)
      console.log('Email de bienvenue envoyé')
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', emailError)
    }

    // Rediriger vers les modules avec un message de bienvenue
    return NextResponse.redirect(new URL('/modules?welcome=1', request.url))
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'email:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url))
  }
}