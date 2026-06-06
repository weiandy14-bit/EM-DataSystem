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
  const type = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const keyword = url.searchParams.get('keyword')
  const buildingCategories = url.searchParams.getAll('buildingCategories')
  const yearStart = url.searchParams.get('yearStart')
  const yearEnd = url.searchParams.get('yearEnd')

  // Only push Notion-side filters for fields that are reliably populated
  const notionFilters: any[] = []
  if (type) notionFilters.push({ property: '設備類別', select: { equals: type } })
  if (status) notionFilters.push({ property: '狀態', select: { equals: status } })

  const notionFilter = notionFilters.length === 0 ? undefined
    : notionFilters.length === 1 ? notionFilters[0]
    : { and: notionFilters }

  const pages = await queryDatabase(env, env.NOTION_DB_EQUIPMENT, notionFilter, [
    { property: '設備名稱', direction: 'ascending' }
  ])

  let items = pages.map(pageToEquipment)

  // Post-filter: keyword (flexible: substring or all chars present)
  if (keyword) {
    const kw = keyword.toLowerCase()
    items = items.filter(e => {
      const text = [e.name, e.manufacturer, e.model, e.specDetail].join(' ').toLowerCase()
      return text.includes(kw) || [...kw].every(c => text.includes(c))
    })
  }

  // Post-filter: building category — only if equipment has a category set
  if (buildingCategories.length) {
    items = items.filter(e => !e.buildingCategory || buildingCategories.includes(e.buildingCategory))
  }

  // Post-filter: inquiry/install year range
  if (yearStart || yearEnd) {
    const gStart = yearStart ? Number(yearStart) + 1911 : null
    const gEnd = yearEnd ? Number(yearEnd) + 1911 : null
    const dateStr = (e: ReturnType<typeof pageToEquipment>) =>
      e.inquiryDate || e.installDate || ''
    items = items.filter(e => {
      const d = dateStr(e)
      if (!d) return true
      const yr = new Date(d).getFullYear()
      if (gStart && yr < gStart) return false
      if (gEnd && yr > gEnd) return false
      return true
    })
  }

  return json(items)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
