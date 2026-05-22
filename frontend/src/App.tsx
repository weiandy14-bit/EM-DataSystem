import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography } from 'antd'
import {
  DashboardOutlined, BuildOutlined, AppstoreOutlined,
  DollarOutlined, AuditOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import EquipmentList from './pages/EquipmentList'
import EquipmentDetail from './pages/EquipmentDetail'
import MaterialList from './pages/MaterialList'
import CostAnalysis from './pages/CostAnalysis'
import InspectionLookup from './pages/InspectionLookup'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '總覽' },
  { key: '/equipment', icon: <BuildOutlined />, label: '設備管理' },
  { key: '/materials', icon: <AppstoreOutlined />, label: '材料管理' },
  { key: '/cost', icon: <DollarOutlined />, label: '費用分析' },
  { key: '/inspection', icon: <AuditOutlined />, label: '檢查查詢' },
]

function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const selectedKey = menuItems.slice().reverse().find(m => pathname.startsWith(m.key))?.key ?? '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: '#1F4E79', gap: 16 }}>
        <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
          🏗️ 機電工程 | 歷史數據管理系統
        </Typography.Text>
      </Header>
      <Layout>
        <Sider width={180} breakpoint="md" collapsedWidth={0} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: '1px solid #f0f0f0' }}
          />
        </Sider>
        <Content style={{ padding: '20px 24px', background: '#F8FAFC', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/equipment" element={<EquipmentList />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/materials" element={<MaterialList />} />
            <Route path="/cost" element={<CostAnalysis />} />
            <Route path="/inspection" element={<InspectionLookup />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
