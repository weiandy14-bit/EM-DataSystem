import { useState } from 'react'
import { Select, Card, Descriptions, Tag, Table, Badge, Typography, Space, Empty, Spin, Divider } from 'antd'
import { SearchOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { InspectionLookupResult, Equipment, Material } from '../types'
import { mockEquipment, mockMaterials } from '../mock/data'

const resultConfig = {
  pass: { color: 'success', icon: <CheckCircleOutlined />, label: '通過' },
  fail: { color: 'error', icon: <CloseCircleOutlined />, label: '不通過' },
  conditional: { color: 'warning', icon: <ExclamationCircleOutlined />, label: '有條件通過' },
} as const

type EntityOption = { label: string; value: string; entityType: 'equipment' | 'material' }

const allOptions: EntityOption[] = [
  ...mockEquipment.map((e: Equipment) => ({ label: `[設備] ${e.name}（${e.manufacturer}）`, value: e.id, entityType: 'equipment' as const })),
  ...mockMaterials.map((m: Material) => ({ label: `[材料] ${m.name}`, value: m.id, entityType: 'material' as const })),
]

export default function InspectionLookup() {
  const [result, setResult] = useState<InspectionLookupResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelect = async (value: string) => {
    const opt = allOptions.find(o => o.value === value)
    if (!opt) return
    setLoading(true)
    const res = await api.inspection.lookup(opt.entityType, opt.value)
    setResult(res)
    setLoading(false)
  }

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>檢查快速查詢</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        搜尋設備或材料，即可查看當前規格、參考費用與上次檢查結果
      </Typography.Text>

      <Select
        showSearch
        size="large"
        placeholder="輸入設備或材料名稱…"
        style={{ width: '100%', maxWidth: 600, marginBottom: 24 }}
        options={allOptions}
        onChange={handleSelect}
        optionFilterProp="label"
        suffixIcon={<SearchOutlined />}
      />

      {loading && <Spin size="large" style={{ display: 'block', marginTop: 40 }} />}

      {!loading && result && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>

          {/* 當前規格 */}
          <Card
            title={<span>📋 當前規格 {result.currentSpec && <Tag color="blue">{result.currentSpec.versionLabel}</Tag>}</span>}
            size="small"
          >
            {result.currentSpec ? (
              <>
                <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 8 }}>
                  {Object.entries(result.currentSpec.specData).map(([k, v]) => (
                    <Descriptions.Item key={k} label={k}><strong>{v}</strong></Descriptions.Item>
                  ))}
                </Descriptions>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  生效日期：{result.currentSpec.effectiveFrom}
                </Typography.Text>
              </>
            ) : (
              <Empty description="尚無規格記錄" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 參考費用 */}
          <Card title="💰 近期費用參考" size="small">
            {result.recentPrices.length ? (
              <Table
                size="small"
                dataSource={result.recentPrices}
                rowKey="id"
                pagination={false}
                columns={[
                  { title: '日期', dataIndex: 'priceDate', key: 'date', width: 110 },
                  {
                    title: '金額（元）', dataIndex: 'price', key: 'price',
                    render: (v: number) => <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 15 }}>{v.toLocaleString('zh-TW')}</span>,
                  },
                  { title: '供應商', dataIndex: 'supplier', key: 'sup' },
                  { title: '專案', dataIndex: 'projectRef', key: 'proj', responsive: ['sm' as const] },
                ]}
              />
            ) : (
              <Empty description="尚無費用記錄" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 上次檢查 */}
          <Card title="🔍 上次檢查結果" size="small">
            {result.lastInspection ? (
              <>
                <Space style={{ marginBottom: 12 }}>
                  <Badge status={resultConfig[result.lastInspection.result].color} />
                  <Tag color={resultConfig[result.lastInspection.result].color}>
                    {resultConfig[result.lastInspection.result].icon}
                    {' '}{resultConfig[result.lastInspection.result].label}
                  </Tag>
                  <span style={{ color: '#888' }}>{result.lastInspection.inspectionDate} · {result.lastInspection.inspector}</span>
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {result.lastInspection.findings}
                </Typography.Paragraph>
              </>
            ) : (
              <Empty description="尚無檢查記錄" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

        </Space>
      )}

      {!loading && !result && (
        <Card style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>
          <SearchOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
          搜尋設備或材料，快速查看規格與費用資訊
        </Card>
      )}
    </div>
  )
}
