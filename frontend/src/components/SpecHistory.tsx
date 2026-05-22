import { Timeline, Tag, Table, Tooltip } from 'antd'
import { CheckCircleOutlined, HistoryOutlined } from '@ant-design/icons'
import type { Specification } from '../types'

interface Props {
  specs: Specification[]
}

export default function SpecHistory({ specs }: Props) {
  if (!specs.length) return <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>尚無規格記錄</div>

  const columns = [
    { title: '規格項目', dataIndex: 'key', key: 'key', width: 140 },
    { title: '數值', dataIndex: 'value', key: 'value' },
  ]

  return (
    <Timeline
      items={specs.map(s => ({
        color: s.effectiveTo ? 'gray' : 'blue',
        dot: s.effectiveTo ? <HistoryOutlined /> : <CheckCircleOutlined style={{ color: '#1677ff' }} />,
        children: (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{s.versionLabel}</span>
              {!s.effectiveTo && <Tag color="blue">現行版本</Tag>}
              <span style={{ color: '#888', fontSize: 12 }}>
                {s.effectiveFrom} {s.effectiveTo ? `→ ${s.effectiveTo}` : '→ 至今'}
              </span>
            </div>
            {s.changeSummary && (
              <div style={{ color: '#555', fontSize: 13, marginBottom: 8 }}>
                <Tooltip title="變更說明">📝 {s.changeSummary}</Tooltip>
              </div>
            )}
            <Table
              size="small"
              dataSource={Object.entries(s.specData).map(([key, value]) => ({ key, value }))}
              columns={columns}
              pagination={false}
              rowKey="key"
              style={{ maxWidth: 480 }}
            />
          </div>
        ),
      }))}
    />
  )
}
