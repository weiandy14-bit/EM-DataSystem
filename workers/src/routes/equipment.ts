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
  // keyword is handled post-query with flexible matching (see below)
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

  // Flexible keyword filter: exact substring OR all individual chars present
  if (keyword) {
    const kw = keyword.toLowerCase()
    items = items.filter(e => {
      const text = [e.name, e.manufacturer, e.model].join(' ').toLowerCase()
      return text.includes(kw) || [...kw].every(c => text.includes(c))
    })
  }

  // Post-filter by inquiry year; items without inquiryDate are kept
  if (yearStart) {
    const gStart = Number(yearStart) + 1911
    items = items.filter(e => !e.inquiryDate || new Date(e.inquiryDate).getFullYear() >= gStart)
  }
  if (yearEnd) {
    const gEnd = Number(yearEnd) + 1911
    items = items.filter(e => !e.inquiryDate || new Date(e.inquiryDate).getFullYear() <= gEnd)
  }

  return json(items)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
