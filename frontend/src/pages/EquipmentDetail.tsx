import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Descriptions, Tabs, Badge, Button, Spin, Empty, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Equipment, Specification, PricingRecord, PriceTrend } from '../types'
import SpecHistory from '../components/SpecHistory'
import PriceHistoryTable from '../components/PriceHistoryTable'
import CostTrendChart from '../components/CostTrendChart'

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment>()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [prices, setPrices] = useState<PricingRecord[]>([])
  const [trend, setTrend] = useState<PriceTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.equipment.get(id),
      api.specs.list('equipment', id),
      api.pricing.list('equipment', id),
      api.pricing.trend('equipment', id),
    ]).then(([eq, sp, pr, tr]) => {
      setEquipment(eq)
      setSpecs(sp)
      setPrices(pr)
      setTrend(tr)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />
  if (!equipment) return <Empty description="找不到此設備" />

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/equipment')} style={{ marginBottom: 16 }}>
        返回設備列表
      </Button>

      <Typography.Title level={4} style={{ marginTop: 0 }}>{equipment.name}</Typography.Title>

      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="類別">{equipment.type}</Descriptions.Item>
        <Descriptions.Item label="製造商">{equipment.manufacturer}</Descriptions.Item>
        <Descriptions.Item label="型號">{equipment.model}</Descriptions.Item>
        <Descriptions.Item label="安裝日期">{equipment.installDate}</Descriptions.Item>
        <Descriptions.Item label="位置">{equipment.location}</Descriptions.Item>
        <Descriptions.Item label="狀態">
          {equipment.status === 'active'
            ? <Badge status="success" text="使用中" />
            : <Badge status="default" text="已停用" />}
        </Descriptions.Item>
        {equipment.notes && <Descriptions.Item label="備註" span={3}>{equipment.notes}</Descriptions.Item>}
      </Descriptions>

      <Tabs
        items={[
          {
            key: 'specs',
            label: `規格歷史（${specs.length}版）`,
            children: <SpecHistory specs={specs} />,
          },
          {
            key: 'prices',
            label: `費用記錄（${prices.length}筆）`,
            children: (
              <div>
                <CostTrendChart data={trend} title="歷年費用趨勢" />
                <div style={{ marginTop: 16 }}>
                  <PriceHistoryTable records={prices} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
