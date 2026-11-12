import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Tabs, Spin, Alert, Button, Checkbox, Input,
  Table, Tag, Space, Typography, message, Empty, Card, Modal, Select, Badge,
} from 'antd'
import {
  SearchOutlined, SaveOutlined, FileTextOutlined, HistoryOutlined,
  HolderOutlined, UpOutlined, DownOutlined, DownloadOutlined,
  PlusOutlined, DeleteOutlined, ProjectOutlined, RightOutlined,
  FolderOpenOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { BrandMaster, BrandReport, ProjectWithStats } from '../types'

const { Title, Text } = Typography

const CATEGORIES = ['電力', '弱電', '給排水', '消防', '空調', '其他']
const PREVIEW_ORDER = ['電力', '弱電', '給排水', '消防', '空調', '其他']

const CAT_COLORS: Record<string, string> = {
  '電力': '#fa8c16',
  '弱電': '#722ed1',
  '給排水': '#13c2c2',
  '消防': '#f5222d',
  '空調': '#1677ff',
  '其他': '#8c8c8c',
}

// category → productId → brandName → selected
type SelectionMap = Record<string, Record<string, Record<string, boolean>>>

function gradeColor(grade: string) {
  if (grade === '國外A') return 'gold'
  if (grade === '國內A') return 'green'
  if (grade === '國內B') return 'blue'
  return 'default'
}

// ---- Draggable Product List ----
function DraggableProductList({
  category,
  products,
  selections,
  productOrder,
  draggingEnabled,
  onToggle,
  onReorder,
}: {
  category: string
  products: BrandMaster[]
  selections: SelectionMap
  productOrder: string[]
  draggingEnabled: boolean
  onToggle: (category: string, productId: string, brandName: string, checked: boolean) => void
  onReorder: (category: string, newOrder: string[]) => void
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(products.map(p => p.id))
  )
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const catColor = CAT_COLORS[category] ?? '#1677ff'

  const orderedProducts = useMemo(() => {
    const orderMap = new Map(productOrder.map((id, i) => [id, i]))
    return [...products].sort((a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity))
  }, [products, productOrder])

  const handleDragStart = (index: number) => { dragIndex.current = index }
  const handleDragEnter = (index: number, id: string) => {
    dragOverIndex.current = index
    setDragOverId(id)
  }
  const handleDragEnd = () => {
    if (
      dragIndex.current !== null &&
      dragOverIndex.current !== null &&
      dragIndex.current !== dragOverIndex.current
    ) {
      const newOrder = [...productOrder]
      const [moved] = newOrder.splice(dragIndex.current, 1)
      newOrder.splice(dragOverIndex.current, 0, moved)
      onReorder(category, newOrder)
    }
    dragIndex.current = null
    dragOverIndex.current = null
    setDragOverId(null)
  }

  const toggleOpen = (id: string) => {
    setOpenKeys(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {orderedProducts.map((product, index) => {
        const prodSel = selections[category]?.[product.id] ?? {}
        const selectedCount = Object.values(prodSel).filter(Boolean).length
        const isOpen = openKeys.has(product.id)
        const isDragOver = draggingEnabled && dragOverId === product.id

        return (
          <div
            key={product.id}
            draggable={draggingEnabled}
            onDragStart={draggingEnabled ? () => handleDragStart(index) : undefined}
            onDragEnter={draggingEnabled ? () => handleDragEnter(index, product.id) : undefined}
            onDragEnd={draggingEnabled ? handleDragEnd : undefined}
            onDragOver={draggingEnabled ? e => e.preventDefault() : undefined}
            style={{
              marginBottom: 6,
              border: `1px solid ${isDragOver ? catColor : (selectedCount > 0 ? catColor + '55' : '#f0f0f0')}`,
              borderLeft: `3px solid ${selectedCount > 0 ? catColor : (isDragOver ? catColor : '#e0e0e0')}`,
              borderRadius: '0 6px 6px 0',
              background: '#fff',
              transition: 'all 0.15s',
              boxShadow: selectedCount > 0 ? `0 1px 4px ${catColor}22` : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '7px 12px',
                background: selectedCount > 0 ? `${catColor}08` : '#fafafa',
                borderRadius: isOpen ? '0 6px 0 0' : '0 6px 6px 0',
                userSelect: 'none',
              }}
            >
              {draggingEnabled && (
                <HolderOutlined style={{ color: '#ccc', marginRight: 8, cursor: 'grab', fontSize: 13 }} />
              )}
              <Space style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleOpen(product.id)}>
                <Text strong style={{ fontSize: 15 }}>{product.productName}</Text>
                {selectedCount > 0 && (
                  <Tag color={catColor} style={{ margin: 0, fontWeight: 600 }}>
                    {selectedCount} 項
                  </Tag>
                )}
              </Space>
              <span
                style={{ cursor: 'pointer', color: '#bbb', marginLeft: 8, fontSize: 13 }}
                onClick={() => toggleOpen(product.id)}
              >
                {isOpen ? <UpOutlined /> : <DownOutlined />}
              </span>
            </div>
            {isOpen && (
              <div style={{
                padding: '10px 14px',
                borderTop: `1px solid ${selectedCount > 0 ? catColor + '33' : '#f0f0f0'}`,
                display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
              }}>
                {product.brands.map(b => (
                  <Checkbox
                    key={b.name}
                    checked={!!(prodSel[b.name])}
                    onChange={e => onToggle(category, product.id, b.name, e.target.checked)}
                  >
                    <Space size={4}>
                      <span style={{ fontSize: 15 }}>{b.name}</span>
                      <Tag color={gradeColor(b.grade)} style={{ fontSize: 11, margin: 0, padding: '0 5px' }}>{b.grade}</Tag>
                    </Space>
                  </Checkbox>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Brand Selector Tab ----
function BrandSelectorTab({
  category,
  brands,
  selections,
  productOrder,
  onToggle,
  onReorder,
}: {
  category: string
  brands: BrandMaster[]
  selections: SelectionMap
  productOrder: string[]
  onToggle: (category: string, productId: string, brandName: string, checked: boolean) => void
  onReorder: (category: string, newOrder: string[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const catColor = CAT_COLORS[category] ?? '#1677ff'

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return brands
    return brands.filter(
      p => p.productName.toLowerCase().includes(kw) ||
        p.brands.some(b => b.name.toLowerCase().includes(kw))
    )
  }, [brands, keyword])

  const catSel = selections[category] ?? {}
  const selectedCount = Object.values(catSel).reduce(
    (acc, prodSel) => acc + Object.values(prodSel).filter(Boolean).length, 0
  )
  const hasKeyword = keyword.trim().length > 0

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        padding: '8px 12px',
        background: `${catColor}0a`,
        borderRadius: 6,
        borderLeft: `3px solid ${catColor}`,
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: catColor }} />}
          placeholder="搜尋品名或廠牌（搜尋時停用拖曳排序）"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          allowClear
          style={{ flex: 1, background: 'transparent', border: 'none', boxShadow: 'none' }}
        />
        {selectedCount > 0 && (
          <Tag color={catColor} style={{ fontWeight: 600, fontSize: 13 }}>
            已選 {selectedCount} 項
          </Tag>
        )}
      </div>

      {filtered.length === 0 ? (
        <Empty description="無資料" />
      ) : (
        <DraggableProductList
          category={category}
          products={filtered}
          selections={selections}
          productOrder={productOrder}
          draggingEnabled={!hasKeyword}
          onToggle={onToggle}
          onReorder={onReorder}
        />
      )}
    </div>
  )
}

// ---- Unified Report Preview ----
type PreviewRow = {
  key: string
  category: string
  product: string
  brandName: string
  grade: string
  categorySpan: number
  productSpan: number
}

function computePreviewRows(
  brandsMap: Record<string, BrandMaster[]>,
  selections: SelectionMap,
  productOrder: Record<string, string[]>
): PreviewRow[] {
  const flat: Omit<PreviewRow, 'categorySpan' | 'productSpan'>[] = []
  for (const cat of PREVIEW_ORDER) {
    const catBrands = brandsMap[cat] ?? []
    const catOrder = productOrder[cat] ?? catBrands.map(b => b.id)
    const catSel = selections[cat] ?? {}
    const orderMap = new Map(catOrder.map((id, i) => [id, i]))
    const ordered = [...catBrands].sort(
      (a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity)
    )
    for (const product of ordered) {
      const selectedBrands = product.brands.filter(b => catSel[product.id]?.[b.name])
      for (const b of selectedBrands) {
        flat.push({ key: `${cat}-${product.id}-${b.name}`, category: cat, product: product.productName, brandName: b.name, grade: b.grade })
      }
    }
  }
  const result: PreviewRow[] = flat.map(r => ({ ...r, categorySpan: 0, productSpan: 0 }))
  let i = 0
  while (i < result.length) {
    const cat = result[i].category
    let catEnd = i
    while (catEnd < result.length && result[catEnd].category === cat) catEnd++
    result[i].categorySpan = catEnd - i
    let j = i
    while (j < catEnd) {
      const prod = result[j].product
      let prodEnd = j
      while (prodEnd < catEnd && result[prodEnd].product === prod) prodEnd++
      result[j].productSpan = prodEnd - j
      j = prodEnd
    }
    i = catEnd
  }
  return result
}

async function buildWordBlob(rows: PreviewRow[], projectCode: string, changeSummary: string): Promise<Blob> {
  const {
    Document, Packer, Table, TableRow, TableCell,
    Paragraph, TextRun, WidthType, AlignmentType, HeadingLevel, VerticalMergeType,
  } = await import('docx')
  const PT = (pt: number) => pt * 2
  const mkCell = (
    text: string,
    opts?: { bold?: boolean; size?: number; align?: 'center'; vMerge?: 'restart' | 'continue' }
  ) => {
    const vMerge = opts?.vMerge === 'restart' ? VerticalMergeType.RESTART
      : opts?.vMerge === 'continue' ? VerticalMergeType.CONTINUE : undefined
    const para = opts?.vMerge === 'continue'
      ? new Paragraph({ children: [] })
      : new Paragraph({
          alignment: opts?.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text, bold: opts?.bold, size: opts?.size ?? PT(12) })],
        })
    return new TableCell({ ...(vMerge !== undefined ? { verticalMerge: vMerge } : {}), children: [para] })
  }
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        mkCell('分類', { bold: true, align: 'center' }),
        mkCell('品名', { bold: true }),
        mkCell('廠牌', { bold: true }),
      ],
    }),
    ...rows.map(row => {
      const catVM = row.categorySpan > 1 ? 'restart' : row.categorySpan === 0 ? 'continue' : undefined
      const prodVM = row.productSpan > 1 ? 'restart' : row.productSpan === 0 ? 'continue' : undefined
      return new TableRow({
        children: [
          mkCell(row.category, { align: 'center', vMerge: catVM }),
          mkCell(row.product, { vMerge: prodVM }),
          mkCell(row.brandName, { size: PT(16) }),
        ],
      })
    }),
  ]
  const title = projectCode ? `${projectCode}廠牌建議表` : '廠牌建議表'
  const docChildren: InstanceType<typeof Paragraph | typeof Table>[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: title, bold: true, size: PT(18) })] }),
  ]
  if (changeSummary.trim()) {
    docChildren.push(new Paragraph({ children: [new TextRun({ text: `修改摘要：${changeSummary}`, size: PT(12) })] }))
  }
  docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }))
  const doc = new Document({ sections: [{ children: docChildren }] })
  return Packer.toBlob(doc)
}

function ReportPreview({
  brandsMap,
  selections,
  productOrder,
  projectCode,
  changeSummary,
}: {
  brandsMap: Record<string, BrandMaster[]>
  selections: SelectionMap
  productOrder: Record<string, string[]>
  projectCode: string
  changeSummary: string
}) {
  const rows = useMemo(
    () => computePreviewRows(brandsMap, selections, productOrder),
    [brandsMap, selections, productOrder]
  )

  if (rows.length === 0) return <Empty description="尚未選擇任何廠牌" style={{ marginTop: 40 }} />

  const columns = [
    {
      title: '分類',
      dataIndex: 'category' as const,
      key: 'category',
      width: 72,
      align: 'center' as const,
      onCell: (_: PreviewRow, index?: number) => ({
        rowSpan: index != null ? (rows[index]?.categorySpan ?? 1) : 1,
      }),
    },
    {
      title: '品名',
      dataIndex: 'product' as const,
      key: 'product',
      width: '45%',
      className: 'col-product',
      onCell: (_: PreviewRow, index?: number) => ({
        rowSpan: index != null ? (rows[index]?.productSpan ?? 1) : 1,
      }),
    },
    {
      title: '廠牌',
      dataIndex: 'brandName' as const,
      key: 'brandName',
      className: 'col-brand',
      render: (name: string) => (
        <span style={{ fontWeight: 500 }}>{name}</span>
      ),
    },
  ]

  const handleExportWord = async () => {
    if (rows.length === 0) return
    const title = projectCode ? `${projectCode}廠牌建議表` : '廠牌建議表'
    const blob = await buildWordBlob(rows, projectCode, changeSummary)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {projectCode && (
        <Title level={5} style={{ marginBottom: 8, color: '#1a7a4a' }}>{projectCode}廠牌建議表</Title>
      )}
      <div style={{ marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} onClick={handleExportWord} disabled={rows.length === 0} type="default">
          匯出 Word
        </Button>
      </div>
      <style>{`
        .preview-table .ant-table td, .preview-table .ant-table th { font-size: 18px; }
        .preview-table .ant-table-thead .ant-table-cell { font-weight: bold; }
        .preview-table .col-product, .preview-table .col-brand { font-size: 16px; }
        .preview-table .ant-table-cell { border-color: #000 !important; vertical-align: middle; }
        .preview-table .ant-table-container { border-inline-start-color: #000 !important; }
        .preview-table .ant-table { border-color: #000 !important; }
      `}</style>
      <Table<PreviewRow>
        className="preview-table"
        dataSource={rows}
        columns={columns}
        rowKey="key"
        pagination={false}
        size="small"
        bordered
      />
    </div>
  )
}

// ---- History Panel ----
type VersionGroup = {
  versionKey: string
  displayTime: string
  reports: BrandReport[]
}

function groupByVersion(reports: BrandReport[]): VersionGroup[] {
  const map = new Map<string, BrandReport[]>()
  for (const r of reports) {
    const key = r.savedAt ?? r.createdDate
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([key, reps]) => ({
    versionKey: key,
    displayTime: key.includes('T')
      ? new Date(key).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : key,
    reports: reps,
  }))
}

function HistoryPanel({
  projectCode,
  brandsMap,
  onLoad,
}: {
  projectCode: string
  brandsMap: Record<string, BrandMaster[]>
  onLoad: (reports: BrandReport[]) => void
}) {
  const [reports, setReports] = useState<BrandReport[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!projectCode.trim()) return
    setLoading(true)
    api.brandReports.list({ projectCode: projectCode.trim() })
      .then(setReports)
      .catch(() => message.error('載入歷史記錄失敗'))
      .finally(() => setLoading(false))
  }, [projectCode])

  if (!projectCode.trim()) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
      <HistoryOutlined style={{ fontSize: 32, marginBottom: 8 }} />
      <div>請輸入案件工號以查詢歷史記錄</div>
    </div>
  )
  if (loading) return <Spin style={{ display: 'block', margin: '40px auto' }} />
  if (reports.length === 0) return <Empty description="無歷史記錄" style={{ marginTop: 40 }} />

  const versions = groupByVersion(reports)

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {versions.map((v, idx) => {
        const isExpanded = expandedKeys.has(v.versionKey)
        const versionNo = versions.length - idx
        const merged: Record<string, Record<string, string[]>> = {}
        for (const r of v.reports) {
          for (const [cat, catSel] of Object.entries(r.selections)) {
            merged[cat] = { ...(merged[cat] ?? {}), ...catSel }
          }
        }
        const totalBrands = Object.values(merged).reduce(
          (a, catSel) => a + Object.values(catSel).reduce((b, brands) => b + brands.length, 0), 0
        )
        const catSummary = Object.entries(merged)
          .filter(([, catSel]) => Object.keys(catSel).length > 0)
          .map(([cat, catSel]) => {
            const count = Object.values(catSel).reduce((a, b) => a + b.length, 0)
            return `${cat} ${count}項`
          }).join(' / ')
        const changeSummary = v.reports[0]?.changeSummary

        return (
          <Card
            key={v.versionKey}
            size="small"
            style={{
              borderRadius: 8,
              borderLeft: `3px solid ${idx === 0 ? '#1677ff' : '#d9d9d9'}`,
              boxShadow: idx === 0 ? '0 2px 8px rgba(22,119,255,0.08)' : 'none',
            }}
            styles={{ header: { padding: '8px 14px' }, body: { padding: '10px 14px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <Badge
                    count={`V${versionNo}`}
                    style={{ backgroundColor: idx === 0 ? '#1677ff' : '#8c8c8c', fontSize: 11, fontWeight: 700 }}
                  />
                  <Text strong style={{ fontSize: 14 }}>{v.displayTime}</Text>
                  <Tag color="blue" style={{ margin: 0 }}>共 {totalBrands} 項</Tag>
                </Space>
                <Space>
                  <Button size="small" onClick={() => toggleExpand(v.versionKey)}>
                    {isExpanded ? '收起' : '展開明細'}
                  </Button>
                  <Button size="small" type="primary" onClick={() => onLoad(v.reports)}>
                    載入編輯
                  </Button>
                </Space>
              </div>
            }
          >
            {changeSummary && (
              <div style={{
                marginBottom: 6, padding: '4px 10px',
                background: '#fffbe6', borderRadius: 4,
                fontSize: 12, color: '#ad8b00', borderLeft: '2px solid #fadb14',
              }}>
                摘要：{changeSummary}
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 13 }}>{catSummary}</Text>
            {isExpanded && (
              <div style={{ marginTop: 10 }}>
                {Object.entries(merged).map(([cat, catSel]) =>
                  Object.keys(catSel).length === 0 ? null : (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[cat] ?? '#8c8c8c' }} />
                        <Text strong style={{ fontSize: 13 }}>{cat}</Text>
                      </div>
                      {Object.entries(catSel).map(([productName, brands]) => (
                        <div key={productName} style={{ paddingLeft: 16, marginTop: 3 }}>
                          <Text style={{ fontSize: 13 }}>{productName}　</Text>
                          <Space wrap size={4}>
                            {brands.map(b => {
                              const grade = brandsMap[cat]
                                ?.flatMap(bm => bm.brands)
                                .find(bi => bi.name === b)?.grade ?? ''
                              return <Tag key={b} color={gradeColor(grade)} style={{ fontSize: 12 }}>{b}</Tag>
                            })}
                          </Space>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ---- Project List Page ----
function ProjectListPage({
  projects,
  loading,
  onSelect,
  onDelete,
  onCreateNew,
}: {
  projects: ProjectWithStats[]
  loading: boolean
  onSelect: (project: ProjectWithStats) => void
  onDelete: (project: ProjectWithStats) => void
  onCreateNew: () => void
}) {
  const projectsByYear = useMemo(() => {
    const map: Record<number, ProjectWithStats[]> = {}
    for (const p of projects) {
      if (!map[p.year]) map[p.year] = []
      map[p.year].push(p)
    }
    return map
  }, [projects])

  const years = Object.keys(projectsByYear).map(Number).sort((a, b) => b - a)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#888' }}>載入工程列表中…</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            共 {projects.length} 個工程
          </Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew} size="middle">
          建立新工程
        </Button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ProjectOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div style={{ color: '#aaa', fontSize: 15 }}>尚無工程</div>
          <div style={{ color: '#bbb', fontSize: 13, marginTop: 4 }}>點擊「建立新工程」開始規劃</div>
        </div>
      ) : (
        years.map(year => (
          <div key={year} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 4, height: 20, background: '#1677ff', borderRadius: 2 }} />
              <Text strong style={{ fontSize: 15, color: '#262626' }}>民國 {year} 年度</Text>
              <Tag color="blue" style={{ margin: 0 }}>{projectsByYear[year].length} 個</Tag>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectsByYear[year].map(project => (
                <div
                  key={project.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '12px 16px 12px 14px',
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderLeft: '4px solid #1677ff',
                    borderRadius: '0 8px 8px 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,119,255,0.14)'
                    e.currentTarget.style.borderLeftColor = '#52c41a'
                    e.currentTarget.style.background = '#fafffe'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                    e.currentTarget.style.borderLeftColor = '#1677ff'
                    e.currentTarget.style.background = '#fff'
                  }}
                  onClick={() => onSelect(project)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 15 }}>{project.projectName}</Text>
                      <Tag style={{ margin: 0, color: '#595959', background: '#f5f5f5', border: '1px solid #d9d9d9' }}>
                        {project.projectCode}
                      </Tag>
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {project.versionCount > 0 ? (
                        <>
                          <Tag color="green" style={{ margin: 0 }}>
                            已存 {project.versionCount} 版
                          </Tag>
                          {project.lastSavedAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {new Date(project.lastSavedAt).toLocaleDateString('zh-TW', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                              })}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>尚無存檔記錄</Text>
                      )}
                    </div>
                  </div>
                  <Space>
                    <RightOutlined style={{ color: '#c0c0c0', fontSize: 12 }} />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={e => { e.stopPropagation(); onDelete(project) }}
                    />
                  </Space>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ---- Create Project Modal ----
function CreateProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (year: number, projectCode: string, projectName: string) => Promise<void>
}) {
  const currentRocYear = new Date().getFullYear() - 1911
  const [year, setYear] = useState(currentRocYear)
  const [projectCode, setProjectCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  const reset = () => {
    setProjectCode('')
    setProjectName('')
    setYear(new Date().getFullYear() - 1911)
  }

  const handleSubmit = async () => {
    if (!projectCode.trim()) { message.warning('請輸入工程編號'); return }
    if (!projectName.trim()) { message.warning('請輸入工程名稱'); return }
    setCreating(true)
    try {
      await onCreate(year, projectCode.trim(), projectName.trim())
      reset()
      onClose()
    } finally {
      setCreating(false)
    }
  }

  const yearOptions = Array.from({ length: 8 }, (_, i) => {
    const y = currentRocYear - 2 + i
    return { value: y, label: `民國 ${y} 年` }
  })

  return (
    <Modal
      title={
        <Space>
          <div style={{ width: 4, height: 18, background: '#1677ff', borderRadius: 2 }} />
          建立新工程
        </Space>
      }
      open={open}
      onCancel={() => { reset(); onClose() }}
      onOk={handleSubmit}
      okText="建立工程"
      cancelText="取消"
      confirmLoading={creating}
      width={440}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        <div>
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#262626' }}>年度（民國）</div>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: '100%' }}
            options={yearOptions}
          />
        </div>
        <div>
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#262626' }}>工程編號</div>
          <Input
            placeholder="e.g. PJ115-001"
            value={projectCode}
            onChange={e => setProjectCode(e.target.value)}
            prefix={<Text type="secondary" style={{ fontSize: 12 }}>#</Text>}
          />
        </div>
        <div>
          <div style={{ marginBottom: 6, fontWeight: 500, color: '#262626' }}>工程名稱</div>
          <Input
            placeholder="e.g. 台北某大樓機電工程"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onPressEnter={handleSubmit}
          />
        </div>
      </div>
    </Modal>
  )
}

// ---- Main Component ----
export default function ProjectBrandSystem() {
  const [brandsMap, setBrandsMap] = useState<Record<string, BrandMaster[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [selections, setSelections] = useState<SelectionMap>({})
  const [productOrder, setProductOrder] = useState<Record<string, string[]>>({})
  const [projectCode, setProjectCode] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [mainTab, setMainTab] = useState<'projects' | 'select' | 'preview' | 'history'>('projects')

  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [currentProject, setCurrentProject] = useState<ProjectWithStats | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ project: ProjectWithStats | null; visible: boolean }>({ project: null, visible: false })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all(
      CATEGORIES.map(cat => api.brands.list({ category: cat }).then(list => [cat, list] as const))
    )
      .then(results => {
        const map = Object.fromEntries(results)
        setBrandsMap(map)
        const initOrder: Record<string, string[]> = {}
        for (const [cat, list] of results) {
          initOrder[cat] = (list as BrandMaster[]).map(b => b.id)
        }
        setProductOrder(initOrder)
      })
      .catch((e: any) => setError(e.message ?? '載入廠牌資料失敗'))
      .finally(() => setLoading(false))
  }, [])

  const loadProjects = useCallback(() => {
    setProjectsLoading(true)
    api.projects.list()
      .then(setProjects)
      .catch(() => message.error('載入工程列表失敗'))
      .finally(() => setProjectsLoading(false))
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleToggle = (category: string, productId: string, brandName: string, checked: boolean) => {
    setSelections(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] ?? {}),
        [productId]: {
          ...(prev[category]?.[productId] ?? {}),
          [brandName]: checked,
        },
      },
    }))
  }

  const handleReorder = (category: string, newOrder: string[]) => {
    setProductOrder(prev => ({ ...prev, [category]: newOrder }))
  }

  const totalSelected = useMemo(
    () => Object.values(selections).reduce(
      (acc, catSel) => acc + Object.values(catSel).reduce(
        (a, prodSel) => a + Object.values(prodSel).filter(Boolean).length, 0
      ), 0
    ),
    [selections]
  )

  const handleLoadVersion = (reports: BrandReport[]) => {
    const newSelections: SelectionMap = {}
    for (const report of reports) {
      for (const [cat, catSel] of Object.entries(report.selections)) {
        const catBrands = brandsMap[cat] ?? []
        newSelections[cat] = newSelections[cat] ?? {}
        for (const [productName, brandNames] of Object.entries(catSel)) {
          const product = catBrands.find(b => b.productName === productName)
          if (!product) continue
          newSelections[cat][product.id] = {}
          for (const brandName of brandNames) {
            newSelections[cat][product.id][brandName] = true
          }
        }
      }
    }
    setSelections(newSelections)
    setMainTab('select')
    message.success('已載入廠牌選擇，可繼續編輯')
  }

  const handleSelectProject = async (project: ProjectWithStats) => {
    setCurrentProject(project)
    setProjectCode(project.projectCode)
    setChangeSummary('')

    if (project.versionCount > 0) {
      try {
        const reports = await api.brandReports.list({ projectCode: project.projectCode })
        if (reports.length > 0) {
          const versions = groupByVersion(reports)
          // Sort descending by versionKey (ISO timestamp) to guarantee latest is first
          versions.sort((a, b) => b.versionKey.localeCompare(a.versionKey))
          handleLoadVersion(versions[0].reports)
          return
        }
      } catch (e) {
        console.warn('Failed to load latest version:', e)
      }
    }
    setSelections({})
    setMainTab('select')
  }

  const handleCreateProject = async (year: number, code: string, name: string) => {
    await api.projects.create({ year, projectCode: code, projectName: name })
    message.success(`工程「${name}」已建立`)
    loadProjects()
  }

  const handleDeleteProject = (project: ProjectWithStats) => {
    setDeleteModal({ project, visible: true })
  }

  const confirmDelete = async (cascade: boolean) => {
    if (!deleteModal.project) return
    const proj = deleteModal.project
    setDeleting(true)
    try {
      await api.projects.delete(proj.id, cascade)
      message.success(`工程「${proj.projectName}」已刪除`)
      if (currentProject?.id === proj.id) {
        setCurrentProject(null)
        setProjectCode('')
        setSelections({})
      }
      setDeleteModal({ project: null, visible: false })
      loadProjects()
    } catch (e: any) {
      message.error(e.message ?? '刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!projectCode.trim()) { message.warning('請輸入案件工號'); return }
    if (!changeSummary.trim()) { message.warning('請填寫修改摘要後再儲存'); return }
    if (totalSelected === 0) { message.warning('請至少選擇一個廠牌'); return }

    const combinedSelections: Record<string, Record<string, string[]>> = {}
    for (const cat of CATEGORIES) {
      const catSel = selections[cat] ?? {}
      const catOrder = productOrder[cat] ?? (brandsMap[cat] ?? []).map(b => b.id)
      const orderMap = new Map(catOrder.map((id, i) => [id, i]))
      const orderedProducts = [...(brandsMap[cat] ?? [])].sort(
        (a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity)
      )
      const byProduct: Record<string, string[]> = {}
      for (const product of orderedProducts) {
        const selected = Object.entries(catSel[product.id] ?? {})
          .filter(([, v]) => v).map(([k]) => k)
        if (selected.length > 0) byProduct[product.productName] = selected
      }
      if (Object.keys(byProduct).length > 0) combinedSelections[cat] = byProduct
    }

    if (Object.keys(combinedSelections).length === 0) { message.warning('無已選廠牌可儲存'); return }

    const previewRows = computePreviewRows(brandsMap, selections, productOrder)
    let wordFileBase64: string | undefined
    let wordFileName: string | undefined
    if (previewRows.length > 0) {
      try {
        const blob = await buildWordBlob(previewRows, projectCode.trim(), changeSummary)
        const ab = await blob.arrayBuffer()
        const bytes = new Uint8Array(ab)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        wordFileBase64 = btoa(binary)
        wordFileName = `${projectCode.trim()}廠牌建議表.docx`
      } catch (e) {
        console.warn('Word generation failed, saving without file:', e)
      }
    }

    setSaving(true)
    try {
      await api.brandReports.create({
        reportName: projectCode.trim(),
        projectCode: projectCode.trim(),
        selections: combinedSelections,
        changeSummary: changeSummary.trim() || undefined,
        wordFileBase64,
        wordFileName,
      })
      message.success(`已儲存 ${projectCode} 廠牌表`)
      loadProjects()
    } catch (e: any) {
      message.error(e.message ?? '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#888' }}>載入廠牌資料中…</div>
      </div>
    )
  }

  if (error) return <Alert type="error" message={error} style={{ margin: 24 }} />

  const projectBanner = currentProject ? (
    <div style={{
      marginBottom: 14,
      padding: '10px 16px',
      background: 'linear-gradient(90deg, #e6f4ff 0%, #f8fbff 100%)',
      borderLeft: '4px solid #1677ff',
      borderRadius: '0 8px 8px 0',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <FolderOpenOutlined style={{ color: '#1677ff', fontSize: 18 }} />
      <div>
        <div style={{ fontSize: 11, color: '#1677ff', marginBottom: 2 }}>目前工程</div>
        <Space>
          <Text strong style={{ fontSize: 15 }}>{currentProject.projectName}</Text>
          <Tag color="blue" style={{ margin: 0 }}>{currentProject.projectCode}</Tag>
          {currentProject.versionCount > 0 && (
            <Tag color="green" style={{ margin: 0 }}>已存 {currentProject.versionCount} 版</Tag>
          )}
        </Space>
      </div>
    </div>
  ) : null

  const mainTabItems = [
    {
      key: 'projects',
      label: (
        <Space size={6}>
          <ProjectOutlined />
          工程列表
          {projects.length > 0 && (
            <Badge count={projects.length} size="small" style={{ backgroundColor: '#8c8c8c' }} />
          )}
        </Space>
      ),
      children: (
        <ProjectListPage
          projects={projects}
          loading={projectsLoading}
          onSelect={handleSelectProject}
          onDelete={handleDeleteProject}
          onCreateNew={() => setCreateModalOpen(true)}
        />
      ),
    },
    {
      key: 'select',
      label: (
        <Space size={6}>
          <FileTextOutlined />
          廠牌選擇
          {totalSelected > 0 && (
            <Badge count={totalSelected} size="small" style={{ backgroundColor: '#1677ff' }} />
          )}
        </Space>
      ),
      children: (
        <div>
          {projectBanner}
          <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Input
              addonBefore={<Text style={{ fontSize: 13 }}>案件工號</Text>}
              placeholder="e.g. PJ115-001"
              value={projectCode}
              onChange={e => { setProjectCode(e.target.value); setCurrentProject(null) }}
              style={{ width: 280 }}
            />
            <Input
              addonBefore={<Text style={{ fontSize: 13 }}>修改摘要</Text>}
              placeholder="本次修改說明（選填）"
              value={changeSummary}
              onChange={e => setChangeSummary(e.target.value)}
              style={{ width: 320 }}
            />
          </div>
          <Tabs
            activeKey={activeCategory}
            onChange={setActiveCategory}
            type="card"
            items={CATEGORIES.map(cat => {
              const catColor = CAT_COLORS[cat] ?? '#8c8c8c'
              const catCount = Object.values(selections[cat] ?? {}).reduce(
                (a, p) => a + Object.values(p).filter(Boolean).length, 0
              )
              return {
                key: cat,
                label: (
                  <Space size={5}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: activeCategory === cat ? catColor : '#d9d9d9',
                      transition: 'background 0.2s',
                    }} />
                    {cat}
                    {catCount > 0 && (
                      <Badge count={catCount} size="small" style={{ backgroundColor: catColor }} />
                    )}
                  </Space>
                ),
                children: (
                  <BrandSelectorTab
                    category={cat}
                    brands={brandsMap[cat] ?? []}
                    selections={selections}
                    productOrder={productOrder[cat] ?? (brandsMap[cat] ?? []).map(b => b.id)}
                    onToggle={handleToggle}
                    onReorder={handleReorder}
                  />
                ),
              }
            })}
          />
        </div>
      ),
    },
    {
      key: 'preview',
      label: <Space><FileTextOutlined />預覽廠牌表</Space>,
      children: (
        <div>
          {projectBanner}
          <div style={{ marginBottom: 14 }}>
            <Space wrap>
              <Input
                addonBefore="案件工號"
                placeholder="e.g. PJ115-001"
                value={projectCode}
                onChange={e => { setProjectCode(e.target.value); setCurrentProject(null) }}
                style={{ width: 280 }}
              />
              <Input
                addonBefore="修改摘要"
                placeholder="本次修改說明（選填）"
                value={changeSummary}
                onChange={e => setChangeSummary(e.target.value)}
                style={{ width: 300 }}
              />
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                disabled={totalSelected === 0 || !projectCode.trim()}
              >
                儲存廠牌表
              </Button>
            </Space>
          </div>
          <ReportPreview
            brandsMap={brandsMap}
            selections={selections}
            productOrder={productOrder}
            projectCode={projectCode}
            changeSummary={changeSummary}
          />
        </div>
      ),
    },
    {
      key: 'history',
      label: <Space><HistoryOutlined />歷史查詢</Space>,
      children: (
        <div>
          {projectBanner}
          <div style={{ marginBottom: 14 }}>
            <Input
              addonBefore="案件工號"
              placeholder="輸入案件工號查詢歷史"
              value={projectCode}
              onChange={e => { setProjectCode(e.target.value); setCurrentProject(null) }}
              style={{ width: 280 }}
            />
          </div>
          <HistoryPanel projectCode={projectCode} brandsMap={brandsMap} onLoad={handleLoadVersion} />
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Header */}
      <div style={{
        marginBottom: 20,
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #f6ffed 0%, #fff 60%)',
        border: '1px solid #b7eb8f',
        borderLeft: '4px solid #52c41a',
        borderRadius: '0 10px 10px 0',
      }}>
        <Space align="center">
          <div style={{
            background: '#1a7a4a',
            borderRadius: 8,
            width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1a7a4a', lineHeight: 1.4 }}>
              案件廠牌表規劃系統
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              管理工程案件，依類別規劃廠牌，存檔並追蹤修改歷程
            </Text>
          </div>
        </Space>
      </div>

      <Tabs
        activeKey={mainTab}
        onChange={k => setMainTab(k as typeof mainTab)}
        items={mainTabItems}
      />

      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <Modal
        title={
          <Space>
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
            刪除工程
          </Space>
        }
        open={deleteModal.visible}
        onCancel={() => setDeleteModal({ project: null, visible: false })}
        footer={
          <Space>
            <Button onClick={() => setDeleteModal({ project: null, visible: false })}>取消</Button>
            {(deleteModal.project?.versionCount ?? 0) > 0 && (
              <Button danger onClick={() => confirmDelete(false)} loading={deleting}>
                僅刪除工程
              </Button>
            )}
            <Button
              type="primary"
              danger
              onClick={() => confirmDelete((deleteModal.project?.versionCount ?? 0) > 0)}
              loading={deleting}
            >
              {(deleteModal.project?.versionCount ?? 0) > 0 ? '刪除工程及存檔' : '確定刪除'}
            </Button>
          </Space>
        }
      >
        <p style={{ margin: '12px 0 4px' }}>
          確定要刪除「<strong>{deleteModal.project?.projectName}</strong>」（{deleteModal.project?.projectCode}）？
        </p>
        {(deleteModal.project?.versionCount ?? 0) > 0 && (
          <Alert
            type="warning"
            message={`此工程有 ${deleteModal.project?.versionCount} 筆存檔記錄，可選擇是否一併刪除。`}
            showIcon
            style={{ marginTop: 10 }}
          />
        )}
      </Modal>
    </div>
  )
}
