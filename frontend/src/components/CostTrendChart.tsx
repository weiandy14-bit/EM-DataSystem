import { Line } from '@ant-design/plots'
import type { PriceTrend } from '../types'

interface Props {
  data: PriceTrend[]
  title?: string
}

export default function CostTrendChart({ data, title }: Props) {
  if (!data.length) return <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>尚無費用資料</div>

  const chartData = data.flatMap(d => [
    { year: `${d.year}年`, price: d.avgPrice, type: '平均' },
    { year: `${d.year}年`, price: d.maxPrice, type: '最高' },
    { year: `${d.year}年`, price: d.minPrice, type: '最低' },
  ])

  const config = {
    data: chartData,
    xField: 'year',
    yField: 'price',
    colorField: 'type',
    smooth: true,
    height: 280,
    title: title ? { title, style: { fontSize: 14 } } : undefined,
    axis: {
      y: { labelFormatter: (v: number) => v.toLocaleString('zh-TW') },
    },
    tooltip: {
      items: [{ channel: 'y', valueFormatter: (v: number) => `${v.toLocaleString('zh-TW')} 元` }],
    },
    style: { lineWidth: 2 },
  }

  return <Line {...config} />
}
