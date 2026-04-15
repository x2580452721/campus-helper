import { Table, Tag, Button, Space, message, Modal, InputNumber, Form, Input } from 'antd'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../utils/supabase'

interface User {
  id: string
  student_id: string | null
  phone: string | null
  email: string
  name: string | null
  nickname: string
  credit_score: number
  role: string
  status: string
  work_status: string
  created_at: string
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      message.error('加载失败')
    } else {
      setUsers(data as User[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleStatusChange = async (id: string, status: 'verified' | 'banned') => {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)

    if (error) {
      message.error('操作失败')
    } else {
      message.success('操作成功')
      fetchUsers()
    }
  }

  const openCreditModal = (user: User) => {
    setCurrentUser(user)
    form.setFieldsValue({ change_amount: 0, reason: '' })
    setIsModalOpen(true)
  }

  const handleCreditSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (values.change_amount === 0) return

      const newScore = (currentUser?.credit_score || 0) + values.change_amount
      if (newScore < 0 || newScore > 1000) {
        message.error('信用分必须在 0-1000 之间')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ credit_score: newScore })
        .eq('id', currentUser?.id)

      if (updateError) throw updateError

      const { error: historyError } = await supabase
        .from('credit_history')
        .insert({
          user_id: currentUser?.id,
          change_amount: values.change_amount,
          reason: values.reason || '管理员手动调整'
        })

      if (historyError) throw historyError

      message.success('信用分调整成功')
      setIsModalOpen(false)
      fetchUsers()
    } catch (error) {
      message.error('操作失败')
      console.error(error)
    }
  }

  const columns = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '学号',
      dataIndex: 'student_id',
      key: 'student_id',
    },
    {
      title: '信用分',
      dataIndex: 'credit_score',
      key: 'credit_score',
      render: (score: number) => (
        <Tag color={score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'}>
          {score}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'verified' ? 'blue' : status === 'banned' ? 'red' : 'default'}>
          {status === 'verified' ? '已认证' : status === 'banned' ? '已封禁' : '未认证'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <Space size="middle">
          <Button size="small" onClick={() => openCreditModal(record)}>调整信用</Button>
          {record.status === 'verified' ? (
            <Button danger size="small" onClick={() => handleStatusChange(record.id, 'banned')}>封禁</Button>
          ) : record.status === 'banned' ? (
            <Button type="primary" size="small" onClick={() => handleStatusChange(record.id, 'verified')}>解封</Button>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>用户管理</h2>
      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="id" 
        loading={loading} 
      />

      <Modal
        title={`调整信用分 - ${currentUser?.nickname}`}
        open={isModalOpen}
        onOk={handleCreditSubmit}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="当前信用分">
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>{currentUser?.credit_score}</span>
          </Form.Item>
          <Form.Item 
            name="change_amount" 
            label="调整数值 (正数加分，负数扣分)"
            rules={[{ required: true, message: '请输入调整数值' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="例如: -10" />
          </Form.Item>
          <Form.Item 
            name="reason" 
            label="调整原因"
            rules={[{ required: true, message: '请输入原因' }]}
          >
            <Input placeholder="例如: 违规接单" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
