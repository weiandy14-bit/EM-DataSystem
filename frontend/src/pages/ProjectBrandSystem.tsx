import { FileTextOutlined } from '@ant-design/icons'
import { Typography, Spin } from 'antd'

export default function ProjectBrandSystem() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 0', color: '#888' }}>
      <FileTextOutlined style={{ fontSize: 52, color: '#1a7a4a', display: 'block', marginBottom: 20 }} />
      <Typography.Title level={3} style={{ color: '#1a7a4a', marginBottom: 8 }}>
        案件廠牌表規劃系統
      </Typography.Title>
      <Typography.Text type="secondary">功能建置中，敬請期待</Typography.Text>
    </div>
  )
}
