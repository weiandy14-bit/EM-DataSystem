import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout, Typography } from 'antd'
import EquipmentList from './pages/EquipmentList'

const { Header, Content } = Layout

function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 20px', background: '#1F4E79' }}>
        <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
          🏗️ 機電工程 | 歷史數據管理系統
        </Typography.Text>
      </Header>
      <Content style={{ padding: '20px 24px', background: '#F8FAFC', overflow: 'auto' }}>
        <Routes>
          <Route path="*" element={<EquipmentList />} />
        </Routes>
      </Content>
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
