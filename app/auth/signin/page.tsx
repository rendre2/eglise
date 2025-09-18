'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, User } from 'lucide-react'
import { toast } from 'sonner'

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const verified = searchParams.get('verified')
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    
    if (verified === 'true') {
      toast.success('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.')
    } else if (verified === 'already') {
      toast.info('Votre email est déjà vérifié. Vous pouvez vous connecter.')
    }
    
    if (message === 'check_email') {
      toast.info('Vérifiez votre email pour activer votre compte avant de vous connecter.')
    }
    
    // Gestion des erreurs OAuth
    if (error === 'OAuthCallback' || error === 'OAuthCallbackError') {
      toast.error('Erreur de configuration OAuth. Contactez le support.')
    } else if (error === 'AccessDenied') {
      toast.error('Accès refusé lors de la connexion OAuth.')
    } else if (error === 'Configuration') {
      toast.error('Erreur de configuration. Contactez le support.')
    } else if (error === 'invalid_verification_link') {
      toast.error('Lien de vérification invalide')
    } else if (error === 'expired_verification_link') {
      toast.error('Lien de vérification expiré')
    } else if (error === 'verification_failed') {
      toast.error('Erreur lors de la vérification de l\'email')
    } else if (error === 'user_not_found') {
      toast.error('Utilisateur non trouvé')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        console.error('Erreur de connexion:', result.error)
        
        if (result.error === 'CredentialsSignin') {
          toast.error('Email ou mot de passe incorrect')
        } else if (result.error === 'email_not_verified') {
          toast.error('Veuillez vérifier votre email avant de vous connecter')
        } else {
          toast.error('Erreur de connexion')
        }
      } else if (result?.ok) {
        toast.success('Connexion réussie!')
        
        // Récupérer la session pour rediriger selon le rôle
        try {
          const session = await getSession()
          if (session?.user?.role === 'ADMIN') {
            router.push('/admin')
          } else {
            router.push('/modules')
          }
        } catch (sessionError) {
          console.error('Erreur récupération session:', sessionError)
          // Fallback
          router.push('/modules')
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      toast.error('Une erreur inattendue est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    
    try {
      const result = await signIn('google', { 
        callbackUrl: '/modules',
        redirect: false 
      })
      
      if (result?.error) {
        console.error('Erreur Google SignIn:', result.error)
        
        let errorMessage = 'Erreur lors de la connexion avec Google'
        
        switch (result.error) {
          case 'OAuthCallback':
          case 'OAuthCallbackError':
            errorMessage = 'Erreur de configuration OAuth. Contactez le support.'
            break
          case 'AccessDenied':
            errorMessage = 'Accès refusé. Veuillez autoriser l\'accès à votre compte Google.'
            break
          case 'Configuration':
            errorMessage = 'Configuration OAuth incorrecte. Contactez le support.'
            break
          case 'Verification':
            errorMessage = 'Erreur de vérification. Veuillez réessayer.'
            break
          default:
            errorMessage = `Erreur: ${result.error}`
        }
        
        toast.error(errorMessage)
      } else if (result?.ok) {
        toast.success('Connexion Google réussie!')
        
        // Vérifier la session après connexion réussie
        try {
          const session = await getSession()
          if (session?.user?.role === 'ADMIN') {
            router.push('/admin')
          } else {
            router.push('/modules')
          }
        } catch (sessionError) {
          console.error('Erreur récupération session Google:', sessionError)
          router.push('/modules')
        }
      } else {
        // Cas où result?.ok est undefined mais pas d'erreur
        try {
          // Attendre un peu pour que la session se mette à jour
          await new Promise(resolve => setTimeout(resolve, 1000))
          const session = await getSession()
          
          if (session?.user) {
            toast.success('Connexion Google réussie!')
            if (session.user.role === 'ADMIN') {
              router.push('/admin')
            } else {
              router.push('/modules')
            }
          } else {
            router.push('/modules')
          }
        } catch (error) {
          console.error('Erreur session après Google:', error)
          router.push('/modules')
        }
      }
    } catch (error) {
      console.error('Erreur Google Sign-In:', error)
      toast.error('Erreur inattendue lors de la connexion Google')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-blue-600 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-blue-900">Connexion</CardTitle>
        <CardDescription className="text-gray-600">
          Connectez-vous pour accéder à vos modules de formation
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Google Sign In Button - Moved to top */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full transition-colors"
          disabled={isLoading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? 'Connexion...' : 'Continuer avec Google'}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Ou se connecter avec email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-600">Pas encore de compte ? </span>
          <Link
            href="/auth/signup"
            className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            S'inscrire
          </Link>
        </div>

        <div className="text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-orange-600 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-32 mx-auto" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-64 mx-auto" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-orange-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil 
        </Link>

        <Suspense fallback={<LoadingSkeleton />}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}