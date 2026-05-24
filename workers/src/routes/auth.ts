import type { Env } from '../notion'

interface UserRecord {
  username: string
  passwordHash: string
  role: 'admin' | 'user'
}

interface SessionRecord {
  username: string
  role: 'admin' | 'user'
}

const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`em-ds:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function verifySession(req: Request, env: Env): Promise<SessionRecord | null> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  return env.AUTH_KV.get<SessionRecord>(`session:${token}`, 'json')
}

export async function handleAuth(req: Request, env: Env, subpath: string): Promise<Response> {
  if (subpath === '/login' && req.method === 'POST') {
    const body = await req.json<{ username: string; password: string }>()
    const user = await env.AUTH_KV.get<UserRecord>(`user:${body.username}`, 'json')
    if (!user) return json({ error: '帳號或密碼錯誤' }, 401)
    const hash = await hashPassword(body.password)
    if (hash !== user.passwordHash) return json({ error: '帳號或密碼錯誤' }, 401)
    const token = crypto.randomUUID()
    await env.AUTH_KV.put(
      `session:${token}`,
      JSON.stringify({ username: user.username, role: user.role }),
      { expirationTtl: SESSION_TTL },
    )
    return json({ token, username: user.username, role: user.role })
  }

  if (subpath === '/logout' && req.method === 'POST') {
    const auth = req.headers.get('Authorization')
    if (auth?.startsWith('Bearer ')) {
      await env.AUTH_KV.delete(`session:${auth.slice(7)}`)
    }
    return json({ ok: true })
  }

  if (subpath === '/me' && req.method === 'GET') {
    const session = await verifySession(req, env)
    if (!session) return json({ error: 'Unauthorized' }, 401)
    return json({ username: session.username, role: session.role })
  }

  // One-time admin seed — only works when no users exist yet
  if (subpath === '/init' && req.method === 'POST') {
    const existing = await env.AUTH_KV.list({ prefix: 'user:' })
    if (existing.keys.length > 0) return json({ error: 'Already initialized' }, 409)
    const body = await req.json<{ username: string; password: string }>()
    const passwordHash = await hashPassword(body.password)
    await env.AUTH_KV.put(
      `user:${body.username}`,
      JSON.stringify({ username: body.username, passwordHash, role: 'admin' }),
    )
    return json({ ok: true, username: body.username })
  }

  return json({ error: 'Not found' }, 404)
}

export async function handleUsers(req: Request, env: Env, subpath: string): Promise<Response> {
  const session = await verifySession(req, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)
  if (session.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  if (subpath === '/' && req.method === 'GET') {
    const list = await env.AUTH_KV.list({ prefix: 'user:' })
    const users = await Promise.all(list.keys.map(k => env.AUTH_KV.get<UserRecord>(k.name, 'json')))
    return json(
      users
        .filter(Boolean)
        .filter(u => u!.role !== 'admin')
        .map(u => ({ username: u!.username, role: u!.role })),
    )
  }

  if (subpath === '/' && req.method === 'POST') {
    const body = await req.json<{ username: string; password: string }>()
    const existing = await env.AUTH_KV.get(`user:${body.username}`)
    if (existing) return json({ error: '帳號已存在' }, 409)
    const passwordHash = await hashPassword(body.password)
    await env.AUTH_KV.put(
      `user:${body.username}`,
      JSON.stringify({ username: body.username, passwordHash, role: 'user' }),
    )
    return json({ ok: true })
  }

  const usernameMatch = subpath.match(/^\/(.+)$/)
  if (usernameMatch && req.method === 'DELETE') {
    const username = decodeURIComponent(usernameMatch[1])
    const user = await env.AUTH_KV.get<UserRecord>(`user:${username}`, 'json')
    if (!user) return json({ error: '使用者不存在' }, 404)
    if (user.role === 'admin') return json({ error: '不能刪除管理員' }, 403)
    await env.AUTH_KV.delete(`user:${username}`)
    return json({ ok: true })
  }

  return json({ error: 'Not found' }, 404)
}
