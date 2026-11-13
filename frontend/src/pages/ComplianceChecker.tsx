import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Button, Card, Col, Collapse, Divider, Empty, Form, Input,
  List, Row, Select, Space, Spin, Tag, Typography, Upload, message,
} from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, InboxOutlined,
  ExperimentOutlined, ReloadOutlined, SafetyCertificateOutlined, SearchOutlined,
  ThunderboltOutlined, ToolOutlined,
} from '@ant-design/icons'
import { api } from '../api'
import type {
  ComplianceCandidateProduct, ComplianceCase, ComplianceOnlineReport,
  ComplianceRequirement, ComplianceResearchState, ProjectWithStats,
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
  const [submittingMode, setSubmittingMode] = useState<'rules' | 'ai' | null>(null)
  const [createdCase, setCreatedCase] = useState<ComplianceCase | null>(null)
  const [createdMode, setCreatedMode] = useState<'rules' | 'ai'>('rules')
  const [cases, setCases] = useState<ComplianceCase[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [requirements, setRequirements] = useState<Record<string, ComplianceRequirement[]>>({})
  const [requirementsLoading, setRequirementsLoading] = useState<string | null>(null)
  const [research, setResearch] = useState<Record<string, ComplianceResearchState>>({})

  const loadCases = useCallback(async (quiet = false) => {
    if (!quiet) setCasesLoading(true)
    try {
      try { await api.complianceCases.sync() } catch { /* 清單仍應正常顯示 */ }
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
      const [items, online] = await Promise.all([
        api.complianceCases.requirements(caseId),
        api.complianceCases.report(caseId),
      ])
      setRequirements(current => ({
        ...current,
        [caseId]: items,
      }))
      setResearch(current => ({ ...current, [caseId]: online }))
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

  const handleSubmit = async (values: FormValues, analysisMode: 'rules' | 'ai') => {
    if (sourceFiles.length === 0) {
      message.warning('請先上傳至少一份原始規範')
      return
    }
    if (analysisMode === 'ai' && candidates.some(candidate => !candidate.brand.trim())) {
      message.warning('請填寫三家候選產品的廠牌，才能進行線上市場比較')
      return
    }

    setSubmittingMode(analysisMode)
    try {
      const freeRequirements = analysisMode === 'rules'
        ? await import('../utils/freeComplianceAnalyzer').then(module => module.analyzeFilesFree(sourceFiles))
        : undefined
      const files = await Promise.all(sourceFiles.map(async file => ({
        fileBase64: await fileToBase64(file),
        fileName: file.name,
        fileType: supportedFileType(file)!,
      })))
      const result = await api.complianceCases.create({
        ...values,
        candidates: candidates.filter(candidate => candidate.brand.trim()),
        files,
        analysisMode,
        freeRequirements,
      })
      setCreatedCase(result)
      setCreatedMode(analysisMode)
      form.resetFields()
      setSourceFiles([])
      setCandidates(emptyCandidates())
      await loadCases(true)
      if (result.analysisError) message.warning(`案件已保存，但 AI 分析未啟動：${result.analysisError}`)
      else if (analysisMode === 'rules') message.success(`免費檢核已開始，共擷取 ${freeRequirements?.length ?? 0} 項條件`)
      else message.success('案件已建立，AI 三家深度查證已開始')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '案件建立失敗')
    } finally {
      setSubmittingMode(null)
    }
  }

  const submitMode = async (analysisMode: 'rules' | 'ai') => {
    try {
      const values = await form.validateFields()
      await handleSubmit(values, analysisMode)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      message.error(error instanceof Error ? error.message : '表單檢查失敗')
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
            type={createdCase.analysisError ? 'warning' : 'success'}
            showIcon
            icon={<CheckCircleOutlined />}
            message={`案件「${createdCase.caseName}」已建立`}
            description={createdCase.analysisError
              ? `文件已保存至 Notion，但線上分析未啟動：${createdCase.analysisError}`
              : createdMode === 'rules'
                ? '文件已保存至 Notion，免費規則引擎正在擷取條件，並以標檢局官方資料查核 CNS 有效、廢止及取代狀態；不會使用 OpenAI 額度。'
                : '文件已保存至 Notion，AI 正在擷取規範條件並查證三家產品資料。'}
            closable
            onClose={() => setCreatedCase(null)}
          />
        )}

        <Row gutter={[12, 12]}>
          {[
            { icon: <SearchOutlined />, title: 'CNS官方查核', text: '以標檢局開放資料逐筆判斷有效、廢止及取代鏈', color: '#1F4E79' },
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
          title={<Space><ClockCircleOutlined />規範檢查案件</Space>}
          extra={<Button icon={<ReloadOutlined />} onClick={() => loadCases()} loading={casesLoading}>重新整理</Button>}
          style={{ borderRadius: 12 }}
        >
          <Alert
            type="info"
            showIcon
            message="免費規則檢核與 AI 深度查證可分開使用"
            description="免費模式不使用 OpenAI 額度；AI 模式才會搜尋三家原廠資料、判斷等效性並產生具證據的替代條文。本頁每15秒更新進度。"
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
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <OnlineReportView state={research[item.id]} status={item.status} />
                      <RequirementList items={requirements[item.id] ?? []} status={item.status} />
                    </Space>
                  ),
                }))}
              />
            )}
          </Spin>
        </Card>

        <Card title={<Space><SafetyCertificateOutlined />建立檢查案件</Space>} style={{ borderRadius: 12 }}>
          <Form form={form} layout="vertical" requiredMark="optional">
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

            <Divider titlePlacement="left">比較產品（AI 深度查證時必填三組）</Divider>
            <Alert
              type="info"
              showIcon
              message="免費模式可留空；AI 模式必須填寫三家廠牌"
              description="AI 模式會優先查找原廠產品頁、型錄、手冊及認證資料庫。若只找到廠牌層級資料，會標示為無法確認，不會自行推論符合。"
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

            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ height: '100%', borderColor: '#52C41A' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>免費規則檢核</Text>
                    <Text type="secondary">擷取 CNS、標準、尺寸、容量、百分比、時間、壓力、溫度與疑似限制文字；CNS 會使用標檢局官方資料查核，不搜尋三家產品證據。</Text>
                    <Button
                      icon={<ExperimentOutlined />}
                      loading={submittingMode === 'rules'}
                      disabled={submittingMode !== null && submittingMode !== 'rules'}
                      onClick={() => submitMode('rules')}
                      size="large"
                      block
                    >
                      免費檢核（不使用 API 額度）
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" style={{ height: '100%', borderColor: '#1677FF' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>AI 三家深度查證</Text>
                    <Text type="secondary">搜尋三家原廠證據、判斷等效性並產生可直接使用的中性替代條文；需要 OpenAI API 額度。</Text>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      loading={submittingMode === 'ai'}
                      disabled={submittingMode !== null && submittingMode !== 'ai'}
                      onClick={() => submitMode('ai')}
                      size="large"
                      block
                    >
                      AI 深度查證（需 API 額度）
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
            <Alert
              type="warning"
              showIcon
              message="兩種結果均為風險篩選，不會自動作成違法結論"
              description="免費模式未查證市場產品；AI 模式仍需由設計、消防、電機或採購專業人員覆核證據與建議文字。"
              style={{ marginTop: 16 }}
            />
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
        description={status === '待分析' ? '檢核尚未啟動' : status === '分析中' ? '正在擷取與保存規範條件' : '尚無可顯示的資料庫紀錄'}
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

function OnlineReportView({ state, status }: { state?: ComplianceResearchState; status: string }) {
  if (state?.freeJob?.error) {
    return <Alert type="error" showIcon message="免費規則檢核未完成" description={state.freeJob.error} />
  }
  if (state?.job?.error) {
    return <Alert type="error" showIcon message="線上分析未完成" description={state.job.error} />
  }
  if (state?.freeJob && state.freeJob.status !== 'completed') {
    return <Alert type="info" showIcon message="免費規則檢核進行中" description={`已保存 ${state.freeJob.savedCount}／${state.freeJob.total} 項條件；CNS 官方查核 ${state.freeJob.cnsCheckedCount ?? 0}／${state.freeJob.cnsTotal ?? 0}。`} />
  }
  if (!state?.report) {
    if (state?.job && status === '分析中') return <Alert type="info" showIcon message="AI 深度查證進行中" description="系統正在閱讀文件、搜尋原廠資料並核對三家產品，完成後會自動顯示結果。" />
    return null
  }
  return <OnlineReport report={state.report} />
}

function OnlineReport({ report }: { report: ComplianceOnlineReport }) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="線上查證摘要" description={report.documentSummary} />
      {report.clauses.map((clause, index) => (
        <Card
          key={clause.clauseId || index}
          size="small"
          title={<Space wrap><Text strong>{index + 1}. {clause.requirement}</Text><Tag>{clause.conditionType}</Tag><Tag color={riskColor[clause.risk] ?? 'default'}>{clause.risk}</Tag></Space>}
        >
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text type="secondary">{clause.fileName}／{clause.location}</Text>
            <Text>{clause.originalText}</Text>
            <Text><Text strong>綜合判定：</Text>{clause.conclusion}</Text>
            <Tag color={clause.allThreeComply ? 'green' : 'orange'}>
              {clause.allThreeComply ? '三家皆可符合' : '未達三家皆符合，須調整條文'}
            </Tag>
            <Row gutter={[10, 10]}>
              {clause.products.map((product, productIndex) => (
                <Col xs={24} lg={8} key={`${product.brand}-${productIndex}`}>
                  <Card size="small" style={{ height: '100%', background: '#FAFAFA' }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap><Text strong>{product.brand}</Text><Tag color={verdictColor[product.verdict] ?? 'default'}>{product.verdict}</Tag></Space>
                      {(product.series || product.model) && <Text type="secondary">{[product.series, product.model].filter(Boolean).join('／')}</Text>}
                      <Text>{product.evidenceSummary}</Text>
                      {product.evidence.map((evidence, evidenceIndex) => (
                        <a key={`${evidence.url}-${evidenceIndex}`} href={evidence.url} target="_blank" rel="noreferrer">
                          {evidence.title}{evidence.pageOrSection ? `（${evidence.pageOrSection}）` : ''}
                        </a>
                      ))}
                      {product.evidence.length === 0 && <Text type="secondary">尚無足以判定的官方證據</Text>}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {!clause.allThreeComply && (
              <Alert
                type="warning"
                showIcon
                message="建議替代條文（可直接納入規範）"
                description={(
                  <Space direction="vertical" size={6}>
                    <Text>{clause.neutralSuggestion}</Text>
                    <Text type="secondary"><Text strong>調整理由：</Text>{clause.adjustmentRationale}</Text>
                  </Space>
                )}
              />
            )}
            {clause.allThreeComply && clause.neutralSuggestion && (
              <Text><Text strong>文字優化建議：</Text>{clause.neutralSuggestion}</Text>
            )}
          </Space>
        </Card>
      ))}
    </Space>
  )
}

const verdictColor: Record<string, string> = {
  '符合': 'green',
  '條件符合': 'gold',
  '不符合': 'red',
  '無法確認': 'purple',
}
