import { Table, Tag, Button, Space, message } from 'antd'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'

interface TaskItem {
  id: string
  title: string
  reward: number
  status: string
  created_at: string
  publisher?: {
    nickname: string
  }
}

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, reward, status, created_at, publisher:users(nickname)')
      .order('created_at', { ascending: false })
    
    if (error) {
      message.error('加载失败')
    } else {
      const transformedData = data?.map((item: any) => ({
        ...item,
        publisher: Array.isArray(item.publisher) ? item.publisher[0] : item.publisher
      })) || []
      setTasks(transformedData as TaskItem[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleAudit = async (id: string, status: 'published' | 'cancelled') => {
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)

    if (error) {
      message.error('操作失败')
    } else {
      message.success('操作成功')
      loadTasks()
    }
  }

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '发布人',
      dataIndex: ['publisher', 'nickname'],
      key: 'publisher',
    },
    {
      title: '酬金',
      dataIndex: 'reward',
      key: 'reward',
      render: (val: number) => `￥${val}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'pending' ? 'orange' : status === 'published' ? 'blue' : 'default'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: TaskItem) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <>
              <Button type="primary" size="small" onClick={() => handleAudit(record.id, 'published')}>通过</Button>
              <Button danger size="small" onClick={() => handleAudit(record.id, 'cancelled')}>拒绝</Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>任务管理</h2>
      <Table 
        columns={columns} 
        dataSource={tasks} 
        rowKey="id" 
        loading={loading} 
      />
    </div>
  )
}
