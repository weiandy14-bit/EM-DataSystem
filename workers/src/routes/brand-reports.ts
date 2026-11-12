import { queryDatabase, pageToBrandReport, createBrandReport, type Env } from '../notion'

export async function handleBrandReports(req: Request, env: Env, subpath: string): Promise<Response> {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const projectCode = url.searchParams.get('projectCode')
    const category = url.searchParams.get('category')

    const filters: any[] = []
    if (projectCode) filters.push({ property: '案件工號', rich_text: { contains: projectCode } })
    if (category) filters.push({ property: '類別', select: { equals: category } })

    const filter = filters.length === 0 ? undefined
      : filters.length === 1 ? filters[0]
      : { and: filters }

    const pages = await queryDatabase(env, env.NOTION_DB_BRAND_REPORTS, filter, [
      { property: '建立日期', direction: 'descending' },
    ])

    return json(pages.map(pageToBrandReport))
  }

  if (req.method === 'POST') {
    const body = await req.json() as {
      reportName: string
      projectCode: string
      category: string
      selections: Record<string, string[]>
      notes?: string
      changeSummary?: string
      changeDiff?: string
      wordFileBase64?: string
      wordFileName?: string
    }

    if (!body.reportName || !body.projectCode || !body.selections) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const page = await createBrandReport(env, { ...body, changeDiff: body.changeDiff })
    return json(pageToBrandReport(page), 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
