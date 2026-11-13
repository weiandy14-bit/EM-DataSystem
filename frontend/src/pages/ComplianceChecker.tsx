import { Alert, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { FileTextOutlined, SearchOutlined, ToolOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

const checks = [
  {
    icon: <SearchOutlined />,
    title: 'CNS 標準有效性',
    description: '辨識 CNS 編號，檢查是否有效、修訂、廢止或已有取代標準。',
    color: '#1F4E79',
    background: '#EBF3FB',
  },
  {
    icon: <FileTextOutlined />,
    title: '法規引用',
    description: '檢查法規名稱、條號、有效期間與引用內容是否一致。',
    color: '#1A7A4A',
    background: '#E8F5EE',
  },
  {
    icon: <ToolOutlined />,
    title: '限制競爭風險',
    description: '標示特定品牌、型號、產地、原廠授權及缺少同等品等疑似限制競爭文字。',
    color: '#AD6800',
    background: '#FFF7E6',
  },
]

export default function ComplianceChecker() {
  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 8px' }}>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div>
          <Tag color="blue">規劃建置中</Tag>
          <Title level={2} style={{ color: '#1F4E79', margin: '12px 0 8px' }}>
            規範合規檢查
          </Title>
          <Paragraph style={{ fontSize: 15, color: '#666', marginBottom: 0 }}>
            上傳工程規範後，系統將協助檢查 CNS 標準、法規引用及疑似限制競爭文字。
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="目前已建立系統入口"
          description="文件上傳、檢查規則與人工覆核流程將依確認後的需求分階段建置。"
        />

        <Row gutter={[16, 16]}>
          {checks.map((check) => (
            <Col key={check.title} xs={24} md={8}>
              <Card style={{ height: '100%', borderRadius: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: check.background,
                    color: check.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 16,
                  }}
                >
                  {check.icon}
                </div>
                <Title level={4}>{check.title}</Title>
                <Text type="secondary">{check.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Card title="預定作業流程" style={{ borderRadius: 12 }}>
          <Text>選擇工程 → 上傳 DOCX／PDF → 執行檢查 → 人工覆核 → 匯出報告</Text>
        </Card>
      </Space>
    </div>
  )
}
