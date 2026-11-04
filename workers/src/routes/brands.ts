import { queryDatabase, pageToBrandMaster, type Env } from '../notion'

export async function handleBrands(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const keyword = url.searchParams.get('keyword')

  const filters: any[] = []
  if (category) filters.push({ property: '類別', select: { equals: category } })
  if (keyword) {
    filters.push({
      or: [
        { property: '廠牌名稱', title: { contains: keyword } },
        { property: '品名', rich_text: { contains: keyword } },
      ],
    })
  }

  const filter = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters }

  const pages = await queryDatabase(env, env.NOTION_DB_BRAND_MASTER, filter, [
    { property: '排序', direction: 'ascending' },
  ])

  return json(pages.map(pageToBrandMaster))
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
