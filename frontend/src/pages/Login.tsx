import { useState } from 'react'
import { Card, Form, Input, Button, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { login } from '../auth'
import type { AuthUser } from '../auth'

export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = ({ username, password }: { username: string; password: string }) => {
    setLoading(true)
    setError(false)
    setTimeout(() => {
      const user = login(username, password)
      if (user) {
        onLogin(user)
      } else {
        setError(true)
      }
      setLoading(false)
    }, 300)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' }}>
      <Card style={{ width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
          <Typography.Title level={4} style={{ margin: 0, color: '#1F4E79' }}>機電工程</Typography.Title>
          <Typography.Text type="secondary">歷史數據管理系統</Typography.Text>
        </div>

        {error && (
          <Alert message="帳號或密碼錯誤，請重新輸入" type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        <Form onFinish={handleSubmit} layout="vertical" requiredMark={false}>
          <Form.Item name="username" label="帳號" rules={[{ required: true, message: '請輸入帳號' }]}>
            <Input prefix={<UserOutlined />} placeholder="請輸入帳號" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密碼" rules={[{ required: true, message: '請輸入密碼' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="請輸入密碼" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{ background: '#1F4E79', borderColor: '#1F4E79' }}
            >
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
