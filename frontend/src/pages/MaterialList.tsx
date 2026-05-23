import { useEffect, useState } from 'react'
import { Table, Input, Select, Space, Button, Tag, Drawer, Tabs } from 'antd'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Material, Specification, PricingRecord, PriceTrend } from '../types'
import SpecHistory from '../components/SpecHistory'
import PriceHistoryTable from '../components/PriceHistoryTable'
import CostTrendChart from '../components/CostTrendChart'

const TYPES = ['空調材料', '電力材料', '給排水材料', '消防材料', '弱電材料', '其他']

export default function MaterialList() {
  const [data, setData] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<string>()
  const [selected, setSelected] = useState<Material>()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [prices, setPrices] = useState<PricingRecord[]>([])
  const [trend, setTrend] = useState<PriceTrend[]>([])

  const load = async () => {
    setLoading(true)
    const res = await api.materials.list({ keyword, type })
    setData(res)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openDetail = async (m: Material) => {
    setSelected(m)
    const [sp, pr, tr] = await Promise.all([
      api.specs.list('material', m.id),
      api.pricing.list('material', m.id),
      api.pricing.trend('material', m.id),
    ])
    setSpecs(sp)
    setPrices(pr)
    setTrend(tr)
  }

  const columns = [
    {
      title: '名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, r: Material) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.grade}</div>
        </div>
      ),
    },
    { title: '類別', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color="green">{v}</Tag>, responsive: ['sm' as const] },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier', responsive: ['md' as const] },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, r: Material) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>詳情</Button>
      ),
    },
  ]

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜尋名稱/供應商"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onPressEnter={load}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="材料類別"
          value={type}
          onChange={setType}
          allowClear
          style={{ width: 150 }}
          options={TYPES.map(t => ({ value: t, label: t }))}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={load}>查詢</Button>
      </Space>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        onRow={r => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
      />

      <Drawer
        title={selected?.name}
        open={!!selected}
        onClose={() => setSelected(undefined)}
        width={640}
      >
        {selected && (
          <Tabs
            items={[
              { key: 'specs', label: `規格歷史（${specs.length}版）`, children: <SpecHistory specs={specs} /> },
              {
                key: 'prices', label: `費用記錄（${prices.length}筆）`,
                children: (
                  <div>
                    <CostTrendChart data={trend} />
                    <div style={{ marginTop: 16 }}><PriceHistoryTable records={prices} /></div>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}
