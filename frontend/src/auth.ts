export type Role = 'admin' | 'user'

export interface AuthUser {
  username: string
  role: Role
}

interface StoredUser {
  username: string
  password: string
  role: Role
}

const CURRENT_KEY = 'em_current_user'
const USERS_KEY = 'em_users'

const defaultAdmin: StoredUser = { username: '管理員', password: '1015', role: 'admin' }

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const users: StoredUser[] = raw ? JSON.parse(raw) : []
    if (!users.find(u => u.username === defaultAdmin.username)) {
      users.unshift(defaultAdmin)
    }
    return users
  } catch {
    return [defaultAdmin]
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function login(username: string, password: string): AuthUser | null {
  const user = getStoredUsers().find(u => u.username === username && u.password === password)
  if (!user) return null
  const authUser: AuthUser = { username: user.username, role: user.role }
  sessionStorage.setItem(CURRENT_KEY, JSON.stringify(authUser))
  return authUser
}

export function logout() {
  sessionStorage.removeItem(CURRENT_KEY)
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(CURRENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function listUsers(): AuthUser[] {
  return getStoredUsers()
    .filter(u => u.role !== 'admin')
    .map(({ username, role }) => ({ username, role }))
}

export function addUser(username: string, password: string): boolean {
  const users = getStoredUsers()
  if (users.find(u => u.username === username)) return false
  users.push({ username, password, role: 'user' })
  saveStoredUsers(users)
  return true
}

export function removeUser(username: string) {
  const users = getStoredUsers().filter(u => u.username !== username || u.role === 'admin')
  saveStoredUsers(users)
}
