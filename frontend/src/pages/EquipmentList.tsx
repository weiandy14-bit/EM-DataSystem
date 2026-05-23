import { useState } from 'react'
import { Button, Collapse, Checkbox, Select, Input, Table, Drawer, Tabs, Tag, Space, Descriptions, Typography } from 'antd'
import { FilterOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Equipment, Specification, PricingRecord } from '../types'
import SpecHistory from '../components/SpecHistory'

const BUILDING_CATEGORIES = ['辦公大樓', '五星旅館', '商辦大樓', 'Internet Data Center', '二工裝修']

const currentRocYear = new Date().getFullYear() - 1911
const ROC_YEARS = Array.from({ length: currentRocYear - 99 }, (_, i) => 100 + i)

type EquipmentRow = Equipment & {
  budgetPrice: number | null
  inquiryYear: number | null
  projectCode: string
}

export default function EquipmentList() {
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([])
  const [yearStart, setYearStart] = useState<number | undefined>()
  const [yearEnd, setYearEnd] = useState<number | undefined>()
  const [equipmentName, setEquipmentName] = useState('')
  const [data, setData] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [selected, setSelected] = useState<EquipmentRow>()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [prices, setPrices] = useState<PricingRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    setSearched(true)
    const [eqList, allPricing] = await Promise.all([
      api.equipment.list({
        keyword: equipmentName || undefined,
        buildingCategories: selectedBuildings.length ? selectedBuildings : undefined,
        yearStart,
        yearEnd,
      }),
      api.pricing.allEquipmentRecords(),
    ])
    const rows: EquipmentRow[] = eqList.map(eq => {
      const latest = allPricing
        .filter(p => p.entityId === eq.id)
        .sort((a, b) => b.priceDate.localeCompare(a.priceDate))[0] ?? null
      return {
        ...eq,
        budgetPrice: latest?.price ?? null,
        inquiryYear: latest ? new Date(latest.priceDate).getFullYear() : null,
        projectCode: latest?.projectRef ?? '',
      }
    })
    setData(rows)
    setLoading(false)
  }

  const openDetail = async (eq: EquipmentRow) => {
    setSelected(eq)
    setDetailLoading(true)
    const [sp, pr] = await Promise.all([
      api.specs.list('equipment', eq.id),
      api.pricing.list('equipment', eq.id),
    ])
    setSpecs(sp)
    setPrices(pr)
    setDetailLoading(false)
  }

  const columns = [
    {
      title: '項次',
      key: 'index',
      width: 60,
      render: (_: unknown, __: EquipmentRow, idx: number) => idx + 1,
    },
    {
      title: '設備名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '設備規格',
      key: 'spec',
      render: (_: unknown, r: EquipmentRow) => (
        <span>
          <span style={{ fontWeight: 600 }}>{r.manufacturer}</span>
          <span style={{ color: '#888', marginLeft: 6 }}>{r.model}</span>
        </span>
      ),
    },
    {
      title: '設備預算價',
      key: 'price',
      render: (_: unknown, r: EquipmentRow) =>
        r.budgetPrice != null
          ? <span style={{ color: '#1677ff', fontWeight: 600 }}>{r.budgetPrice.toLocaleString('zh-TW')}</span>
          : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '詢價年度',
      key: 'year',
      width: 100,
      render: (_: unknown, r: EquipmentRow) =>
        r.inquiryYear != null ? `${r.inquiryYear}年` : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '案件工號',
      key: 'project',
      render: (_: unknown, r: EquipmentRow) =>
        r.projectCode || <span style={{ color: '#ccc' }}>—</span>,
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* 左欄：篩選面板 */}
      <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '16px 12px' }}>
        <Button type="primary" block style={{ marginBottom: 16, fontWeight: 600 }} onClick={handleConfirm}>
          確定查詢
        </Button>

        <Collapse
          defaultActiveKey={['buildings', 'year', 'name']}
          ghost
          size="small"
          items={[
            {
              key: 'buildings',
              label: <span style={{ fontWeight: 600 }}>建築類別</span>,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {BUILDING_CATEGORIES.map(cat => (
                    <Checkbox
                      key={cat}
                      checked={selectedBuildings.includes(cat)}
                      onChange={e => {
                        if (e.target.checked) setSelectedBuildings(prev => [...prev, cat])
                        else setSelectedBuildings(prev => prev.filter(b => b !== cat))
                      }}
                    >
                      {cat}
                    </Checkbox>
                  ))}
                </div>
              ),
            },
            {
              key: 'year',
              label: <span style={{ fontWeight: 600 }}>年度</span>,
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Select
                    placeholder="起始年度"
                    style={{ width: '100%' }}
                    allowClear
                    value={yearStart}
                    onChange={setYearStart}
                    options={ROC_YEARS.map(y => ({ value: y, label: `民國 ${y} 年` }))}
                  />
                  <Select
                    placeholder="結束年度"
                    style={{ width: '100%' }}
                    allowClear
                    value={yearEnd}
                    onChange={setYearEnd}
                    options={ROC_YEARS.map(y => ({ value: y, label: `民國 ${y} 年` }))}
                  />
                </Space>
              ),
            },
            {
              key: 'name',
              label: <span style={{ fontWeight: 600 }}>設備名稱</span>,
              children: (
                <Input
                  placeholder="模糊搜尋…"
                  value={equipmentName}
                  onChange={e => setEquipmentName(e.target.value)}
                  onPressEnter={handleConfirm}
                  allowClear
                />
              ),
            },
          ]}
        />
      </div>

      {/* 右欄：查詢結果 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!searched ? (
          <div style={{ textAlign: 'center', color: '#bbb', padding: '80px 0' }}>
            <FilterOutlined style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
            <Typography.Text type="secondary">請選擇條件後按「確定查詢」</Typography.Text>
          </div>
        ) : (
          <>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              共 {data.length} 筆，點擊列可查看規格與費用詳情
            </Typography.Text>
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              onRow={r => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
            />
          </>
        )}
      </div>

      {/* 詳情抽屜 */}
      <Drawer
        title={
          <span>
            {selected?.name}
            <Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>{selected?.buildingCategory}</Tag>
          </span>
        }
        open={!!selected}
        onClose={() => setSelected(undefined)}
        width={700}
        loading={detailLoading}
      >
        {selected && (
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本資料',
                children: (
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="公共工程編碼">{selected.publicWorkCode || '—'}</Descriptions.Item>
                    <Descriptions.Item label="建築類別">{selected.buildingCategory}</Descriptions.Item>
                    <Descriptions.Item label="設備產地">{selected.origin || '—'}</Descriptions.Item>
                    <Descriptions.Item label="設備類別">{selected.type}</Descriptions.Item>
                    <Descriptions.Item label="特殊項目">{selected.specialItem || '—'}</Descriptions.Item>
                    <Descriptions.Item label="代理商">{selected.agent || '—'}</Descriptions.Item>
                    <Descriptions.Item label="規格細項">{selected.specDetail || '—'}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'specs',
                label: `規格歷史（${specs.length}版）`,
                children: <SpecHistory specs={specs} />,
              },
              {
                key: 'prices',
                label: `報價紀錄（${prices.length}筆）`,
                children: (
                  <Table
                    size="small"
                    dataSource={prices}
                    rowKey="id"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    columns={[
                      { title: '日期', dataIndex: 'priceDate', key: 'date', width: 120 },
                      {
                        title: '金額（元）',
                        dataIndex: 'price',
                        key: 'price',
                        render: (v: number) => (
                          <span style={{ fontWeight: 600, color: '#1677ff' }}>
                            {v.toLocaleString('zh-TW')}
                          </span>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}
