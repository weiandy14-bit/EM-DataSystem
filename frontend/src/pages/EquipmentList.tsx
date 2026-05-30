import { useState, useEffect } from 'react'
import { Button, Collapse, Checkbox, Select, AutoComplete, Input, Table, Drawer, Tabs, Tag, Space, Descriptions, Typography, message, Modal, Tooltip } from 'antd'
import { FilterOutlined, CopyOutlined, BarChartOutlined, FilePdfOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Equipment, Specification, PricingRecord } from '../types'
import SpecHistory from '../components/SpecHistory'
import { exportRef } from '../exportManager'

const BUILDING_CATEGORIES = ['辦公大樓', '五星旅館', '商辦大樓', 'Internet Data Center', '二工裝修']
const currentRocYear = new Date().getFullYear() - 1911
const ROC_YEARS = Array.from({ length: currentRocYear - 99 }, (_, i) => 100 + i)
const LAST_SEARCH_KEY = 'em_last_search'
const SEARCH_HISTORY_KEY = 'em_search_history'

type EquipmentRow = Equipment & {
  budgetPrice: number | null
  inquiryYear: number | null
  projectCode: string
}

interface SavedSearch {
  buildings: string[]
  yearStart?: number
  yearEnd?: number
  name: string
}

function loadLastSearch(): SavedSearch | null {
  try { return JSON.parse(localStorage.getItem(LAST_SEARCH_KEY) || 'null') } catch { return null }
}

function loadSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') } catch { return [] }
}

export default function EquipmentList() {
  const last = loadLastSearch()
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(last?.buildings ?? [])
  const [yearStart, setYearStart] = useState<number | undefined>(last?.yearStart)
  const [yearEnd, setYearEnd] = useState<number | undefined>(last?.yearEnd)
  const [equipmentName, setEquipmentName] = useState(last?.name ?? '')
  const [searchHistory, setSearchHistory] = useState<string[]>(loadSearchHistory)
  const [data, setData] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])
  const [compareOpen, setCompareOpen] = useState(false)

  const [selected, setSelected] = useState<EquipmentRow>()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [prices, setPrices] = useState<PricingRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    setSearched(true)
    setSelectedKeys([])

    localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify({ buildings: selectedBuildings, yearStart, yearEnd, name: equipmentName }))

    if (equipmentName.trim()) {
      const history = [equipmentName, ...searchHistory.filter(h => h !== equipmentName)].slice(0, 5)
      setSearchHistory(history)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
    }

    const [eqList, allPricing] = await Promise.all([
      api.equipment.list({
        keyword: equipmentName || undefined,
        buildingCategories: selectedBuildings.length ? selectedBuildings : undefined,
        yearStart,
        yearEnd,
      }),
      api.pricing.allEquipmentRecords(),
    ])

    const rows: EquipmentRow[] = eqList.map(eq => {
      const latest = allPricing
        .filter(p => p.entityId === eq.id)
        .sort((a, b) => b.priceDate.localeCompare(a.priceDate))[0] ?? null
      return {
        ...eq,
        budgetPrice: latest?.price ?? null,
        inquiryYear: latest ? new Date(latest.priceDate).getFullYear() : null,
        projectCode: latest?.projectRef ?? '',
      }
    })
    setData(rows)
    setLoading(false)
  }

  const priced = data.filter(r => r.budgetPrice != null)
  const statsMax = priced.length ? Math.max(...priced.map(r => r.budgetPrice!)) : null
  const statsMin = priced.length ? Math.min(...priced.map(r => r.budgetPrice!)) : null
  const statsAvg = priced.length ? Math.round(priced.reduce((s, r) => s + r.budgetPrice!, 0) / priced.length) : null
  const selectedRows = data.filter(r => selectedKeys.includes(r.id))

  useEffect(() => {
    exportRef.current = () => {
      if (!data.length) { message.warning('請先查詢資料後再匯出'); return }
      const trs = data.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td><td>${r.name}</td><td>${r.manufacturer} ${r.model}</td>
          <td style="text-align:right">${r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—'}</td>
          <td>${r.inquiryYear != null ? r.inquiryYear + '年' : '—'}</td>
          <td>${r.projectCode || '—'}</td>
        </tr>`).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>設備查詢結果</title>
        <style>body{font-family:'Microsoft JhengHei','PingFang TC',sans-serif;padding:24px;color:#222}
        h2{font-size:16px;margin-bottom:4px}.sub{font-size:12px;color:#888;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#1F4E79;color:#fff;padding:8px 10px;text-align:left;font-weight:600}
        td{padding:7px 10px;border-bottom:1px solid #e0e0e0}
        tr:nth-child(even) td{background:#f7f9fc}
        @media print{@page{margin:16mm}}</style></head><body>
        <h2>機電工程歷史數據管理系統 — 設備查詢結果</h2>
        <div class="sub">匯出日期：${new Date().toLocaleDateString('zh-TW')}　共 ${data.length} 筆</div>
        <table><thead><tr>
          <th style="width:48px">項次</th><th>設備名稱</th><th>設備規格</th>
          <th style="text-align:right">設備預算價</th><th>詢價年度</th><th>案件工號</th>
        </tr></thead><tbody>${trs}</tbody></table>
        <script>window.onload=()=>{window.print()}</script></body></html>`
      const win = window.open('', '_blank')
      win?.document.write(html)
      win?.document.close()
    }
    return () => { exportRef.current = null }
  }, [data])

  const handleCsvExport = () => {
    if (!data.length) { message.warning('請先查詢資料後再匯出'); return }
    const header = '項次,設備名稱,廠牌,型號,設備預算價,詢價年度,案件工號'
    const rows = data.map((r, i) =>
      [i + 1, `"${r.name}"`, `"${r.manufacturer}"`, `"${r.model}"`, r.budgetPrice ?? '', r.inquiryYear ?? '', `"${r.projectCode}"`].join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `設備查詢_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyRow = (r: EquipmentRow) => {
    const text = [r.name, `${r.manufacturer} ${r.model}`,
      r.budgetPrice != null ? `$${r.budgetPrice.toLocaleString('zh-TW')}` : '—',
      r.inquiryYear != null ? `${r.inquiryYear}年` : '—',
      r.projectCode || '—'].join('\t')
    navigator.clipboard.writeText(text).then(() => message.success('已複製到剪貼板'))
  }

  const handleQuotationPdf = () => {
    if (selectedRows.length !== 3) return
    const fields: { label: string; get: (r: EquipmentRow) => string }[] = [
      { label: '設備名稱', get: r => r.name },
      { label: '廠牌', get: r => r.manufacturer },
      { label: '型號', get: r => r.model },
      { label: '產地', get: r => r.origin || '—' },
      { label: '設備單價（元）', get: r => r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—' },
      { label: '詢價年度', get: r => r.inquiryYear != null ? `${r.inquiryYear}年` : '—' },
      { label: '建築類別', get: r => r.buildingCategory },
      { label: '案件工號', get: r => r.projectCode || '—' },
    ]
    const trs = fields.map(f => `
      <tr>
        <td class="label">${f.label}</td>
        ${selectedRows.map(r => `<td>${f.get(r)}</td>`).join('')}
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>三家報價比較表</title>
      <style>body{font-family:'Microsoft JhengHei','PingFang TC',sans-serif;padding:24px;color:#222}
      h2{font-size:16px;margin-bottom:4px;color:#1F4E79}.sub{font-size:12px;color:#888;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#1F4E79;color:#fff;padding:10px 12px;text-align:center;font-weight:600}
      td{padding:9px 12px;border:1px solid #ddd;vertical-align:top}
      .label{font-weight:600;background:#f0f4f8;width:130px}
      tr:nth-child(even) td:not(.label){background:#fafcff}
      @media print{@page{margin:16mm}}</style></head><body>
      <h2>機電工程設備三家報價比較表</h2>
      <div class="sub">製表日期：${new Date().toLocaleDateString('zh-TW')}</div>
      <table><thead><tr><th>項目</th><th>廠商一</th><th>廠商二</th><th>廠商三</th></tr></thead>
      <tbody>${trs}</tbody></table>
      <script>window.onload=()=>{window.print()}</script></body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()
  }

  const compareFields: { label: string; get: (r: EquipmentRow) => string }[] = [
    { label: '設備名稱', get: r => r.name },
    { label: '廠牌', get: r => r.manufacturer },
    { label: '產地', get: r => r.origin || '—' },
    { label: '型號', get: r => r.model },
    { label: '設備預算價（元）', get: r => r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—' },
    { label: '規格細項', get: r => r.specDetail || '—' },
  ]

  const handleCopyCompare = () => {
    const header = ['項目', ...selectedRows.map((_, i) => `廠商 ${i + 1}`)].join('\t')
    const rows = compareFields.map(f => [f.label, ...selectedRows.map(r => f.get(r))].join('\t'))
    navigator.clipboard.writeText([header, ...rows].join('\n'))
      .then(() => message.success('已複製，可直接貼入 Excel'))
  }

  const handlePrintCompare = () => {
    const trs = compareFields.map(f => `
      <tr>
        <td class="label">${f.label}</td>
        ${selectedRows.map(r => {
          if (f.label === '規格細項') {
            const items = r.specDetail ? r.specDetail.split(/[、\n,，]/).map(s => s.trim()).filter(Boolean) : []
            return `<td>${items.length ? items.map(s => `• ${s}`).join('<br>') : '—'}</td>`
          }
          return `<td>${f.get(r)}</td>`
        }).join('')}
      </tr>`).join('')
    const vendorHeaders = selectedRows.map((_, i) => `<th>廠商 ${i + 1}</th>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>比較規格</title>
      <style>body{font-family:'Microsoft JhengHei','PingFang TC',sans-serif;padding:24px;color:#222}
      h2{font-size:16px;margin-bottom:4px;color:#1F4E79}.sub{font-size:12px;color:#888;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#1F4E79;color:#fff;padding:10px 12px;text-align:center;font-weight:600}
      td{padding:9px 12px;border:1px solid #ddd;vertical-align:top}
      .label{font-weight:600;background:#f0f4f8;width:130px}
      tr:nth-child(even) td:not(.label){background:#fafcff}
      @media print{@page{margin:16mm}}</style></head><body>
      <h2>機電工程設備比較規格表</h2>
      <div class="sub">製表日期：${new Date().toLocaleDateString('zh-TW')}</div>
      <table><thead><tr><th>項目</th>${vendorHeaders}</tr></thead>
      <tbody>${trs}</tbody></table>
      <script>window.onload=()=>{window.print()}</script></body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()
  }

  const openDetail = async (eq: EquipmentRow) => {
    setSelected(eq)
    setDetailLoading(true)
    const [sp, pr] = await Promise.all([
      api.specs.list('equipment', eq.id),
      api.pricing.list('equipment', eq.id),
    ])
    setSpecs(sp)
    setPrices(pr)
    setDetailLoading(false)
  }

  const columns = [
    { title: '項次', key: 'index', width: 60, render: (_: unknown, __: EquipmentRow, idx: number) => idx + 1 },
    {
      title: '設備名稱', dataIndex: 'name', key: 'name',
      sorter: (a: EquipmentRow, b: EquipmentRow) => a.name.localeCompare(b.name, 'zh-TW'),
    },
    {
      title: '設備規格', key: 'spec',
      render: (_: unknown, r: EquipmentRow) => (
        <span>
          <span style={{ fontWeight: 600 }}>{r.manufacturer}</span>
          <span style={{ color: '#888', marginLeft: 6 }}>{r.model}</span>
        </span>
      ),
    },
    {
      title: '設備預算價', key: 'price',
      sorter: (a: EquipmentRow, b: EquipmentRow) => (a.budgetPrice ?? -1) - (b.budgetPrice ?? -1),
      render: (_: unknown, r: EquipmentRow) => r.budgetPrice != null
        ? <span style={{ color: '#1677ff', fontWeight: 600 }}>{r.budgetPrice.toLocaleString('zh-TW')}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '詢價年度', key: 'year', width: 100,
      sorter: (a: EquipmentRow, b: EquipmentRow) => (a.inquiryYear ?? 0) - (b.inquiryYear ?? 0),
      render: (_: unknown, r: EquipmentRow) =>
        r.inquiryYear != null ? `${r.inquiryYear}年` : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '案件工號', key: 'project',
      render: (_: unknown, r: EquipmentRow) => r.projectCode || <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: '', key: 'copy', width: 40,
      render: (_: unknown, r: EquipmentRow) => (
        <Tooltip title="複製此列">
          <Button type="text" size="small" icon={<CopyOutlined />}
            onClick={e => { e.stopPropagation(); handleCopyRow(r) }} />
        </Tooltip>
      ),
    },
  ]

  const compareColumns = [
    { title: '項目', dataIndex: 'label', key: 'label', width: 120, render: (v: string) => <strong>{v}</strong> },
    ...selectedRows.map((r, i) => ({
      title: `廠商 ${i + 1}`,
      key: r.id,
      render: (row: { key: string }) => {
        if (row.key === 'budgetPrice') return r.budgetPrice != null
          ? <span style={{ color: '#1677ff', fontWeight: 600 }}>{r.budgetPrice.toLocaleString('zh-TW')}</span> : '—'
        if (row.key === 'specDetail') {
          const items = r.specDetail ? r.specDetail.split(/[、\n,，]/).map(s => s.trim()).filter(Boolean) : []
          return items.length
            ? <ul style={{ margin: 0, paddingLeft: 16 }}>{items.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
            : '—'
        }
        const map: Record<string, string> = {
          name: r.name, manufacturer: r.manufacturer, model: r.model, origin: r.origin || '—',
        }
        return map[row.key] ?? '—'
      },
    })),
  ]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* 左欄：篩選面板 */}
      <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '16px 12px' }}>
        <Button type="primary" block style={{ marginBottom: 16, fontWeight: 600 }} onClick={handleConfirm}>
          確定查詢
        </Button>
        <Collapse defaultActiveKey={['buildings', 'year', 'name']} ghost size="small" items={[
          {
            key: 'buildings',
            label: <span style={{ fontWeight: 600 }}>建築類別</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BUILDING_CATEGORIES.map(cat => (
                  <Checkbox key={cat} checked={selectedBuildings.includes(cat)}
                    onChange={e => {
                      if (e.target.checked) setSelectedBuildings(prev => [...prev, cat])
                      else setSelectedBuildings(prev => prev.filter(b => b !== cat))
                    }}>
                    {cat}
                  </Checkbox>
                ))}
              </div>
            ),
          },
          {
            key: 'year',
            label: <span style={{ fontWeight: 600 }}>年度</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Select placeholder="起始年度" style={{ width: '100%' }} allowClear
                  value={yearStart} onChange={setYearStart}
                  options={ROC_YEARS.map(y => ({ value: y, label: `民國 ${y} 年` }))} />
                <Select placeholder="結束年度" style={{ width: '100%' }} allowClear
                  value={yearEnd} onChange={setYearEnd}
                  options={ROC_YEARS.map(y => ({ value: y, label: `民國 ${y} 年` }))} />
              </Space>
            ),
          },
          {
            key: 'name',
            label: <span style={{ fontWeight: 600 }}>設備名稱</span>,
            children: (
              <AutoComplete style={{ width: '100%' }}
                options={searchHistory.map(h => ({ value: h }))}
                value={equipmentName} onChange={setEquipmentName}
                filterOption={(input, option) => !input || String(option?.value ?? '').includes(input)}>
                <Input placeholder="模糊搜尋…" onPressEnter={handleConfirm} />
              </AutoComplete>
            ),
          },
        ]} />
      </div>

      {/* 右欄：查詢結果 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!searched ? (
          <div style={{ textAlign: 'center', color: '#bbb', padding: '80px 0' }}>
            <FilterOutlined style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
            <Typography.Text type="secondary">請選擇條件後按「確定查詢」</Typography.Text>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text type="secondary">
                共 {data.length} 筆，點擊列可查看規格與費用詳情
              </Typography.Text>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleCsvExport}>匯出 CSV</Button>
            </div>

            {priced.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, padding: '8px 14px', background: '#f0f7ff', borderRadius: 6, fontSize: 13, flexWrap: 'wrap' }}>
                <span>有報價 <strong>{priced.length}</strong> 筆</span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>最高 <strong style={{ color: '#f5222d' }}>{statsMax!.toLocaleString('zh-TW')}</strong></span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>最低 <strong style={{ color: '#52c41a' }}>{statsMin!.toLocaleString('zh-TW')}</strong></span>
                <span style={{ color: '#ddd' }}>|</span>
                <span>平均 <strong style={{ color: '#1677ff' }}>{statsAvg!.toLocaleString('zh-TW')}</strong></span>
              </div>
            )}

            {selectedKeys.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, flexWrap: 'wrap' }}>
                <Typography.Text style={{ fontSize: 13 }}>已選 <strong>{selectedKeys.length}</strong> 筆</Typography.Text>
                <Button size="small" icon={<BarChartOutlined />} onClick={() => setCompareOpen(true)}>比較規格</Button>
                <Tooltip title={selectedKeys.length !== 3 ? `需選擇恰好 3 筆（目前 ${selectedKeys.length} 筆）` : '產生三家報價比較 PDF'}>
                  <Button size="small" type="primary" icon={<FilePdfOutlined />}
                    disabled={selectedKeys.length !== 3} onClick={handleQuotationPdf}>
                    三家報價 PDF
                  </Button>
                </Tooltip>
                <Button size="small" onClick={() => setSelectedKeys([])}>清除選擇</Button>
              </div>
            )}

            <Table
              dataSource={data} columns={columns} rowKey="id"
              loading={loading} size="middle"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: (keys) => {
                  if (keys.length > 3) { message.warning('最多選擇 3 筆進行比較'); return }
                  setSelectedKeys(keys as (string | number)[])
                },
              }}
              onRow={r => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
            />
          </>
        )}
      </div>

      {/* 詳情抽屜 */}
      <Drawer
        title={<span>{selected?.name}<Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>{selected?.buildingCategory}</Tag></span>}
        open={!!selected} onClose={() => setSelected(undefined)} width={700} loading={detailLoading}
      >
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本資料',
              children: (
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="公共工程編碼">{selected.publicWorkCode || '—'}</Descriptions.Item>
                  <Descriptions.Item label="建築類別">{selected.buildingCategory}</Descriptions.Item>
                  <Descriptions.Item label="設備產地">{selected.origin || '—'}</Descriptions.Item>
                  <Descriptions.Item label="設備類別">{selected.type}</Descriptions.Item>
                  <Descriptions.Item label="特殊項目">{selected.specialItem || '—'}</Descriptions.Item>
                  <Descriptions.Item label="代理商">{selected.agent || '—'}</Descriptions.Item>
                  <Descriptions.Item label="規格細項">{selected.specDetail || '—'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            { key: 'specs', label: `規格歷史（${specs.length}版）`, children: <SpecHistory specs={specs} /> },
            {
              key: 'prices', label: `報價紀錄（${prices.length}筆）`,
              children: (() => {
                const sorted = [...prices].sort((a, b) => a.priceDate.localeCompare(b.priceDate))
                return (
                  <Table size="small" dataSource={sorted} rowKey="id"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    columns={[
                      { title: '日期', dataIndex: 'priceDate', key: 'date', width: 120 },
                      {
                        title: '金額（元）', dataIndex: 'price', key: 'price',
                        render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v.toLocaleString('zh-TW')}</span>,
                      },
                      {
                        title: '漲跌幅', key: 'change', width: 90,
                        render: (_: unknown, r: PricingRecord, idx: number) => {
                          if (idx === 0) return <span style={{ color: '#999' }}>—</span>
                          const pct = (r.price - sorted[idx - 1].price) / sorted[idx - 1].price * 100
                          const color = pct > 0 ? '#f5222d' : pct < 0 ? '#52c41a' : '#999'
                          return <span style={{ color }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                        },
                      },
                    ]}
                  />
                )
              })(),
            },
          ]} />
        )}
      </Drawer>

      {/* 比較規格 Modal */}
      <Modal
        title={`比較規格（${selectedRows.length} 筆）`}
        open={compareOpen} onCancel={() => setCompareOpen(false)}
        width={Math.min(200 + selectedRows.length * 260, 960)}
        footer={
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopyCompare}>複製（貼入 Excel）</Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrintCompare}>列印</Button>
            <Button onClick={() => setCompareOpen(false)}>關閉</Button>
          </Space>
        }
      >
        <Table size="small" pagination={false}
          dataSource={[
            { key: 'name', label: '設備名稱' },
            { key: 'manufacturer', label: '廠牌' },
            { key: 'origin', label: '產地' },
            { key: 'model', label: '型號' },
            { key: 'budgetPrice', label: '設備預算價（元）' },
            { key: 'specDetail', label: '規格細項' },
          ]}
          columns={compareColumns}
        />
      </Modal>
    </div>
  )
}
