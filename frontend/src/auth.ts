export type Role = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: Role
}

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'
// VITE_API_BASE includes /api suffix, e.g. https://em-datasystem-api.xxx.workers.dev/api
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

const TOKEN_KEY = 'em_auth_token'
const CURRENT_KEY = 'em_current_user'

// ---- mock (dev) helpers ----

interface StoredUser {
  username: string
  password: string
  role: Role
}

const MOCK_USERS_KEY = 'em_users'
const defaultAdmin: StoredUser = { username: '管理員', password: '1015', role: 'admin' }

function getMockUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY)
    const users: StoredUser[] = raw ? JSON.parse(raw) : []
    if (!users.find(u => u.username === defaultAdmin.username)) users.unshift(defaultAdmin)
    return users
  } catch {
    return [defaultAdmin]
  }
}

function saveMockUsers(users: StoredUser[]) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

// ---- production helpers ----

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = getToken()
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
}

// ---- public API ----

export async function login(username: string, password: string): Promise<AuthUser | null> {
  if (USE_MOCK) {
    const user = getMockUsers().find(u => u.username === username && u.password === password)
    if (!user) return null
    const authUser: AuthUser = { username: user.username, role: user.role }
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify(authUser))
    return authUser
  }
  try {
    const res = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string; username: string; role: Role }
    sessionStorage.setItem(TOKEN_KEY, data.token)
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify({ username: data.username, role: data.role }))
    return { username: data.username, role: data.role }
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    sessionStorage.removeItem(CURRENT_KEY)
    return
  }
  try {
    await authFetch('/auth/logout', { method: 'POST' })
  } catch { /* ignore */ }
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(CURRENT_KEY)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (USE_MOCK) {
    try {
      const raw = sessionStorage.getItem(CURRENT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const token = getToken()
  const cached = sessionStorage.getItem(CURRENT_KEY)
  if (!token) return null
  try {
    const res = await authFetch('/auth/me')
    if (!res.ok) {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(CURRENT_KEY)
      return null
    }
    const data = await res.json() as AuthUser
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify(data))
    return data
  } catch {
    // Network error: use locally cached user if available
    return cached ? JSON.parse(cached) : null
  }
}

export async function listUsers(): Promise<AuthUser[]> {
  if (USE_MOCK) {
    return getMockUsers()
      .filter(u => u.role !== 'admin')
      .map(({ username, role }) => ({ username, role }))
  }
  try {
    const res = await authFetch('/users')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function addUser(username: string, password: string): Promise<boolean> {
  if (USE_MOCK) {
    const users = getMockUsers()
    if (users.find(u => u.username === username)) return false
    users.push({ username, password, role: 'user' })
    saveMockUsers(users)
    return true
  }
  try {
    const res = await authFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function removeUser(username: string): Promise<void> {
  if (USE_MOCK) {
    const users = getMockUsers().filter(u => u.username !== username || u.role === 'admin')
    saveMockUsers(users)
    return
  }
  try {
    await authFetch(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' })
  } catch { /* ignore */ }
}
