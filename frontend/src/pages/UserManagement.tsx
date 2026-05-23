import { useState } from 'react'
import { Table, Button, Form, Input, Modal, Popconfirm, Typography, Space, Tag, message } from 'antd'
import { PlusOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons'
import { listUsers, addUser, removeUser } from '../auth'
import type { AuthUser } from '../auth'

export default function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>(listUsers)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const refresh = () => setUsers(listUsers())

  const handleAdd = ({ username, password }: { username: string; password: string }) => {
    const ok = addUser(username, password)
    if (ok) {
      message.success(`使用者「${username}」新增成功`)
      form.resetFields()
      setModalOpen(false)
      refresh()
    } else {
      message.error('此帳號已存在，請使用其他名稱')
    }
  }

  const handleDelete = (username: string) => {
    removeUser(username)
    message.success(`已刪除使用者「${username}」`)
    refresh()
  }

  const columns = [
    { title: '帳號', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      key: 'role',
      width: 100,
      render: () => <Tag color="blue">使用者</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, r: AuthUser) => (
        <Popconfirm
          title={`確定刪除使用者「${r.username}」？`}
          okText="刪除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => handleDelete(r.username)}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>刪除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Space align="center" style={{ marginBottom: 20 }}>
        <TeamOutlined style={{ fontSize: 20, color: '#1F4E79' }} />
        <Typography.Title level={4} style={{ margin: 0 }}>使用者管理</Typography.Title>
      </Space>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新增使用者
        </Button>
      </Space>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="username"
        size="middle"
        pagination={false}
        locale={{ emptyText: '尚無使用者，點擊「新增使用者」建立帳號' }}
      />

      <Modal
        title="新增使用者"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} onFinish={handleAdd} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="username"
            label="帳號"
            rules={[{ required: true, message: '請輸入帳號' }]}
          >
            <Input placeholder="帳號" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密碼"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password placeholder="密碼" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setModalOpen(false); form.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit">新增</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
