import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Tag } from 'antd'
import { SearchOutlined, FileTextOutlined, ToolOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const modules = [
  {
    icon: <SearchOutlined style={{ fontSize: 36 }} />,
    title: '歷史設備價格查詢',
    desc: '查詢歷史設備費用與規格資料，支援多條件篩選、廠牌比較與報表匯出',
    path: '/equipment',
    color: '#1F4E79',
    bg: '#EBF3FB',
    enabled: true,
  },
  {
    icon: <FileTextOutlined style={{ fontSize: 36 }} />,
    title: '案件廠牌表規劃系統',
    desc: '依類別勾選建議廠牌，生成廠牌建議表並儲存歷史案件記錄',
    path: '/brand-system',
    color: '#1a7a4a',
    bg: '#E8F5EE',
    enabled: true,
  },
  {
    icon: <ToolOutlined style={{ fontSize: 36 }} />,
    title: '規劃中',
    desc: '功能開發中，敬請期待',
    path: null,
    color: '#aaa',
    bg: '#fafafa',
    enabled: false,
  },
  {
    icon: <ToolOutlined style={{ fontSize: 36 }} />,
    title: '規劃中',
    desc: '功能開發中，敬請期待',
    path: null,
    color: '#aaa',
    bg: '#fafafa',
    enabled: false,
  },
]

export default function Hub() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 860, margin: '48px auto', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <Title level={2} style={{ color: '#1F4E79', marginBottom: 6, fontWeight: 700 }}>
          機電工程歷史數據管理系統
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>請選擇功能模組</Text>
      </div>

      <Row gutter={[24, 24]}>
        {modules.map((m, i) => (
          <Col key={i} xs={24} sm={12}>
            <Card
              hoverable={m.enabled}
              onClick={() => m.enabled && m.path && navigate(m.path)}
              style={{
                borderRadius: 12,
                border: `1px solid ${m.enabled ? m.color + '30' : '#ebebeb'}`,
                cursor: m.enabled ? 'pointer' : 'default',
                opacity: m.enabled ? 1 : 0.55,
                transition: 'box-shadow 0.2s, border-color 0.2s',
                height: 200,
                background: m.enabled ? '#fff' : '#fafafa',
              }}
              styles={{ body: { padding: 28, height: '100%', boxSizing: 'border-box' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: m.color, flexShrink: 0,
                }}>
                  {m.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: m.enabled ? '#1a1a1a' : '#aaa' }}>
                      {m.title}
                    </span>
                    {!m.enabled && <Tag color="default" style={{ fontSize: 11 }}>即將推出</Tag>}
                  </div>
                  <Text style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>{m.desc}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
