import { queryDatabase, getPage, pageToEquipment, type Env } from '../notion'

export async function handleEquipment(req: Request, env: Env, path: string): Promise<Response> {
  const url = new URL(req.url)
  const id = path.replace('/api/equipment', '').replace(/^\//, '')

  if (id) {
    // GET /api/equipment/:id
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

  if (type) filters.push({ property: '設備類別', select: { equals: type } })
  if (status) filters.push({ property: '狀態', select: { equals: status } })
  if (keyword) filters.push({
    or: [
      { property: '設備名稱', title: { contains: keyword } },
      { property: '廠牌', rich_text: { contains: keyword } },
      { property: '型號', rich_text: { contains: keyword } },
    ]
  })
  if (buildingCategories.length) {
    filters.push({
      or: buildingCategories.map(c => ({ property: '建築類別', select: { equals: c } }))
    })
  }

  const filter = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters }

  const pages = await queryDatabase(env, env.NOTION_DB_EQUIPMENT, filter, [
    { property: '設備名稱', direction: 'ascending' }
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
