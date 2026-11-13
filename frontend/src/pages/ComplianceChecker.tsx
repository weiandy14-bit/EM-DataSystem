import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Button, Card, Col, Collapse, Divider, Empty, Form, Input,
  List, Row, Select, Space, Spin, Tag, Typography, Upload, message,
} from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, InboxOutlined,
  ReloadOutlined, SafetyCertificateOutlined, SearchOutlined, ToolOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type {
  ComplianceCandidateProduct, ComplianceCase, ComplianceRequirement, ProjectWithStats,
} from '../types'

const { Title, Paragraph, Text } = Typography
const { Dragger } = Upload

const MAX_FILE_SIZE = 15 * 1024 * 1024
const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const MAX_FILE_COUNT = 10
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
  systems?: string[]
  scopeNotes?: string
  notes?: string
}

const emptyCandidates = (): ComplianceCandidateProduct[] =>
  Array.from({ length: 3 }, () => ({ brand: '', series: '', model: '' }))

const statusColor: Record<string, string> = {
  '待分析': 'default',
  '分析中': 'processing',
  '待覆核': 'warning',
  '已完成': 'success',
}

const riskColor: Record<string, string> = {
  '未判定': 'default',
  '低': 'green',
  '中': 'gold',
  '高': 'orange',
  '重大': 'red',
  '通過': 'green',
  '注意': 'gold',
  '高風險': 'orange',
  '不符合': 'red',
  '無法判定': 'purple',
}

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
  const [sourceFiles, setSourceFiles] = useState<File[]>([])
  const [candidates, setCandidates] = useState<ComplianceCandidateProduct[]>(emptyCandidates)
  const [saving, setSaving] = useState(false)
  const [createdCase, setCreatedCase] = useState<ComplianceCase | null>(null)
  const [cases, setCases] = useState<ComplianceCase[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [requirements, setRequirements] = useState<Record<string, ComplianceRequirement[]>>({})
  const [requirementsLoading, setRequirementsLoading] = useState<string | null>(null)

  const loadCases = useCallback(async (quiet = false) => {
    if (!quiet) setCasesLoading(true)
    try {
      setCases(await api.complianceCases.list())
    } catch (error) {
      if (!quiet) message.error(error instanceof Error ? error.message : '案件資料載入失敗')
    } finally {
      if (!quiet) setCasesLoading(false)
    }
  }, [])

  useEffect(() => {
    api.projects.list()
      .then(setProjects)
      .catch(error => message.error(error instanceof Error ? error.message : '工程資料載入失敗'))
      .finally(() => setProjectsLoading(false))
  }, [])

  useEffect(() => {
    loadCases()
    const timer = window.setInterval(() => loadCases(true), 15000)
    return () => window.clearInterval(timer)
  }, [loadCases])

  const loadRequirements = async (caseId: string) => {
    setRequirementsLoading(caseId)
    try {
      const items = await api.complianceCases.requirements(caseId)
      setRequirements(current => ({
        ...current,
        [caseId]: items,
      }))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '分析結果載入失敗')
    } finally {
      setRequirementsLoading(null)
    }
  }

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
    setSourceFiles(current => {
      if (current.some(item => item.name === file.name && item.size === file.size)) return current
      if (current.length >= MAX_FILE_COUNT) {
        message.error(`一次最多上傳 ${MAX_FILE_COUNT} 份文件`)
        return current
      }
      if (current.reduce((total, item) => total + item.size, 0) + file.size > MAX_TOTAL_SIZE) {
        message.error('全部文件合計不得超過 50 MB')
        return current
      }
      return [...current, file]
    })
    return false
  }

  const handleSubmit = async (values: FormValues) => {
    if (sourceFiles.length === 0) {
      message.warning('請先上傳至少一份原始規範')
      return
    }

    setSaving(true)
    try {
      const files = await Promise.all(sourceFiles.map(async file => ({
        fileBase64: await fileToBase64(file),
        fileName: file.name,
        fileType: supportedFileType(file)!,
      })))
      const result = await api.complianceCases.create({
        ...values,
        candidates: candidates.filter(candidate => candidate.brand.trim()),
        files,
      })
      setCreatedCase(result)
      form.resetFields()
      setSourceFiles([])
      setCandidates(emptyCandidates())
      await loadCases(true)
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
            上傳第 13、15、16 篇機水電規範，保存文件範圍與已知候選產品，建立後續章碼、CNS及限制條件查核案件。
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
            { icon: <SearchOutlined />, title: 'CNS強制查核', text: '每一筆CNS均查最新版、廢止及取代關係', color: '#1F4E79' },
            { icon: <FileTextOutlined />, title: '法規引用', text: '法規名稱、條號與引用內容是否一致', color: '#1A7A4A' },
            { icon: <ToolOutlined />, title: '限制條件', text: '尺寸、容量、性能、型式與條件組合的實質影響', color: '#AD6800' },
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

        <Card
          title={<Space><ClockCircleOutlined />本機分析案件</Space>}
          extra={<Button icon={<ReloadOutlined />} onClick={() => loadCases()} loading={casesLoading}>重新整理</Button>}
          style={{ borderRadius: 12 }}
        >
          <Alert
            type="info"
            showIcon
            message="網頁負責案件操作，本機分析器在背景處理"
            description="待分析案件會由已啟動的本機分析器自動領取；本頁每15秒更新進度。電腦未啟動分析器時，案件會安全保留在待分析。"
            style={{ marginBottom: 16 }}
          />
          <Spin spinning={casesLoading}>
            {cases.length === 0 ? <Empty description="尚無規範檢查案件" /> : (
              <Collapse
                accordion
                onChange={key => {
                  const caseId = Array.isArray(key) ? key[0] : key
                  if (caseId) loadRequirements(String(caseId))
                }}
                items={cases.map(item => ({
                  key: item.id,
                  label: (
                    <Space wrap>
                      <Text strong>{item.caseName}</Text>
                      <Tag color={statusColor[item.status] ?? 'default'}>{item.status || '未設定'}</Tag>
                      <Tag color={riskColor[item.highestRisk] ?? 'default'}>風險：{item.highestRisk || '未判定'}</Tag>
                      <Text type="secondary">{item.fileCount} 份文件</Text>
                    </Space>
                  ),
                  children: requirementsLoading === item.id ? <Spin /> : (
                    <RequirementList items={requirements[item.id] ?? []} status={item.status} />
                  ),
                }))}
              />
            )}
          </Spin>
        </Card>

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

            <Form.Item label="原始規範" required extra="支援 DOCX、PDF；最多10份，單檔15 MB、合計50 MB。">
              <Dragger
                accept=".docx,.pdf"
                multiple
                maxCount={MAX_FILE_COUNT}
                beforeUpload={file => handleFile(file as File)}
                onRemove={file => {
                  setSourceFiles(current => current.filter(item => `${item.name}-${item.size}` !== file.uid))
                  return true
                }}
                fileList={sourceFiles.map(file => ({
                  uid: `${file.name}-${file.size}`,
                  name: file.name,
                  status: 'done' as const,
                  size: file.size,
                  type: file.type,
                }))}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">點選或拖曳一份或多份規範文件到此處</p>
                <p className="ant-upload-hint">可同時包含管材、線材、設備、機具、施工及試驗規範</p>
              </Dragger>
            </Form.Item>

            <Divider titlePlacement="left">規範範圍與工程系統</Divider>
            <Form.Item
              label="可能涉及的工程系統"
              name="systems"
              extra="可複選；不確定時可留空，後續由章碼與內文辨識。"
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="例如：消防、空調、電力"
                options={['給水', '排水', '消防', '空調', '電力', '弱電監控', '其他'].map(value => ({ value, label: value }))}
              />
            </Form.Item>
            <Form.Item label="規範範圍說明" name="scopeNotes">
              <Input.TextArea
                rows={4}
                placeholder="例如：包含15223不鏽鋼管、16120電線電纜、16401低壓配電盤及火警受信總機；請逐條辨識尺寸、容量、性能、型式與CNS引用。"
              />
            </Form.Item>

            <Divider titlePlacement="left">已知候選產品（選填，最多三組）</Divider>
            <Alert
              type="info"
              showIcon
              message="請填寫廠牌、產品系列及型號"
              description="候選產品應對應特定設備或材料；案件建立後仍可在規範條件中補充。僅填廠牌不足以判斷符合性。"
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
              <Input.TextArea rows={3} placeholder="例如：請特別檢查96×96 mm、150%持續1分鐘、受信總機20L及GR型等條件是否有必要性與三家產品證據。" />
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

function RequirementList({ items, status }: { items: ComplianceRequirement[]; status: string }) {
  if (items.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={status === '待分析' ? '等待本機分析器領取' : status === '分析中' ? '正在解析文件' : '尚無可顯示的初篩結果'}
      />
    )
  }
  return (
    <List
      dataSource={items}
      pagination={items.length > 10 ? { pageSize: 10, size: 'small' } : false}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            title={(
              <Space wrap>
                <Text strong>{item.title}</Text>
                <Tag>{item.conditionType}</Tag>
                <Tag color={riskColor[item.risk] ?? 'default'}>{item.risk}</Tag>
                {item.marketCheck && <Tag color="blue">需市場驗證</Tag>}
              </Space>
            )}
            description={(
              <Space direction="vertical" size={3} style={{ width: '100%' }}>
                <Text type="secondary">{item.fileName}／{item.location}</Text>
                <Text>{item.sourceText}</Text>
                <Text><Text strong>判定理由：</Text>{item.reason}</Text>
                <Text><Text strong>建議：</Text>{item.suggestion}</Text>
              </Space>
            )}
          />
        </List.Item>
      )}
    />
  )
}
