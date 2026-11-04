import { useState, useEffect, useMemo } from 'react'
import {
  Tabs, Spin, Alert, Button, Checkbox, Input, Select,
  Table, Tag, Space, Collapse, Typography, message, Empty, Card,
} from 'antd'
import {
  SearchOutlined, SaveOutlined, FileTextOutlined, HistoryOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { BrandMaster, BrandReport } from '../types'

const { Title, Text } = Typography

const CATEGORIES = ['消防', '空調', '電力', '弱電', '給排水', '其他']

// category → productId → brandName → selected
type SelectionMap = Record<string, Record<string, Record<string, boolean>>>

function gradeColor(grade: string) {
  if (grade === '國外A') return 'gold'
  if (grade === '國內A') return 'green'
  if (grade === '國內B') return 'blue'
  return 'default'
}

// ---- Brand Selector Tab ----
function BrandSelectorTab({
  category,
  brands,
  selections,
  onToggle,
}: {
  category: string
  brands: BrandMaster[]
  selections: SelectionMap
  onToggle: (category: string, productId: string, brandName: string, checked: boolean) => void
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜尋品名或廠牌"
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
        <Collapse
          size="small"
          defaultActiveKey={filtered.slice(0, 3).map(p => p.id)}
          items={filtered.map(product => {
            const prodSel = catSel[product.id] ?? {}
            const selectedInProduct = Object.values(prodSel).filter(Boolean).length
            return {
              key: product.id,
              label: (
                <Space>
                  <Text strong>{product.productName}</Text>
                  {selectedInProduct > 0 && (
                    <Tag color="blue">{selectedInProduct} 項已選</Tag>
                  )}
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                  {product.brands.map(b => (
                    <Checkbox
                      key={b.name}
                      checked={!!(prodSel[b.name])}
                      onChange={e => onToggle(category, product.id, b.name, e.target.checked)}
                    >
                      <Space size={4}>
                        <span>{b.name}</span>
                        <Tag color={gradeColor(b.grade)} style={{ fontSize: 10, margin: 0 }}>
                          {b.grade}
                        </Tag>
                      </Space>
                    </Checkbox>
                  ))}
                </div>
              ),
            }
          })}
        />
      )}
    </div>
  )
}

// ---- Generated Report Preview ----
function ReportPreview({
  category,
  brands,
  selections,
}: {
  category: string
  brands: BrandMaster[]
  selections: SelectionMap
}) {
  const catSel = selections[category] ?? {}

  const rows = useMemo(() =>
    brands
      .map(product => ({
        product: product.productName,
        selected: product.brands
          .filter(b => catSel[product.id]?.[b.name])
          .map(b => ({ name: b.name, grade: b.grade })),
      }))
      .filter(r => r.selected.length > 0),
    [brands, catSel]
  )

  if (rows.length === 0) return <Empty description="尚未選擇任何廠牌" />

  const columns = [
    { title: '品名', dataIndex: 'product', key: 'product', width: '40%' },
    {
      title: '選定廠牌',
      dataIndex: 'selected',
      key: 'selected',
      render: (items: Array<{ name: string; grade: string }>) => (
        <Space wrap>
          {items.map(b => (
            <Tag key={b.name} color={gradeColor(b.grade)}>{b.name}</Tag>
          ))}
        </Space>
      ),
    },
  ]

  return (
    <Table
      dataSource={rows}
      columns={columns}
      rowKey="product"
      pagination={false}
      size="small"
      bordered
    />
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
  const [projectCode, setProjectCode] = useState('')
  const [previewCategory, setPreviewCategory] = useState(CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [mainTab, setMainTab] = useState<'select' | 'preview' | 'history'>('select')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all(
      CATEGORIES.map(cat => api.brands.list({ category: cat }).then(list => [cat, list] as const))
    )
      .then(results => setBrandsMap(Object.fromEntries(results)))
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
        const byProduct: Record<string, string[]> = {}
        for (const product of brandsMap[cat] ?? []) {
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
                  onToggle={handleToggle}
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
          <div style={{ marginBottom: 12 }}>
            <Select
              value={previewCategory}
              onChange={setPreviewCategory}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              style={{ width: 120 }}
            />
          </div>
          <Title level={5} style={{ marginBottom: 8 }}>
            {previewCategory} 廠牌表
            {projectCode && <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>{projectCode}</Text>}
          </Title>
          <ReportPreview
            category={previewCategory}
            brands={brandsMap[previewCategory] ?? []}
            selections={selections}
          />
        </div>
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
