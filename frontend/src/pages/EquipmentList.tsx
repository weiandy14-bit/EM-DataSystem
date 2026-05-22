import { useEffect, useState } from 'react'
import { Table, Input, Select, Tag, Button, Space, Badge } from 'antd'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Equipment } from '../types'

const TYPES = ['空調設備', '電力設備', '給排水設備', '消防設備', '弱電系統', '機械設備', '電梯/電扶梯', '其他']

export default function EquipmentList() {
  const navigate = useNavigate()
  const [data, setData] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<string>()
  const [status, setStatus] = useState<string>()

  const load = async () => {
    setLoading(true)
    const res = await api.equipment.list({ keyword, type, status })
    setData(res)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const columns = [
    {
      title: '名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, r: Equipment) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{r.manufacturer} {r.model}</div>
        </div>
      ),
    },
    {
      title: '類別',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
      responsive: ['sm' as const],
    },
    {
      title: '安裝日期',
      dataIndex: 'installDate',
      key: 'installDate',
      width: 110,
      responsive: ['md' as const],
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
      responsive: ['lg' as const],
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => v === 'active'
        ? <Badge status="success" text="使用中" />
        : <Badge status="default" text="已停用" />,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: Equipment) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/equipment/${r.id}`)}>詳情</Button>
      ),
    },
  ]

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜尋名稱/品牌/型號"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onPressEnter={load}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="設備類別"
          value={type}
          onChange={setType}
          allowClear
          style={{ width: 150 }}
          options={TYPES.map(t => ({ value: t, label: t }))}
        />
        <Select
          placeholder="狀態"
          value={status}
          onChange={setStatus}
          allowClear
          style={{ width: 120 }}
          options={[{ value: 'active', label: '使用中' }, { value: 'decommissioned', label: '已停用' }]}
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
        onRow={r => ({ onClick: () => navigate(`/equipment/${r.id}`), style: { cursor: 'pointer' } })}
      />
    </div>
  )
}
