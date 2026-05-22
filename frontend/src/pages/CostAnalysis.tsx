import { useEffect, useState } from 'react'
import { Select, Space, Card, Table, Typography, Tag, Row, Col } from 'antd'
import { api } from '../api'
import type { PriceTrend, Equipment, Material, PricingRecord } from '../types'
import CostTrendChart from '../components/CostTrendChart'

type EntityOption = { label: string; value: string; entityType: 'equipment' | 'material' }

export default function CostAnalysis() {
  const [options, setOptions] = useState<EntityOption[]>([])
  const [selected, setSelected] = useState<EntityOption>()
  const [trend, setTrend] = useState<PriceTrend[]>([])
  const [records, setRecords] = useState<PricingRecord[]>([])

  useEffect(() => {
    Promise.all([api.equipment.list(), api.materials.list()]).then(([eq, mat]) => {
      const opts: EntityOption[] = [
        ...eq.map((e: Equipment) => ({ label: `[設備] ${e.name}`, value: e.id, entityType: 'equipment' as const })),
        ...mat.map((m: Material) => ({ label: `[材料] ${m.name}`, value: m.id, entityType: 'material' as const })),
      ]
      setOptions(opts)
    })
  }, [])

  const handleSelect = async (value: string) => {
    const opt = options.find(o => o.value === value)
    if (!opt) return
    setSelected(opt)
    const [tr, pr] = await Promise.all([
      api.pricing.trend(opt.entityType, opt.value),
      api.pricing.list(opt.entityType, opt.value),
    ])
    setTrend(tr)
    setRecords(pr)
  }

  const trendColumns = [
    { title: '年度', dataIndex: 'year', key: 'year', render: (v: number) => `${v}年` },
    { title: '平均金額', dataIndex: 'avgPrice', key: 'avg', render: (v: number) => v.toLocaleString('zh-TW') },
    { title: '最低', dataIndex: 'minPrice', key: 'min', render: (v: number) => v.toLocaleString('zh-TW'), responsive: ['sm' as const] },
    { title: '最高', dataIndex: 'maxPrice', key: 'max', render: (v: number) => v.toLocaleString('zh-TW'), responsive: ['sm' as const] },
    { title: '筆數', dataIndex: 'count', key: 'count', width: 70 },
    {
      title: '年度變化',
      key: 'change',
      render: (_: unknown, r: PriceTrend, idx: number) => {
        if (idx === trend.length - 1) return '—'
        const prev = trend[idx + 1]
        const pct = ((r.avgPrice - prev.avgPrice) / prev.avgPrice * 100).toFixed(1)
        const up = r.avgPrice > prev.avgPrice
        return <Tag color={up ? 'red' : 'green'}>{up ? '▲' : '▼'} {Math.abs(Number(pct))}%</Tag>
      },
      responsive: ['md' as const],
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>費用趨勢分析</Typography.Title>

      <Space style={{ marginBottom: 20 }}>
        <Select
          showSearch
          placeholder="選擇設備或材料"
          style={{ width: 320 }}
          options={options}
          onChange={handleSelect}
          optionFilterProp="label"
        />
      </Space>

      {selected ? (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title={`${selected.label} — 歷年費用趨勢`} size="small">
              <CostTrendChart data={[...trend].reverse()} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="年度統計" size="small">
              <Table
                size="small"
                dataSource={trend}
                columns={trendColumns}
                rowKey="year"
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={`原始費用記錄（${records.length}筆）`} size="small">
              <Table
                size="small"
                dataSource={records}
                rowKey="id"
                pagination={{ pageSize: 6, showSizeChanger: false }}
                columns={[
                  { title: '日期', dataIndex: 'priceDate', key: 'date', width: 110 },
                  { title: '金額', dataIndex: 'price', key: 'price', render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v.toLocaleString('zh-TW')}</span> },
                  { title: '供應商', dataIndex: 'supplier', key: 'supplier', responsive: ['sm' as const] },
                ]}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Card style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
          請選擇上方的設備或材料以查看費用趨勢分析
        </Card>
      )}
    </div>
  )
}
