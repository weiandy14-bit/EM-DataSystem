import { type Env } from './notion'
import { handleEquipment } from './routes/equipment'
import { handleMaterials } from './routes/materials'
import { handleSpecs } from './routes/specs'
import { handlePricing } from './routes/pricing'
import { handleInspection } from './routes/inspection'
import { handleAuth, handleUsers, verifySession } from './routes/auth'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(req.url)
    const path = url.pathname

    const addCors = (res: Response) => {
      const headers = new Headers(res.headers)
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v))
      return new Response(res.body, { status: res.status, headers })
    }

    try {
      let res: Response

      if (path.startsWith('/api/auth')) {
        const subpath = path.replace('/api/auth', '') || '/'
        res = await handleAuth(req, env, subpath)
      } else if (path.startsWith('/api/users')) {
        const subpath = path.replace('/api/users', '') || '/'
        res = await handleUsers(req, env, subpath)
      } else {
        // All other /api/* routes require a valid session
        const session = await verifySession(req, env)
        if (!session) {
          res = new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
          return addCors(res)
        }

        if (path.startsWith('/api/equipment')) {
          res = await handleEquipment(req, env, path)
        } else if (path.startsWith('/api/materials')) {
          res = await handleMaterials(req, env, path)
        } else if (path.startsWith('/api/specs')) {
          res = await handleSpecs(req, env)
        } else if (path.startsWith('/api/pricing')) {
          const subpath = path.replace('/api/pricing', '') || '/'
          res = await handlePricing(req, env, subpath)
        } else if (path.startsWith('/api/inspection')) {
          const subpath = path.replace('/api/inspection', '') || '/'
          res = await handleInspection(req, env, subpath)
        } else {
          res = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        }
      }

      return addCors(res)
    } catch (err) {
      console.error(err)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }
  },
}
