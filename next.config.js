/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour cPanel - pas de standalone
  trailingSlash: true,
  
  // Désactiver la compression pour éviter les erreurs sur cPanel
  compress: false,
  
  // Configuration des images pour les hébergements partagés
  images: {
    unoptimized: true
  },
  
  // Configurer les routes statiques
  async generateBuildId() {
    return 'eglise-build'
  },
  
  // Variables d'environnement par défaut pour le build
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://eveil-chretien.com',
    APP_URL: process.env.APP_URL || 'https://eveil-chretien.com',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2Mjg3Y2E3YjAtZWIyMi00Y2I4',
  },
  
  // Désactiver l'optimisation des polices
  optimizeFonts: false,
  
  // Configuration pour éviter les erreurs de build sur l'hébergement partagé
  experimental: {
    esmExternals: false
  }
}

module.exports = nextConfig