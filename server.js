const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

// Configuration pour production
const dev = false
const hostname = '0.0.0.0'
const port = process.env.PORT || 3000

console.log('🚀 Démarrage Eglise Éveil Chrétien')
console.log('📍 Mode:', dev ? 'développement' : 'production')
console.log('🌐 Port:', port)

// Initialiser Next.js avec la configuration de votre next.config.js
const app = next({ 
  dev,
  hostname,
  port,
  dir: '.',
  conf: {
    trailingSlash: true,
    compress: false,
    images: {
      unoptimized: true
    },
    optimizeFonts: false,
    experimental: {
      esmExternals: false
    }
  }
})

const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('✅ Next.js initialisé')
  
  const server = createServer(async (req, res) => {
    try {
      // Gestion CORS
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
      res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      // Parser l'URL
      const parsedUrl = parse(req.url, true)
      
      // Laisser Next.js gérer la requête
      await handle(req, res, parsedUrl)
      
    } catch (err) {
      console.error('❌ Erreur serveur:', err)
      res.statusCode = 500
      res.end('Erreur interne du serveur')
    }
  })

  server.once('error', (err) => {
    console.error('💥 Erreur critique:', err)
    process.exit(1)
  })

  server.listen(port, hostname, () => {
    console.log('')
    console.log('🎉 SERVEUR PRÊT !')
    console.log('=' .repeat(50))
    console.log(`🔗 Local: http://${hostname}:${port}`)
    console.log(`🌍 Public: https://eveil-chretien.com`)
    console.log(`📅 Démarré: ${new Date().toLocaleString('fr-FR')}`)
    console.log('=' .repeat(50))
  })
})
.catch(err => {
  console.error('💥 Erreur lors du démarrage:', err)
  process.exit(1)
})

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('📴 Arrêt du serveur...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📴 Arrêt du serveur...')
  process.exit(0)
})
