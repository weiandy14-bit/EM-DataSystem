import { useEffect, useState } from 'react'
import {
  Alert, Button, Card, Col, Divider, Form, Input, InputNumber,
  Row, Select, Space, Tag, Typography, Upload, message,
} from 'antd'
import {
  CheckCircleOutlined, FileTextOutlined, InboxOutlined,
  SafetyCertificateOutlined, SearchOutlined, ToolOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type { ComplianceCandidateProduct, ComplianceCase, ProjectWithStats } from '../types'

const { Title, Paragraph, Text } = Typography
const { Dragger } = Upload

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function supportedFileType(file: File): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return null
}

type FormValues = {
  caseName: string
  projectId?: string
  designPressure?: number
  testPressure?: number
  temperature?: number
  fluid?: string
  pipeRange?: string
  notes?: string
}

const emptyCandidates = (): ComplianceCandidateProduct[] =>
  Array.from({ length: 3 }, () => ({ brand: '', series: '', model: '' }))

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',', 2)[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ComplianceChecker() {
  const [form] = Form.useForm<FormValues>()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [candidates, setCandidates] = useState<ComplianceCandidateProduct[]>(emptyCandidates)
  const [saving, setSaving] = useState(false)
  const [createdCase, setCreatedCase] = useState<ComplianceCase | null>(null)

  useEffect(() => {
    api.projects.list()
      .then(setProjects)
      .catch(error => message.error(error instanceof Error ? error.message : '工程資料載入失敗'))
      .finally(() => setProjectsLoading(false))
  }, [])

  const updateCandidate = (index: number, field: keyof ComplianceCandidateProduct, value: string) => {
    setCandidates(current => current.map((candidate, candidateIndex) =>
      candidateIndex === index ? { ...candidate, [field]: value } : candidate
    ))
  }

  const handleFile = (file: File) => {
    if (!supportedFileType(file)) {
      message.error('僅支援 DOCX 或 PDF 文件')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件不得超過 15 MB')
      return Upload.LIST_IGNORE
    }
    setSourceFile(file)
    return false
  }

  const handleSubmit = async (values: FormValues) => {
    if (!sourceFile) {
      message.warning('請先上傳原始規範')
      return
    }

    setSaving(true)
    try {
      const fileBase64 = await fileToBase64(sourceFile)
      const result = await api.complianceCases.create({
        ...values,
        candidates: candidates.filter(candidate => candidate.brand.trim()),
        fileBase64,
        fileName: sourceFile.name,
        fileType: supportedFileType(sourceFile)!,
      })
      setCreatedCase(result)
      form.resetFields()
      setSourceFile(null)
      setCandidates(emptyCandidates())
      message.success('規範檢查案件已建立')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案件建立失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 1080, margin: '20px auto', padding: '0 8px 40px' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Tag color="blue">第一階段</Tag>
          <Title level={2} style={{ color: '#1F4E79', margin: '10px 0 6px' }}>
            規範合規檢查
          </Title>
          <Paragraph style={{ color: '#666', marginBottom: 0 }}>
            建立檢查案件、保存原始規範及設計條件，並登錄最多三組候選產品供後續查證。
          </Paragraph>
        </div>

        {createdCase && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={`案件「${createdCase.caseName}」已建立`}
            description="文件與案件資料已保存至 Notion，目前狀態為待分析。"
            closable
            onClose={() => setCreatedCase(null)}
          />
        )}

        <Row gutter={[12, 12]}>
          {[
            { icon: <SearchOutlined />, title: '標準有效性', text: 'CNS、SAS、JIS 等標準版本與有效狀態', color: '#1F4E79' },
            { icon: <FileTextOutlined />, title: '法規引用', text: '法規名稱、條號與引用內容是否一致', color: '#1A7A4A' },
            { icon: <ToolOutlined />, title: '限制競爭', text: '特定標準、壓力、品牌或型號的實質影響', color: '#AD6800' },
          ].map(item => (
            <Col xs={24} md={8} key={item.title}>
              <Card size="small" style={{ height: '100%', borderRadius: 10 }}>
                <Space align="start">
                  <span style={{ color: item.color, fontSize: 20 }}>{item.icon}</span>
                  <div><Text strong>{item.title}</Text><br /><Text type="secondary">{item.text}</Text></div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Card title={<Space><SafetyCertificateOutlined />建立檢查案件</Space>} style={{ borderRadius: 12 }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark="optional">
            <Row gutter={16}>
              <Col xs={24} md={14}>
                <Form.Item label="案件名稱" name="caseName" rules={[{ required: true, message: '請輸入案件名稱' }]}>
                  <Input placeholder="例如：15223 不鏽鋼管及管件規範檢查" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item label="所屬工程" name="projectId">
                  <Select
                    allowClear
                    showSearch
                    loading={projectsLoading}
                    placeholder="可選擇既有工程"
                    optionFilterProp="label"
                    options={projects.map(project => ({
                      value: project.id,
                      label: `${project.projectCode}｜${project.projectName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="原始規範" required extra="支援 DOCX、PDF，單一文件上限 15 MB。">
              <Dragger
                accept=".docx,.pdf"
                maxCount={1}
                beforeUpload={file => handleFile(file as File)}
                onRemove={() => { setSourceFile(null); return true }}
                fileList={sourceFile ? [{ uid: 'source', name: sourceFile.name, status: 'done', size: sourceFile.size, type: sourceFile.type }] : []}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">點選或拖曳規範文件到此處</p>
                <p className="ant-upload-hint">文件將透過安全後端直接保存至 Notion</p>
              </Dragger>
            </Form.Item>

            <Divider titlePlacement="left">實際設計需求</Divider>
            <Row gutter={16}>
              <Col xs={12} md={6}>
                <Form.Item label="設計壓力 MPa" name="designPressure">
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="例如 1.0" />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="試驗壓力 MPa" name="testPressure">
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="最高溫度 ℃" name="temperature">
                  <InputNumber min={-50} step={1} style={{ width: '100%' }} placeholder="例如 80" />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="管徑範圍" name="pipeRange">
                  <Input placeholder="例如 13–60 Su" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="流體／使用環境" name="fluid">
              <Input placeholder="例如：常溫生活用水" />
            </Form.Item>

            <Divider titlePlacement="left">候選產品（最多三組）</Divider>
            <Alert
              type="info"
              showIcon
              message="請填寫廠牌、產品系列及型號"
              description="僅填廠牌通常不足以判斷是否符合；系統會以具體產品及官方證據逐項比較。候選產品不是必填，仍可先進行不帶品牌的盲掃。"
              style={{ marginBottom: 16 }}
            />
            {candidates.map((candidate, index) => (
              <Card key={index} size="small" title={`候選產品 ${index + 1}`} style={{ marginBottom: 12, background: '#FAFAFA' }}>
                <Row gutter={[12, 8]}>
                  <Col xs={24} md={8}>
                    <Input value={candidate.brand} onChange={event => updateCandidate(index, 'brand', event.target.value)} placeholder="廠牌，例如 BENKAN" />
                  </Col>
                  <Col xs={24} md={8}>
                    <Input value={candidate.series} onChange={event => updateCandidate(index, 'series', event.target.value)} placeholder="產品系列，例如 Double Press" />
                  </Col>
                  <Col xs={24} md={8}>
                    <Input value={candidate.model} onChange={event => updateCandidate(index, 'model', event.target.value)} placeholder="型號（若有）" />
                  </Col>
                </Row>
              </Card>
            ))}

            <Form.Item label="補充說明" name="notes">
              <Input.TextArea rows={3} placeholder="例如：實際系統僅需 1.0 MPa，請檢查 2.0 MPa 是否構成超額性能條件。" />
            </Form.Item>

            <Alert
              type="warning"
              showIcon
              message="本階段建立待分析案件，不會自動作成違法結論"
              description="後續結果將標示風險與證據來源，最終仍需由設計或採購專業人員覆核。"
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" htmlType="submit" loading={saving} size="large">
              建立並保存待分析案件
            </Button>
          </Form>
        </Card>
      </Space>
    </div>
  )
}
