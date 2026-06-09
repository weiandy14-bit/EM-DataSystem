import { useState, useEffect, useRef, useMemo } from 'react'
import { Button, Collapse, Checkbox, Select, AutoComplete, Input, Slider, Table, Drawer, Tabs, Tag, Space, Descriptions, Typography, message, Modal, Tooltip } from 'antd'
import { FilterOutlined, CopyOutlined, BarChartOutlined, FilePdfOutlined, DownloadOutlined, HistoryOutlined, HolderOutlined, PieChartOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Equipment, Specification, PricingRecord } from '../types'
import SpecHistory from '../components/SpecHistory'
import { exportRef } from '../exportManager'
import EquipmentDashboard from '../components/EquipmentDashboard'

const BUILDING_CATEGORIES = ['辦公大樓', '五星旅館', '商辦大樓', 'Internet Data Center', '二工裝修', '大專院校']
const ROC_YEARS = Array.from({ length: 7 }, (_, i) => 110 + i) // 110~116
const LAST_SEARCH_KEY = 'em_last_search'
const SEARCH_HISTORY_KEY = 'em_search_history'
const COLUMN_ORDER_KEY = 'em_column_order'
const DRAGGABLE_COL_KEYS = ['project', 'name', 'origin', 'price', 'date'] as const

type EquipmentRow = Equipment & {
  inquiryYear: number | null
}

interface SavedSearch {
  buildings: string[]
  yearStart?: number
  yearEnd?: number
  name: string
  publicWorkCode?: string
}

interface HistoryItem {
  id: string
  label: string
  params: SavedSearch
}

function buildLabel(p: SavedSearch): string {
  const parts: string[] = []
  if (p.name) parts.push(p.name)
  if (p.buildings.length) parts.push(p.buildings.join('、'))
  const yr = [p.yearStart ? String(p.yearStart) : '', p.yearEnd ? String(p.yearEnd) : ''].filter(Boolean).join('～')
  if (yr) parts.push(`民國${yr}年`)
  if (p.publicWorkCode) parts.push(`工程碼：${p.publicWorkCode}`)
  return parts.join(' · ') || '全部設備'
}

function loadLastSearch(): SavedSearch | null {
  try { return JSON.parse(localStorage.getItem(LAST_SEARCH_KEY) || 'null') } catch { return null }
}

function loadSearchHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') } catch { return [] }
}

export default function EquipmentList() {
  const last = loadLastSearch()
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(last?.buildings ?? [])
  const [yearStart, setYearStart] = useState<number | undefined>(last?.yearStart)
  const [yearEnd, setYearEnd] = useState<number | undefined>(last?.yearEnd)
  const [equipmentName, setEquipmentName] = useState(last?.name ?? '')
  const [publicWorkCode, setPublicWorkCode] = useState(last?.publicWorkCode ?? '')
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>(loadSearchHistory)
  const [data, setData] = useState<EquipmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [showYearCounts, setShowYearCounts] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  // 精選篩選
  const [resultFilter, setResultFilter] = useState('')
  const [filterOrigins, setFilterOrigins] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)

  const [selected, setSelected] = useState<EquipmentRow>()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [prices, setPrices] = useState<PricingRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_ORDER_KEY)
      if (saved) {
        const parsed: string[] = JSON.parse(saved)
        const valid = [...DRAGGABLE_COL_KEYS].filter(k => parsed.includes(k))
        const missing = [...DRAGGABLE_COL_KEYS].filter(k => !parsed.includes(k))
        return [...valid.sort((a, b) => parsed.indexOf(a) - parsed.indexOf(b)), ...missing]
      }
    } catch {}
    return [...DRAGGABLE_COL_KEYS]
  })
  const dragColKey = useRef<string | null>(null)

  const colDragProps = (key: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLTableCellElement>) => {
      dragColKey.current = key
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e: React.DragEvent<HTMLTableCellElement>) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    onDrop: (e: React.DragEvent<HTMLTableCellElement>) => {
      e.preventDefault()
      const from = dragColKey.current
      if (!from || from === key) return
      setColumnOrder(prev => {
        const next = [...prev]
        const fi = next.indexOf(from)
        const ti = next.indexOf(key)
        if (fi < 0 || ti < 0) return prev
        next.splice(fi, 1)
        next.splice(ti, 0, from)
        localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
        return next
      })
      dragColKey.current = null
    },
    style: { cursor: 'grab', userSelect: 'none' as const },
  })

  const runSearch = async (params: SavedSearch) => {
    setLoading(true)
    setSearched(true)
    setSelectedKeys([])
    setResultFilter('')
    setFilterOrigins([])
    setFilterTypes([])
    setPriceRange(null)
    setSelectedBuildings(params.buildings)
    setYearStart(params.yearStart)
    setYearEnd(params.yearEnd)
    setEquipmentName(params.name)
    setPublicWorkCode(params.publicWorkCode ?? '')

    localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(params))

    const label = buildLabel(params)
    const newItem: HistoryItem = { id: Date.now().toString(), label, params }
    const newHistory = [newItem, ...searchHistory.filter(h => h.label !== label)].slice(0, 5)
    setSearchHistory(newHistory)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))

    const eqList = await api.equipment.list({
      keyword: params.name || undefined,
      buildingCategories: params.buildings.length ? params.buildings : undefined,
      yearStart: params.yearStart,
      yearEnd: params.yearEnd,
    })

    let rows: EquipmentRow[] = eqList.map(eq => ({
      ...eq,
      inquiryYear: eq.inquiryDate ? new Date(eq.inquiryDate).getFullYear() : null,
    }))
    if (params.publicWorkCode?.trim()) {
      const code = params.publicWorkCode.trim().toLowerCase()
      rows = rows.filter(r => (r.publicWorkCode ?? '').toLowerCase().includes(code))
    }
    setData(rows)
    setLoading(false)
  }

  const handleConfirm = () => {
    if (!yearStart || !yearEnd) {
      message.warning('請選擇年度起訖範圍（起始與結束年度都需填寫）')
      return
    }
    if (!equipmentName.trim()) {
      message.warning('請輸入設備名稱')
      return
    }
    runSearch({ buildings: selectedBuildings, yearStart, yearEnd, name: equipmentName, publicWorkCode })
  }
  const applyHistory = (item: HistoryItem) => runSearch(item.params)
  const clearHistory = () => { setSearchHistory([]); localStorage.removeItem(SEARCH_HISTORY_KEY) }

  // 精選：從查詢結果再次過濾
  const originOptions = useMemo(() => [...new Set(data.map(r => r.origin).filter(Boolean))].sort(), [data])
  const typeOptions = useMemo(() => [...new Set(data.map(r => r.type).filter(Boolean))].sort(), [data])
  const priceValues = useMemo(() => data.map(r => r.budgetPrice).filter((p): p is number => p != null && p > 0), [data])
  const priceMin = priceValues.length ? Math.min(...priceValues) : 0
  const priceMax = priceValues.length ? Math.max(...priceValues) : 0

  const displayData = useMemo(() => {
    let items = data
    if (resultFilter.trim()) {
      const kw = resultFilter.toLowerCase()
      items = items.filter(r =>
        [r.name, r.manufacturer, r.model, r.projectCode, r.specDetail].join(' ').toLowerCase().includes(kw)
      )
    }
    if (filterOrigins.length) items = items.filter(r => filterOrigins.includes(r.origin))
    if (filterTypes.length) items = items.filter(r => filterTypes.includes(r.type))
    if (priceRange) {
      const [lo, hi] = priceRange
      items = items.filter(r => r.budgetPrice != null && r.budgetPrice >= lo && r.budgetPrice <= hi)
    }
    return items
  }, [data, resultFilter, filterOrigins, filterTypes, priceRange])

  const hasRefinement = !!(resultFilter || filterOrigins.length || filterTypes.length || priceRange)
  const clearRefinement = () => { setResultFilter(''); setFilterOrigins([]); setFilterTypes([]); setPriceRange(null) }

  const yearCounts = displayData.reduce((acc, r) => {
    if (r.inquiryYear != null) acc[r.inquiryYear] = (acc[r.inquiryYear] ?? 0) + 1
    return acc
  }, {} as Record<number, number>)
  const yearEntries = Object.entries(yearCounts).sort(([a], [b]) => Number(a) - Number(b))
  const selectedRows = displayData.filter(r => selectedKeys.includes(r.id))

  useEffect(() => {
    exportRef.current = () => {
      if (!data.length) { message.warning('請先查詢資料後再匯出'); return }
      const trs = data.map((r, idx) => `
        <tr>
          <td>${idx + 1}</td><td>${r.projectCode || '—'}</td><td>${r.name}</td>
          <td>${r.origin || '—'}</td>
          <td style="text-align:right">${r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—'}</td>
          <td>${r.inquiryDate || '—'}</td>
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
          <th style="width:48px">項次</th><th>案件工號</th><th>設備名稱</th>
          <th>產地</th><th style="text-align:right">設備預算價</th><th>詢價日期</th>
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
    const header = '項次,案件工號,設備名稱,產地,設備預算價,詢價日期'
    const rows = data.map((r, i) =>
      [i + 1, `"${r.projectCode}"`, `"${r.name}"`, `"${r.origin || ''}"`, r.budgetPrice ?? '', r.inquiryDate || ''].join(',')
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
    const colValues: Record<string, string> = {
      project: r.projectCode || '—',
      name: r.name,
      origin: r.origin || '—',
      price: r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—',
      date: r.inquiryDate || '—',
    }
    const text = columnOrder.map(k => colValues[k]).join('\t')
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

  const draggableTitle = (label: string) => (
    <span><HolderOutlined style={{ marginRight: 5, color: '#bbb', fontSize: 11 }} />{label}</span>
  )

  const allColumns: Record<string, object> = {
    project: {
      title: draggableTitle('案件工號'), key: 'project',
      onHeaderCell: () => colDragProps('project'),
      render: (_: unknown, r: EquipmentRow) => r.projectCode || <span style={{ color: '#ccc' }}>—</span>,
    },
    name: {
      title: draggableTitle('設備名稱'), dataIndex: 'name', key: 'name',
      sorter: (a: EquipmentRow, b: EquipmentRow) => a.name.localeCompare(b.name, 'zh-TW'),
      onHeaderCell: () => colDragProps('name'),
    },
    origin: {
      title: draggableTitle('產地'), key: 'origin',
      onHeaderCell: () => colDragProps('origin'),
      render: (_: unknown, r: EquipmentRow) => r.origin || <span style={{ color: '#ccc' }}>—</span>,
    },
    price: {
      title: draggableTitle('設備預算價'), key: 'price',
      sorter: (a: EquipmentRow, b: EquipmentRow) => (a.budgetPrice ?? -1) - (b.budgetPrice ?? -1),
      onHeaderCell: () => colDragProps('price'),
      render: (_: unknown, r: EquipmentRow) => {
        if (r.budgetPrice == null) return <span style={{ color: '#ccc' }}>—</span>
        const p = r.budgetPrice
        const label = p.toLocaleString('zh-TW')
        const color = p >= 10000000 ? '#cf1322'
          : p >= 1000000 ? '#1677ff'
          : p >= 100000 ? '#237804'
          : '#595959'
        return <span style={{ color, fontWeight: 600 }}>{label}</span>
      },
    },
    date: {
      title: draggableTitle('詢價日期'), key: 'date', width: 120,
      sorter: (a: EquipmentRow, b: EquipmentRow) => (a.inquiryDate ?? '').localeCompare(b.inquiryDate ?? ''),
      onHeaderCell: () => colDragProps('date'),
      render: (_: unknown, r: EquipmentRow) =>
        r.inquiryDate || <span style={{ color: '#ccc' }}>—</span>,
    },
  }

  const columns = [
    { title: '項次', key: 'index', width: 60, render: (_: unknown, __: EquipmentRow, idx: number) => idx + 1 },
    ...columnOrder.map(k => allColumns[k]).filter(Boolean),
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

  const compareFields: { key: string; label: string }[] = [
    { key: 'name', label: '設備名稱' },
    { key: 'manufacturer', label: '廠牌' },
    { key: 'origin', label: '產地' },
    { key: 'model', label: '型號' },
    { key: 'budgetPrice', label: '設備預算價（元）' },
    { key: 'specDetail', label: '規格細項' },
  ]

  const handleCopyCompare = () => {
    const header = ['項目', ...selectedRows.map((_, i) => `廠商 ${i + 1}`)].join('\t')
    const rows = compareFields.map(f => {
      const vals = selectedRows.map(r => {
        if (f.key === 'budgetPrice') return r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—'
        const map: Record<string, string> = { name: r.name, manufacturer: r.manufacturer, model: r.model, origin: r.origin || '—', specDetail: r.specDetail || '—' }
        return map[f.key] ?? '—'
      })
      return [f.label, ...vals].join('\t')
    })
    navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => message.success('已複製，可直接貼入 Excel'))
  }

  const handlePrintCompare = () => {
    const COLS_PER_PAGE = 5
    const groups: typeof selectedRows[] = []
    for (let i = 0; i < selectedRows.length; i += COLS_PER_PAGE) {
      groups.push(selectedRows.slice(i, i + COLS_PER_PAGE))
    }

    const renderCell = (f: typeof compareFields[0], r: typeof selectedRows[0]) => {
      if (f.key === 'budgetPrice') return r.budgetPrice != null ? r.budgetPrice.toLocaleString('zh-TW') : '—'
      const map: Record<string, string> = { name: r.name, manufacturer: r.manufacturer, model: r.model, origin: r.origin || '—', specDetail: r.specDetail || '—' }
      return map[f.key] ?? '—'
    }

    const pages = groups.map((group, gi) => {
      const startIdx = gi * COLS_PER_PAGE + 1
      const endIdx = startIdx + group.length - 1
      const trs = compareFields.map(f =>
        `<tr><td class="label">${f.label}</td>${group.map(r => `<td>${renderCell(f, r)}</td>`).join('')}</tr>`
      ).join('')
      return `
        <div class="page">
          <h2>機電工程設備規格比較表</h2>
          <div class="sub">製表日期：${new Date().toLocaleDateString('zh-TW')}　廠商 ${startIdx}～${endIdx}（共 ${selectedRows.length} 家）</div>
          <table>
            <thead><tr><th style="width:110px">項目</th>${group.map((_, i) => `<th>廠商 ${startIdx + i}</th>`).join('')}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>規格比較</title>
      <style>
        body{font-family:'Microsoft JhengHei','PingFang TC',sans-serif;padding:0;margin:0}
        .page{padding:16mm;box-sizing:border-box}
        h2{font-size:15px;color:#1F4E79;margin:0 0 4px}
        .sub{font-size:11px;color:#888;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#1F4E79;color:#fff;padding:8px 10px;text-align:center}
        td{padding:8px 10px;border:1px solid #ddd;vertical-align:top;word-break:break-all}
        .label{font-weight:600;background:#f0f4f8}
        @media print{
          @page{size:A4 landscape;margin:0}
          .page{page-break-after:always;height:100vh}
          .page:last-child{page-break-after:avoid}
        }
      </style></head><body>
      ${pages}
      <script>window.onload=()=>{window.print()}</script></body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()
  }

  const compareColumns = [
    { title: '項目', dataIndex: 'label', key: 'label', width: 120, render: (v: string) => <strong>{v}</strong> },
    ...selectedRows.map((r, i) => ({
      title: `廠商 ${i + 1}`,
      key: r.id,
      render: (row: { key: string }) => {
        if (row.key === 'budgetPrice') return r.budgetPrice != null
          ? <span style={{ color: '#1677ff', fontWeight: 600 }}>{r.budgetPrice.toLocaleString('zh-TW')}</span> : '—'
        if (row.key === 'specDetail') {
          const parts = (r.specDetail || '—').split(/[、\n,，]/).map(s => s.trim()).filter(Boolean)
          return parts.length > 1
            ? <ul style={{ margin: 0, paddingLeft: 16 }}>{parts.map((p, j) => <li key={j}>{p}</li>)}</ul>
            : <span>{parts[0] || '—'}</span>
        }
        const map: Record<string, string> = { name: r.name, manufacturer: r.manufacturer, model: r.model, origin: r.origin || '—' }
        return map[row.key] ?? '—'
      },
    })),
  ]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* 左欄：篩選面板 + 查詢歷史 */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '16px 12px' }}>
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
            label: <span style={{ fontWeight: 600 }}>關鍵字搜尋</span>,
            children: (
              <>
                <AutoComplete style={{ width: '100%' }}
                  options={searchHistory.map(h => ({ value: h.params.name })).filter(h => h.value)}
                  value={equipmentName} onChange={setEquipmentName}
                  filterOption={(input, option) => !input || (option?.value ?? '').includes(input)}>
                  <Input placeholder="設備名稱／廠牌／型號" onPressEnter={handleConfirm} />
                </AutoComplete>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>同時比對多個欄位</div>
              </>
            ),
          },
          {
            key: 'publicWorkCode',
            label: <span style={{ fontWeight: 600 }}>公共工程編碼</span>,
            children: (
              <Input
                placeholder="輸入編碼（模糊比對）"
                value={publicWorkCode}
                onChange={e => setPublicWorkCode(e.target.value)}
                onPressEnter={handleConfirm}
                allowClear
              />
            ),
          },
        ]} />
      </div>

      {/* 查詢歷史 */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
            <HistoryOutlined style={{ marginRight: 6 }} />查詢歷史
          </span>
          {searchHistory.length > 0 && (
            <Button size="small" type="text" danger onClick={clearHistory}>清除</Button>
          )}
        </div>
        {searchHistory.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>尚無查詢記錄</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {searchHistory.map(item => (
              <div
                key={item.id}
                onClick={() => applyHistory(item)}
                style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#444', background: '#f8f9fa', border: '1px solid #eee', lineHeight: 1.5, wordBreak: 'break-all', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e6f4ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f8f9fa')}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
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
                {hasRefinement
                  ? <><strong style={{ color: '#1677ff' }}>{displayData.length}</strong> / {data.length} 筆（精選中）</>
                  : <>共 {data.length} 筆</>}，點擊列可查看規格與費用詳情
              </Typography.Text>
              <Space size={8}>
                <Checkbox checked={showYearCounts} onChange={e => setShowYearCounts(e.target.checked)}>各年份數量</Checkbox>
                <Button size="small" icon={<PieChartOutlined />} onClick={() => setDashboardOpen(true)}>儀表板</Button>
                <Button size="small" icon={<DownloadOutlined />} onClick={handleCsvExport}>匯出 CSV</Button>
              </Space>
            </div>

            {showYearCounts && yearEntries.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 10, padding: '8px 14px', background: '#f0f7ff', borderRadius: 6, fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#888', flexShrink: 0 }}>各年份數量：</span>
                {yearEntries.map(([year, count]) => (
                  <span key={year} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <strong>{year}</strong>
                    <span style={{ color: '#888' }}>年</span>
                    <strong style={{ color: '#1677ff' }}>{count}</strong>
                    <span style={{ color: '#888' }}>筆</span>
                  </span>
                ))}
              </div>
            )}

            {/* 精選列 */}
            {data.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                  placeholder="在結果中搜尋…"
                  style={{ width: 200 }}
                  value={resultFilter}
                  onChange={e => setResultFilter(e.target.value)}
                  allowClear
                  size="small"
                />
                {originOptions.length > 1 && (
                  <Select
                    mode="multiple" placeholder="產地" allowClear size="small"
                    style={{ minWidth: 110 }}
                    value={filterOrigins} onChange={setFilterOrigins}
                    options={originOptions.map(o => ({ value: o, label: o }))}
                    maxTagCount="responsive"
                  />
                )}
                {typeOptions.length > 1 && (
                  <Select
                    mode="multiple" placeholder="設備類別" allowClear size="small"
                    style={{ minWidth: 120 }}
                    value={filterTypes} onChange={setFilterTypes}
                    options={typeOptions.map(o => ({ value: o, label: o }))}
                    maxTagCount="responsive"
                  />
                )}
                {priceValues.length > 0 && priceMin < priceMax && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 220 }}>
                    <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>預算價：</span>
                    <Slider
                      range min={priceMin} max={priceMax}
                      value={priceRange ?? [priceMin, priceMax]}
                      onChange={v => {
                        const [lo, hi] = v as [number, number]
                        setPriceRange(lo === priceMin && hi === priceMax ? null : [lo, hi])
                      }}
                      tooltip={{ formatter: v => `${Math.round(v! / 10000)}萬` }}
                      style={{ flex: 1 }}
                      step={Math.max(1, Math.round((priceMax - priceMin) / 100))}
                    />
                    <span style={{ color: '#888', fontSize: 11, flexShrink: 0, minWidth: 60 }}>
                      {priceRange ? `${Math.round(priceRange[0]/10000)}~${Math.round(priceRange[1]/10000)}萬` : '不限'}
                    </span>
                  </div>
                )}
                {hasRefinement && (
                  <Button size="small" onClick={clearRefinement}>清除精選</Button>
                )}
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
              dataSource={displayData} columns={columns} rowKey="id"
              loading={loading} size="middle"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: (keys) => {
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
        width={Math.min(200 + selectedRows.length * 240, 900)}
        footer={
          <Space>
            <Button onClick={handleCopyCompare}>複製（貼入 Excel）</Button>
            <Button onClick={handlePrintCompare}>列印</Button>
            <Button type="primary" onClick={() => setCompareOpen(false)}>關閉</Button>
          </Space>
        }
      >
        <Table size="small" pagination={false}
          dataSource={compareFields.map(f => ({ key: f.key, label: f.label }))}
          columns={compareColumns}
        />
      </Modal>

      <EquipmentDashboard data={data} open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
    </div>
  )
}
