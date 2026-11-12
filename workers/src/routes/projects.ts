import { pageToProject, createProject, deleteProjectById, getProjectsWithStats, type Env } from '../notion'

export async function handleProjects(req: Request, env: Env, subpath: string): Promise<Response> {
  if (req.method === 'GET' && (subpath === '/' || subpath === '')) {
    const projects = await getProjectsWithStats(env)
    return json(projects)
  }

  if (req.method === 'POST' && (subpath === '/' || subpath === '')) {
    const body = await req.json() as { year: number; projectCode: string; projectName: string }
    if (!body.projectCode?.trim() || !body.projectName?.trim() || !body.year) {
      return json({ error: 'Missing required fields' }, 400)
    }
    const page = await createProject(env, body)
    return json(pageToProject(page), 201)
  }

  if (req.method === 'DELETE' && subpath.startsWith('/')) {
    const id = subpath.slice(1)
    if (!id) return json({ error: 'Missing project ID' }, 400)
    const url = new URL(req.url)
    const cascade = url.searchParams.get('cascade') === 'true'
    await deleteProjectById(env, id, cascade)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
