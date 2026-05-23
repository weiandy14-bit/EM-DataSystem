import { queryDatabase, getPage, pageToEquipment, type Env } from '../notion'

export async function handleEquipment(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url)
  const id = path.replace('/api/equipment', '').replace(/^\//, '')

  if (id) {
    // GET /api/equipment/:id — id is the Notion page UUID
    try {
      const page = await getPage(env, id)
      return json(pageToEquipment(page))
    } catch {
      return json(null, 404)
    }
  }

  // GET /api/equipment?type=&status=&keyword=&buildingCategories=&yearStart=&yearEnd=
  const filters: any[] = []
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const keyword = url.searchParams.get('keyword')
  const buildingCategories = url.searchParams.getAll('buildingCategories')
  const yearStart = url.searchParams.get('yearStart')
  const yearEnd = url.searchParams.get('yearEnd')

  if (type) filters.push({ property: 'Type', select: { equals: type } })
  if (status) filters.push({ property: 'Status', select: { equals: status } })
  if (keyword) filters.push({
    or: [
      { property: 'Name', title: { contains: keyword } },
      { property: 'Manufacturer', rich_text: { contains: keyword } },
      { property: 'Model', rich_text: { contains: keyword } },
    ]
  })
  if (buildingCategories.length) {
    filters.push({
      or: buildingCategories.map(c => ({ property: 'BuildingCategory', select: { equals: c } }))
    })
  }

  const filter = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters }

  const pages = await queryDatabase(env, env.NOTION_DB_EQUIPMENT, filter, [
    { property: 'Name', direction: 'ascending' }
  ])

  let items = pages.map(pageToEquipment)

  // Post-filter by year (Notion date filter is limited)
  if (yearStart) {
    const gStart = Number(yearStart) + 1911
    items = items.filter(e => e.installDate && new Date(e.installDate).getFullYear() >= gStart)
  }
  if (yearEnd) {
    const gEnd = Number(yearEnd) + 1911
    items = items.filter(e => e.installDate && new Date(e.installDate).getFullYear() <= gEnd)
  }

  return json(items)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
