import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout, Typography, Button } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import EquipmentList from './pages/EquipmentList'
import { exportRef } from './exportManager'

const { Header, Content } = Layout

function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#1F4E79' }}>
        <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
          🏗️ 機電工程 | 歷史數據管理系統
        </Typography.Text>
        <Button
          icon={<FilePdfOutlined />}
          onClick={() => exportRef.current?.()}
          style={{ borderColor: 'rgba(255,255,255,0.6)', color: '#fff', background: 'transparent' }}
        >
          匯出 PDF
        </Button>
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
