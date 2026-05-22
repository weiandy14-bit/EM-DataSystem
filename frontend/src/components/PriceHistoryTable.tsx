import { Table, Tag } from 'antd'
import type { PricingRecord, PriceSourceType } from '../types'

const sourceLabel: Record<PriceSourceType, { text: string; color: string }> = {
  contract: { text: '合約', color: 'blue' },
  quote: { text: '報價', color: 'orange' },
  actual: { text: '實際', color: 'green' },
  estimate: { text: '估算', color: 'default' },
}

interface Props {
  records: PricingRecord[]
  loading?: boolean
}

export default function PriceHistoryTable({ records, loading }: Props) {
  const columns = [
    { title: '日期', dataIndex: 'priceDate', key: 'priceDate', width: 110 },
    {
      title: '金額（元）',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1677ff' }}>{v.toLocaleString('zh-TW')}</span>,
    },
    {
      title: '類型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 80,
      render: (v: PriceSourceType) => <Tag color={sourceLabel[v].color}>{sourceLabel[v].text}</Tag>,
    },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier', width: 140 },
    { title: '專案參考', dataIndex: 'projectRef', key: 'projectRef' },
    { title: '備註', dataIndex: 'notes', key: 'notes', responsive: ['lg' as const] },
  ]

  return (
    <Table
      size="small"
      dataSource={records}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10, showSizeChanger: false }}
    />
  )
}
