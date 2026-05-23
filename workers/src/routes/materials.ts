import { queryDatabase, pageToMaterial, type Env } from '../notion'

export async function handleMaterials(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url)
  const id = path.replace('/api/materials', '').replace(/^\//, '')

  if (id) {
    const pages = await queryDatabase(env, env.NOTION_DB_MATERIALS, {
      property: 'ID',
      rich_text: { equals: id },
    })
    if (!pages.length) return json(null, 404)
    return json(pageToMaterial(pages[0]))
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
