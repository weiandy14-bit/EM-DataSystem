import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Tabs, Spin, Alert, Button, Checkbox, Input,
  Table, Tag, Space, Typography, message, Empty, Card,
} from 'antd'
import {
  SearchOutlined, SaveOutlined, FileTextOutlined, HistoryOutlined,
  HolderOutlined, UpOutlined, DownOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { BrandMaster, BrandReport } from '../types'

const { Title, Text } = Typography

const CATEGORIES = ['消防', '空調', '電力', '弱電', '給排水', '其他']
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
                <Text strong>{product.productName}</Text>
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
                      <span>{b.name}</span>
                      <Tag color={gradeColor(b.grade)} style={{ fontSize: 10, margin: 0 }}>{b.grade}</Tag>
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
  selected: Array<{ name: string; grade: string }>
  categorySpan: number
}

function ReportPreview({
  brandsMap,
  selections,
  productOrder,
  projectCode,
}: {
  brandsMap: Record<string, BrandMaster[]>
  selections: SelectionMap
  productOrder: Record<string, string[]>
  projectCode: string
}) {
  const rows = useMemo((): PreviewRow[] => {
    const flat: Omit<PreviewRow, 'categorySpan'>[] = []

    for (const cat of PREVIEW_ORDER) {
      const catBrands = brandsMap[cat] ?? []
      const catOrder = productOrder[cat] ?? catBrands.map(b => b.id)
      const catSel = selections[cat] ?? {}

      const orderMap = new Map(catOrder.map((id, i) => [id, i]))
      const ordered = [...catBrands].sort(
        (a, b) => (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity)
      )

      for (const product of ordered) {
        const selected = product.brands
          .filter(b => catSel[product.id]?.[b.name])
          .map(b => ({ name: b.name, grade: b.grade }))
        if (selected.length > 0) {
          flat.push({ key: `${cat}-${product.id}`, category: cat, product: product.productName, selected })
        }
      }
    }

    // Calculate rowSpan for category column grouping
    const result: PreviewRow[] = flat.map(r => ({ ...r, categorySpan: 0 }))
    let i = 0
    while (i < result.length) {
      const cat = result[i].category
      let j = i
      while (j < result.length && result[j].category === cat) j++
      result[i].categorySpan = j - i
      i = j
    }
    return result
  }, [brandsMap, selections, productOrder])

  if (rows.length === 0) return <Empty description="尚未選擇任何廠牌" />

  const columns = [
    {
      title: '分類',
      dataIndex: 'category' as const,
      key: 'category',
      width: 72,
      onCell: (_: PreviewRow, index?: number) => ({
        rowSpan: index != null ? (rows[index]?.categorySpan ?? 1) : 1,
      }),
    },
    {
      title: '品名',
      dataIndex: 'product' as const,
      key: 'product',
      width: '38%',
    },
    {
      title: '選定廠牌',
      dataIndex: 'selected' as const,
      key: 'selected',
      render: (items: Array<{ name: string; grade: string }>) => (
        <Space wrap>
          {items.map(b => <Tag key={b.name} color={gradeColor(b.grade)}>{b.name}</Tag>)}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {projectCode && (
        <Title level={5} style={{ marginBottom: 8 }}>{projectCode} 廠牌表</Title>
      )}
      <Table<PreviewRow>
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
function HistoryPanel({ projectCode }: { projectCode: string }) {
  const [reports, setReports] = useState<BrandReport[]>([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {reports.map(r => {
        const totalSelected = Object.values(r.selections).reduce((acc, arr) => acc + arr.length, 0)
        return (
          <Card key={r.id} size="small" title={
            <Space>
              <Text strong>{r.reportName}</Text>
              <Tag>{r.category}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{r.createdDate}</Text>
            </Space>
          }>
            <Text type="secondary">共 {totalSelected} 項廠牌</Text>
            {r.notes && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.notes}</Text></>}
          </Card>
        )
      })}
    </div>
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
  const [saving, setSaving] = useState(false)
  const [mainTab, setMainTab] = useState<'select' | 'preview' | 'history'>('select')

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

  const handleSave = async () => {
    if (!projectCode.trim()) { message.warning('請輸入案件工號'); return }
    if (totalSelected === 0) { message.warning('請至少選擇一個廠牌'); return }

    const categoriesToSave = CATEGORIES.filter(cat => {
      const catSel = selections[cat] ?? {}
      return Object.values(catSel).some(p => Object.values(p).some(Boolean))
    })
    if (categoriesToSave.length === 0) { message.warning('無已選廠牌可儲存'); return }

    setSaving(true)
    try {
      await Promise.all(categoriesToSave.map(cat => {
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
        return api.brandReports.create({
          reportName: `${projectCode}-${cat}`,
          projectCode: projectCode.trim(),
          category: cat,
          selections: byProduct,
        })
      }))
      message.success(`已儲存 ${projectCode} 廠牌表`)
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

  const mainTabItems = [
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
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                addonBefore="案件工號"
                placeholder="e.g. PJ2024-001"
                value={projectCode}
                onChange={e => setProjectCode(e.target.value)}
                style={{ width: 280 }}
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
        <ReportPreview
          brandsMap={brandsMap}
          selections={selections}
          productOrder={productOrder}
          projectCode={projectCode}
        />
      ),
    },
    {
      key: 'history',
      label: <Space><HistoryOutlined />歷史查詢</Space>,
      children: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Input
              addonBefore="案件工號"
              placeholder="輸入案件工號查詢歷史"
              value={projectCode}
              onChange={e => setProjectCode(e.target.value)}
              style={{ width: 280 }}
            />
          </div>
          <HistoryPanel projectCode={projectCode} />
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
    </div>
  )
}
