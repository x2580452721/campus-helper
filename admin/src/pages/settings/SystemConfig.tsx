import { Table, Input, Button, message, Form, Modal } from 'antd'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../utils/supabase'

interface ConfigItem {
  key: string
  value: string
  description: string
  updated_at: string
}

export default function SystemConfig() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<ConfigItem | null>(null)
  const [form] = Form.useForm()

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('key')
    
    if (error) {
      message.error('加载失败')
    } else {
      setConfigs(data as ConfigItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleEdit = (record: ConfigItem) => {
    setCurrentConfig(record)
    form.setFieldsValue({ value: record.value })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!currentConfig) return

      const { error } = await supabase
        .from('system_config')
        .update({ value: values.value, updated_at: new Date().toISOString() })
        .eq('key', currentConfig.key)

      if (error) throw error

      message.success('保存成功')
      setIsModalOpen(false)
      setConfigs(configs.map(item => item.key === currentConfig.key ? { ...item, value: values.value } : item))
    } catch (error) {
      message.error('保存失败')
      console.error(error)
    }
  }

  const columns = [
    {
      title: '配置项',
      dataIndex: 'key',
      key: 'key',
      width: '20%',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: '30%',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ConfigItem) => (
        <Button type="link" onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统参数配置</h2>
      <Table 
        columns={columns} 
        dataSource={configs} 
        rowKey="key" 
        loading={loading} 
        pagination={false}
      />

      <Modal
        title={`编辑配置 - ${currentConfig?.key}`}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="说明">
            <span style={{ color: '#666' }}>{currentConfig?.description}</span>
          </Form.Item>
          <Form.Item 
            name="value" 
            label="参数值"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
