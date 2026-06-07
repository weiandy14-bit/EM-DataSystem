import { Modal } from 'antd'
import { Line, Column, Bar, Pie } from '@ant-design/plots'
import type { Equipment } from '../types'

type EquipmentRow = Equipment & { inquiryYear: number | null }

interface Props {
  data: EquipmentRow[]
  open: boolean
  onClose: () => void
}

const H = 220

const SectionTitle = ({ text }: { text: string }) => (
  <div style={{ fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 8 }}>{text}</div>
)

const Empty = () => (
  <div style={{ textAlign: 'center', color: '#bbb', padding: '40px 0', fontSize: 13 }}>資料不足</div>
)

export default function EquipmentDashboard({ data, open, onClose }: Props) {
  // ① 年度均價
  const yearPriceMap: Record<number, { sum: number; count: number }> = {}
  data.forEach(r => {
    if (r.inquiryYear && r.budgetPrice != null) {
      if (!yearPriceMap[r.inquiryYear]) yearPriceMap[r.inquiryYear] = { sum: 0, count: 0 }
      yearPriceMap[r.inquiryYear].sum += r.budgetPrice
      yearPriceMap[r.inquiryYear].count++
    }
  })
  const yearPriceData = Object.entries(yearPriceMap)
    .map(([year, { sum, count }]) => ({ year: `${year}年`, avgPrice: Math.round(sum / count) }))
    .sort((a, b) => a.year.localeCompare(b.year))

  // ③ 年度件數
  const yearCountMap: Record<number, number> = {}
  data.forEach(r => {
    if (r.inquiryYear) yearCountMap[r.inquiryYear] = (yearCountMap[r.inquiryYear] ?? 0) + 1
  })
  const yearCountData = Object.entries(yearCountMap)
    .map(([year, count]) => ({ year: `${year}年`, count }))
    .sort((a, b) => a.year.localeCompare(b.year))

  // ④ 產地分佈
  const originMap: Record<string, number> = {}
  data.forEach(r => {
    const o = r.origin?.trim() || '未填'
    originMap[o] = (originMap[o] ?? 0) + 1
  })
  const originData = Object.entries(originMap)
    .map(([origin, value]) => ({ origin, value }))
    .sort((a, b) => b.value - a.value)

  // ⑤ 廠牌市占 top 10（由少到多，長條圖由上到下排）
  const brandMap: Record<string, number> = {}
  data.forEach(r => {
    const m = r.manufacturer?.trim() || '未填'
    brandMap[m] = (brandMap[m] ?? 0) + 1
  })
  const brandData = Object.entries(brandMap)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.count - b.count)
    .slice(-10)

  // ⑥ 預算價格分佈
  const ranges = [
    { label: '10萬以下', min: 0, max: 100000 },
    { label: '10~50萬', min: 100000, max: 500000 },
    { label: '50~100萬', min: 500000, max: 1000000 },
    { label: '100~500萬', min: 1000000, max: 5000000 },
    { label: '500萬以上', min: 5000000, max: Infinity },
  ]
  const priceDistData = ranges.map(r => ({
    range: r.label,
    count: data.filter(eq => eq.budgetPrice != null && eq.budgetPrice >= r.min && eq.budgetPrice < r.max).length,
  }))

  return (
    <Modal
      title={`設備分析儀表板（共 ${data.length} 筆）`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={940}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>

        {/* ① 年度均價漲幅 — 全寬 */}
        <div style={{ gridColumn: '1 / -1' }}>
          <SectionTitle text="① 年度均價漲幅" />
          {yearPriceData.length >= 2 ? (
            <Line
              data={yearPriceData}
              xField="year"
              yField="avgPrice"
              height={H}
              smooth
              style={{ lineWidth: 2 }}
              point={{ shapeField: 'circle', sizeField: 4 }}
              axis={{ y: { labelFormatter: (v: number) => `${Math.round(v / 10000)}萬` } }}
              tooltip={{ items: [{ channel: 'y', valueFormatter: (v: number) => `${v.toLocaleString('zh-TW')} 元` }] }}
            />
          ) : <Empty />}
        </div>

        {/* ③ 年度件數 */}
        <div>
          <SectionTitle text="③ 年度件數" />
          {yearCountData.length ? (
            <Column
              data={yearCountData}
              xField="year"
              yField="count"
              height={H}
              label={{ text: (d: { count: number }) => String(d.count) }}
            />
          ) : <Empty />}
        </div>

        {/* ⑥ 預算價格分佈 */}
        <div>
          <SectionTitle text="⑥ 預算價格分佈" />
          {data.some(r => r.budgetPrice != null) ? (
            <Column
              data={priceDistData}
              xField="range"
              yField="count"
              height={H}
              label={{ text: (d: { count: number }) => d.count > 0 ? String(d.count) : '' }}
            />
          ) : <Empty />}
        </div>

        {/* ④ 產地分佈 */}
        <div>
          <SectionTitle text="④ 產地分佈" />
          {originData.length ? (
            <Pie
              data={originData}
              angleField="value"
              colorField="origin"
              height={H}
              label={{ text: (d: { origin: string; value: number }) => `${d.origin}(${d.value})` }}
              legend={false}
            />
          ) : <Empty />}
        </div>

        {/* ⑤ 廠牌市占排行 */}
        <div>
          <SectionTitle text="⑤ 廠牌市占排行（前10）" />
          {brandData.length ? (
            <Bar
              data={brandData}
              xField="count"
              yField="brand"
              height={H}
            />
          ) : <Empty />}
        </div>

      </div>
    </Modal>
  )
}
