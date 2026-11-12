import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Tabs, Spin, Alert, Button, Checkbox, Input,
  Table, Tag, Space, Typography, message, Empty, Card, Modal, Select,
} from 'antd'
import {
  SearchOutlined, SaveOutlined, FileTextOutlined, HistoryOutlined,
  HolderOutlined, UpOutlined, DownOutlined, DownloadOutlined,
  PlusOutlined, DeleteOutlined, ProjectOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { BrandMaster, BrandReport, ProjectWithStats } from '../types'

const { Title, Text } = Typography

const CATEGORIES = ['電力', '弱電', '給排水', '消防', '空調', '其他']
const PREVIEW_ORDER = ['電力', '弱電', '給排水', '消防', '空調', '其他']


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
    () => new Set(products.slice(0, 3).map(p => p.id))
  )
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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
              marginBottom: 4,
              border: `1px solid ${isDragOver ? '#1677ff' : '#f0f0f0'}`,
              borderRadius: 6,
              background: '#fff',
              transition: 'border-color 0.15s',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                background: '#fafafa',
                borderRadius: isOpen ? '6px 6px 0 0' : 6,
                userSelect: 'none',
              }}
            >
              {draggingEnabled && (
                <HolderOutlined style={{ color: '#bbb', marginRight: 8, cursor: 'grab', fontSize: 14 }} />
              )}
              <Space style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleOpen(product.id)}>
                <Text strong style={{ fontSize: 16 }}>{product.productName}</Text>
                {selectedCount > 0 && <Tag color="blue">{selectedCount} 項已選</Tag>}
              </Space>
              <span
                style={{ cursor: 'pointer', color: '#999', marginLeft: 8 }}
                onClick={() => toggleOpen(product.id)}
              >
                {isOpen ? <UpOutlined /> : <DownOutlined />}
              </span>
            </div>
            {isOpen && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                {product.brands.map(b => (
                  <Checkbox
                    key={b.name}
                    checked={!!(prodSel[b.name])}
                    onChange={e => onToggle(category, product.id, b.name, e.target.checked)}
                  >
                    <Space size={4}>
                      <span style={{ fontSize: 16 }}>{b.name}</span>
                      <Tag color={gradeColor(b.grade)} style={{ fontSize: 12, margin: 0 }}>{b.grade}</Tag>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜尋品名或廠牌（搜尋時停用拖曳排序）"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
        <Text type="secondary">已選 {selectedCount} 項</Text>
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

  if (rows.length === 0) return <Empty description="尚未選擇任何廠牌" />

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
        <Title level={5} style={{ marginBottom: 8 }}>{projectCode}廠牌建議表</Title>
      )}
      <div style={{ marginBottom: 8 }}>
        <Button icon={<DownloadOutlined />} onClick={handleExportWord} disabled={rows.length === 0}>
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

  if (!projectCode.trim()) return <Text type="secondary">請輸入案件工號以查詢歷史記錄</Text>
  if (loading) return <Spin />
  if (reports.length === 0) return <Empty description="無歷史記錄" />

  const versions = groupByVersion(reports)

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {versions.map(v => {
        const isExpanded = expandedKeys.has(v.versionKey)
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

        return (
          <Card
            key={v.versionKey}
            size="small"
            style={{ borderRadius: 8 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <Text strong style={{ fontSize: 15 }}>{v.displayTime}</Text>
                  <Tag color="blue">共 {totalBrands} 項廠牌</Tag>
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
            <Text type="secondary" style={{ fontSize: 13 }}>{catSummary}</Text>
            {isExpanded && (
              <div style={{ marginTop: 8 }}>
                {Object.entries(merged).map(([cat, catSel]) =>
                  Object.keys(catSel).length === 0 ? null : (
                    <div key={cat} style={{ marginBottom: 6 }}>
                      <Text strong style={{ fontSize: 13 }}>{cat}：</Text>
                      {Object.entries(catSel).map(([productName, brands]) => (
                        <div key={productName} style={{ paddingLeft: 12, marginTop: 2 }}>
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
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin />
        <div style={{ marginTop: 12, color: '#888' }}>載入工程列表中…</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew}>
          建立新工程
        </Button>
      </div>
      {projects.length === 0 ? (
        <Empty description="尚無工程，請點擊「建立新工程」" style={{ marginTop: 40 }} />
      ) : (
        years.map(year => (
          <div key={year} style={{ marginBottom: 20 }}>
            <div style={{
              fontWeight: 600, fontSize: 15, color: '#555', marginBottom: 8,
              padding: '4px 0', borderBottom: '2px solid #e8e8e8',
            }}>
              民國 {year} 年度
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projectsByYear[year].map(project => (
                <div
                  key={project.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '10px 16px', background: '#fafafa',
                    border: '1px solid #f0f0f0', borderRadius: 8,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e6f4ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}
                  onClick={() => onSelect(project)}
                >
                  <div style={{ flex: 1 }}>
                    <Space>
                      <Text strong style={{ fontSize: 15 }}>{project.projectName}</Text>
                      <Tag color="default">{project.projectCode}</Tag>
                    </Space>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {project.versionCount > 0
                          ? `已存 ${project.versionCount} 版 · 最後修改：${project.lastSavedAt
                              ? new Date(project.lastSavedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
                              : '—'}`
                          : '尚無存檔記錄'
                        }
                      </Text>
                    </div>
                  </div>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={e => { e.stopPropagation(); onDelete(project) }}
                  />
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
    return { value: y, label: `${y} 年` }
  })

  return (
    <Modal
      title="建立新工程"
      open={open}
      onCancel={() => { reset(); onClose() }}
      onOk={handleSubmit}
      okText="建立"
      cancelText="取消"
      confirmLoading={creating}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>年度（民國）</div>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: '100%' }}
            options={yearOptions}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>工程編號</div>
          <Input
            placeholder="e.g. PJ2024-001"
            value={projectCode}
            onChange={e => setProjectCode(e.target.value)}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>工程名稱</div>
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

  // Project management state
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [currentProject, setCurrentProject] = useState<ProjectWithStats | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ project: ProjectWithStats | null; visible: boolean }>({ project: null, visible: false })
  const [deleting, setDeleting] = useState(false)

  // Load brands
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

  // Load projects
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
      // Refresh project stats
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

  // Project name banner shown when a project is selected
  const projectBanner = currentProject ? (
    <div style={{
      marginBottom: 10, padding: '6px 14px',
      background: '#e6f4ff', borderRadius: 6,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <ProjectOutlined style={{ color: '#1677ff' }} />
      <Text style={{ color: '#1677ff' }}>工程：</Text>
      <Text strong>{currentProject.projectName}</Text>
      <Tag>{currentProject.projectCode}</Tag>
    </div>
  ) : null

  const mainTabItems = [
    {
      key: 'projects',
      label: (
        <Space>
          <ProjectOutlined />
          工程列表
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
        <Space>
          <FileTextOutlined />
          廠牌選擇
          {totalSelected > 0 && <Tag color="blue">{totalSelected}</Tag>}
        </Space>
      ),
      children: (
        <div>
          {projectBanner}
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Input
              addonBefore="案件工號"
              placeholder="e.g. PJ2024-001"
              value={projectCode}
              onChange={e => { setProjectCode(e.target.value); setCurrentProject(null) }}
              style={{ width: 280 }}
            />
            <Input
              addonBefore="修改摘要"
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
            items={CATEGORIES.map(cat => ({
              key: cat,
              label: (
                <Space size={4}>
                  {cat}
                  {Object.values(selections[cat] ?? {}).some(p => Object.values(p).some(Boolean)) && (
                    <Tag color="blue" style={{ margin: 0 }}>
                      {Object.values(selections[cat] ?? {}).reduce(
                        (a, p) => a + Object.values(p).filter(Boolean).length, 0
                      )}
                    </Tag>
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
            }))}
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
          <div style={{ marginBottom: 12 }}>
            <Space wrap>
              <Input
                addonBefore="案件工號"
                placeholder="e.g. PJ2024-001"
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
          <div style={{ marginBottom: 12 }}>
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
      <div style={{ marginBottom: 16 }}>
        <Space align="center">
          <FileTextOutlined style={{ fontSize: 22, color: '#1a7a4a' }} />
          <Title level={4} style={{ margin: 0, color: '#1a7a4a' }}>案件廠牌表規劃系統</Title>
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary">依類別選擇廠牌，生成案件廠牌表，並儲存歷史記錄</Text>
        </div>
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
        title={`刪除工程「${deleteModal.project?.projectName ?? ''}」`}
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
        <p>
          確定要刪除「<strong>{deleteModal.project?.projectName}</strong>」（{deleteModal.project?.projectCode}）？
        </p>
        {(deleteModal.project?.versionCount ?? 0) > 0 && (
          <Alert
            type="warning"
            message={`此工程有 ${deleteModal.project?.versionCount} 筆存檔記錄，可選擇是否一併刪除。`}
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Modal>
    </div>
  )
}
