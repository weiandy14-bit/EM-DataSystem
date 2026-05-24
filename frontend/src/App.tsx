import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { Layout, Typography, Button, Space, Tag, Modal, Spin } from 'antd'
import { FilePdfOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import EquipmentList from './pages/EquipmentList'
import Login from './pages/Login'
import UserManagement from './pages/UserManagement'
import { exportRef } from './exportManager'
import { logout, getCurrentUser } from './auth'
import type { AuthUser } from './auth'

const { Header, Content } = Layout

function AppLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    Modal.confirm({
      title: '確認登出',
      content: '確定要登出系統嗎？',
      okText: '登出',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await logout()
        window.history.replaceState(null, '', '/')
        onLogout()
      },
    })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#1F4E79' }}>
        <Typography.Text
          style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          🏗️ 機電工程 | 歷史數據管理系統
        </Typography.Text>

        <Space>
          <Tag color="rgba(255,255,255,0.2)" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)', marginRight: 4 }}>
            {user.username}
          </Tag>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => exportRef.current?.()}
            style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'transparent' }}
          >
            匯出 PDF
          </Button>
          {user.role === 'admin' && (
            <Button
              icon={<TeamOutlined />}
              onClick={() => navigate('/users')}
              style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'transparent' }}
            >
              使用者管理
            </Button>
          )}
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'transparent' }}
          >
            登出
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '20px 24px', background: '#F8FAFC', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<EquipmentList />} />
          {user.role === 'admin' && <Route path="/users" element={<UserManagement />} />}
          <Route path="*" element={<EquipmentList />} />
        </Routes>
      </Content>
    </Layout>
  )
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <BrowserRouter>
      <AppLayout user={user} onLogout={() => setUser(null)} />
    </BrowserRouter>
  )
}
