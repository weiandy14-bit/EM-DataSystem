import { queryDatabase, getPage, pageToMaterial, type Env } from '../notion'

export async function handleMaterials(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url)
  const id = path.replace('/api/materials', '').replace(/^\//, '')

  if (id) {
    try {
      const page = await getPage(env, id)
      return json(pageToMaterial(page))
    } catch {
      return json(null, 404)
    }
  }

  const filters: any[] = []
  const type = url.searchParams.get('type')
  const keyword = url.searchParams.get('keyword')

  if (type) filters.push({ property: 'Type', select: { equals: type } })
  if (keyword) filters.push({
    or: [
      { property: 'Name', title: { contains: keyword } },
      { property: 'Supplier', rich_text: { contains: keyword } },
    ]
  })

  const filter = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters }

  const pages = await queryDatabase(env, env.NOTION_DB_MATERIALS, filter, [
    { property: 'Name', direction: 'ascending' }
  ])

  return json(pages.map(pageToMaterial))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
