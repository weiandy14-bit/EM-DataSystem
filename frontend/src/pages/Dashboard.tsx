import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Typography } from 'antd'
import { BuildOutlined, AppstoreOutlined, AuditOutlined, DollarOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { InspectionRecord } from '../types'
import CostTrendChart from '../components/CostTrendChart'
import type { PriceTrend } from '../types'

const resultColor = { pass: 'success', fail: 'error', conditional: 'warning' } as const
const resultLabel = { pass: '通過', fail: '不通過', conditional: '有條件通過' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ eq: 0, mat: 0, ins: 0 })
  const [recentInspections, setRecentInspections] = useState<InspectionRecord[]>([])
  const [trend, setTrend] = useState<PriceTrend[]>([])

  useEffect(() => {
    Promise.all([
      api.equipment.list(),
      api.materials.list(),
      api.inspection.list(),
      api.pricing.allTrend(),
    ]).then(([eq, mat, ins, tr]) => {
      setCounts({ eq: eq.length, mat: mat.length, ins: ins.length })
      setRecentInspections(ins.slice(0, 5))
      setTrend(tr)
    })
  }, [])

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>系統總覽</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/equipment')}>
            <Statistic title="設備總數" value={counts.eq} prefix={<BuildOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/materials')}>
            <Statistic title="材料總數" value={counts.mat} prefix={<AppstoreOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/inspection')}>
            <Statistic title="檢查記錄" value={counts.ins} prefix={<AuditOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/cost')}>
            <Statistic title="費用分析" value="查看趨勢" prefix={<DollarOutlined />} valueStyle={{ color: '#722ed1', fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="全系統費用趨勢" size="small">
            <CostTrendChart data={trend} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近檢查記錄" size="small">
            <List
              size="small"
              dataSource={recentInspections}
              renderItem={item => (
                <List.Item
                  extra={<Tag color={resultColor[item.result]}>{resultLabel[item.result]}</Tag>}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/inspection')}
                >
                  <List.Item.Meta
                    title={item.entityName}
                    description={`${item.inspectionDate}  ·  ${item.inspector}  ·  ${item.findings.slice(0, 40)}…`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
