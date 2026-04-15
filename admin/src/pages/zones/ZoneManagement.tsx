import { Table, Button, Space, Modal, Form, Input, InputNumber, ColorPicker, Switch, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AmapPicker from '../../components/AmapPicker'
import type { Color } from 'antd/es/color-picker'

interface ZoneItem {
  id: string
  name: string
  description: string | null
  color: string
  border_color: string
  path: any[]
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function ZoneManagement() {
  const [zones, setZones] = useState<ZoneItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ZoneItem | null>(null)
  const [form] = Form.useForm()

  async function loadZones() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campus_zones')
        .select('*')
        .order('sort_order', { ascending: true })
      
      if (error) {
        message.error('加载区域失败: ' + error.message)
      } else {
        setZones(data as ZoneItem[])
      }
    } catch (err) {
      console.error('加载区域失败:', err)
      message.error('加载区域失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadZones()
  }, [])

  const handleAdd = () => {
    setEditingItem({
      id: '',
      name: '',
      description: null,
      color: '#3b82f6',
      border_color: '#3b82f6',
      path: [],
      sort_order: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    form.resetFields()
    form.setFieldsValue({
      color: '#3b82f6',
      border_color: '#3b82f6',
      sort_order: 0,
      is_active: true,
    })
    setModalVisible(true)
  }

  const handleEdit = (record: ZoneItem) => {
    setEditingItem(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      color: record.color,
      border_color: record.border_color,
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
    setModalVisible(true)
  }

  const handlePolygonChange = (path: any[]) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        path: path,
      })
    }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个区域吗？',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('campus_zones')
            .delete()
            .eq('id', id)
          
          if (error) throw error
          message.success('删除成功')
          loadZones()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        path: editingItem?.path || [],
      }

      if (editingItem) {
        const { error } = await supabase
          .from('campus_zones')
          .update(data)
          .eq('id', editingItem.id)
        
        if (error) throw error
        message.success('更新成功')
      } else {
        const { error } = await supabase
          .from('campus_zones')
          .insert(data)
        
        if (error) throw error
        message.success('添加成功')
      }
      setModalVisible(false)
      loadZones()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const colorToHex = (color: string | Color) => {
    if (typeof color === 'string') return color
    return color.toHexString()
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '填充颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4, border: '1px solid #d9d9d9' }} />
          {color}
        </div>
      ),
    },
    {
      title: '边框颜色',
      dataIndex: 'border_color',
      key: 'border_color',
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4, border: '1px solid #d9d9d9' }} />
          {color}
        </div>
      ),
    },
    {
      title: '路径点数',
      dataIndex: 'path',
      key: 'path',
      render: (path: any[]) => path?.length || 0,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => active ? '启用' : '禁用',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ZoneItem) => (
        <Space size="middle">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>区域划分管理</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加区域
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={zones} 
        rowKey="id" 
        loading={loading} 
      />

      <Modal
        title={editingItem ? '编辑区域' : '添加区域'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入区域名称' }]}
          >
            <Input placeholder="请输入区域名称" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入区域描述" rows={2} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Form.Item
              label="填充颜色"
              name="color"
              getValueFromEvent={colorToHex}
            >
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item
              label="边框颜色"
              name="border_color"
              getValueFromEvent={colorToHex}
            >
              <ColorPicker showText format="hex" />
            </Form.Item>
          </div>

          <Form.Item label="绘制区域边界">
            <AmapPicker 
              mode="polygon"
              onPolygonChange={handlePolygonChange}
              initialPath={editingItem?.path}
              height="350px"
            />
          </Form.Item>

          <Form.Item
            label="排序"
            name="sort_order"
            initialValue={0}
          >
            <InputNumber style={{ width: '100%' }} placeholder="排序号" />
          </Form.Item>

          <Form.Item
            label="启用状态"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}