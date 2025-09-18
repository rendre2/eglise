import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Optionnel: logs légers
    // console.log('Proxy media request')

    // Récupérer l'URL depuis les paramètres de requête
    const { searchParams } = new URL(request.url)
    const mediaUrl = searchParams.get('url')
    
    if (!mediaUrl) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
    }

    // Décoder l'URL
    const decodedUrl = decodeURIComponent(mediaUrl)
    // console.log('Tentative de proxy pour URL:', decodedUrl)

    // Fonction pour essayer différentes variantes OneDrive
    const tryOneDriveVariants = async (originalUrl: string) => {
      const variants = [
        originalUrl,
        originalUrl + (originalUrl.includes('?') ? '&' : '?') + 'download=1',
        originalUrl.replace('1drv.ms', 'onedrive.live.com').replace('/v/', '/download/'),
        originalUrl.replace(/\?e=.*$/, '') + '?download=1'
      ]

      for (const variant of variants) {
        try {
          // console.log('Essai variant:', variant)
          
          const response = await fetch(variant, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'video/*,audio/*,*/*;q=0.8',
              'Accept-Encoding': 'identity',
              'Range': 'bytes=0-1023' // Tester avec un petit range d'abord
            },
            // Timeout de 10 secondes
            signal: AbortSignal.timeout(10000)
          })

          // console.log('Status pour', variant, ':', response.status)
          // console.log('Headers:', Object.fromEntries(response.headers.entries()))

          if (response.ok || response.status === 206) { // 206 = Partial Content (normal pour les ranges)
            return { success: true, response, url: variant }
          }
        } catch (error) {
          console.log('Erreur pour variant', variant, ':', error)
          continue
        }
      }

      return { success: false, response: null, url: null }
    }

    // Essayer de récupérer le fichier
    const result = await tryOneDriveVariants(decodedUrl)
    
    if (!result.success || !result.response) {
      return NextResponse.json({ 
        error: 'Média non accessible',
        message: 'Impossible d\'accéder au fichier OneDrive. Vérifiez les permissions de partage.',
        testedUrl: decodedUrl
      }, { status: 404 })
    }

    // Maintenant faire une vraie requête pour le contenu complet
    const clientRange = request.headers.get('range') || request.headers.get('Range')
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'video/*,audio/*,*/*;q=0.8',
      'Accept-Encoding': 'identity',
    }
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange
    }

    const fullResponse = await fetch(result.url!, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'follow'
    })

    if (!fullResponse.ok && fullResponse.status !== 206) {
      return NextResponse.json({ 
        error: 'Erreur lors du chargement',
        status: fullResponse.status
      }, { status: fullResponse.status })
    }

    // Préparer les headers pour la réponse
    const responseHeaders = new Headers()
    
    // Copier les headers importants
    const importantHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range', 'content-disposition', 'etag', 'last-modified']
    for (const header of importantHeaders) {
      const value = fullResponse.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    }

    // Headers CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    responseHeaders.set('Cache-Control', 'public, max-age=3600')

    // Retourner le stream (ou juste les headers pour HEAD)
    if (request.method === 'HEAD') {
      return new NextResponse(null, {
        status: fullResponse.status,
        headers: responseHeaders
      })
    }

    return new NextResponse(fullResponse.body, {
      status: fullResponse.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Erreur proxy média:', error)
    return NextResponse.json({ 
      error: 'Erreur interne',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}

// Gérer les requêtes OPTIONS pour CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  })
}