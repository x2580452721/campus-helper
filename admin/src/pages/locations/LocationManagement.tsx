import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Switch, message, Collapse, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AmapPicker from '../../components/AmapPicker'
import { sanitizeLocationList } from '../../utils/mapData'

interface LocationInfo {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

interface LocationItem {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  zone_id: string | null
  description: string | null
  zone?: {
    name: string
  }
  sort_order: number
  is_active: boolean
  created_at: string
}

interface ZoneItem {
  id: string
  name: string
}

export default function LocationManagement() {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [zones, setZones] = useState<ZoneItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null)
  const [form] = Form.useForm()

  async function loadLocations() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('campus_locations')
        .select('*, zone:campus_zones(id,name,sort_order,is_active)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      if (error) {
        message.error('加载地点失败: ' + error.message)
      } else {
        setLocations(sanitizeLocationList((data || []) as LocationItem[], '地点'))
      }
    } catch (err) {
      console.error('加载地点失败:', err)
      message.error('加载地点失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadZones() {
    try {
      const { data, error } = await supabase
        .from('campus_zones')
        .select('id, name')
        .order('sort_order', { ascending: true })
      
      if (!error) {
        setZones(data as ZoneItem[])
      }
    } catch (err) {
      console.error('加载区域失败:', err)
    }
  }

  useEffect(() => {
    loadLocations()
    loadZones()
  }, [])

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, LocationItem[]>()

    locations.forEach((location) => {
      const key = location.zone?.name || '其他'
      const list = groups.get(key) || []
      list.push(location)
      groups.set(key, list)
    })

    return Array.from(groups.entries()).map(([name, items]) => ({
      name,
      items
    }))
  }, [locations])

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: LocationItem) => {
    setEditingItem(record)
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      description: record.description,
      latitude: record.latitude,
      longitude: record.longitude,
      zone_id: record.zone_id,
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
    setModalVisible(true)
  }

  const handleLocationSelect = (location: LocationInfo) => {
    form.setFieldsValue({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || form.getFieldValue('address')
    })
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个地点吗？',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('campus_locations')
            .delete()
            .eq('id', id)
          
          if (error) throw error
          message.success('删除成功')
          loadLocations()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async (values: any) => {
    try {
      console.log('提交的数据:', values)
      
      if (editingItem) {
        const { error } = await supabase
          .from('campus_locations')
          .update(values)
          .eq('id', editingItem.id)
        
        if (error) {
          console.error('更新错误:', error)
          throw error
        }
        message.success('更新成功')
      } else {
        const { error } = await supabase
          .from('campus_locations')
          .insert(values)
        
        if (error) {
          console.error('插入错误:', error)
          throw error
        }
        message.success('添加成功')
      }
      setModalVisible(false)
      loadLocations()
    } catch (error: any) {
      console.error('操作失败:', error)
      message.error('操作失败: ' + (error?.message || '未知错误'))
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '区域',
      dataIndex: ['zone', 'name'],
      key: 'zone',
      render: (name: string) => name || '-',
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
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
      render: (_: unknown, record: LocationItem) => (
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
        <h2 style={{ margin: 0 }}>地点管理</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加地点
        </Button>
      </div>
      <Collapse
        style={{ marginBottom: 24 }}
        items={groupedLocations.map(group => ({
          key: group.name,
          label: `${group.name}（${group.items.length}）`,
          children: (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.items.map((item) => (
                <Tag key={item.id} color={item.is_active ? 'blue' : 'default'}>
                  {item.name}
                </Tag>
              ))}
            </div>
          )
        }))}
      />
      <Table 
        columns={columns} 
        dataSource={locations} 
        rowKey="id" 
        loading={loading} 
      />

      <Modal
        title={editingItem ? '编辑地点' : '添加地点'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入地点名称' }]}
          >
            <Input placeholder="请输入地点名称" />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入地点描述" rows={3} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <Form.Item
              label="纬度"
              name="latitude"
              rules={[{ required: true, message: '请输入纬度' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="请输入纬度"
                step={0.000001}
                precision={6}
              />
            </Form.Item>

            <Form.Item
              label="经度"
              name="longitude"
              rules={[{ required: true, message: '请输入经度' }]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="请输入经度"
                step={0.000001}
                precision={6}
              />
            </Form.Item>
          </div>

          <Form.Item label="选择位置">
            <AmapPicker 
              mode="point"
              onLocationSelect={handleLocationSelect}
              initialLocation={editingItem ? { latitude: editingItem.latitude, longitude: editingItem.longitude } : undefined}
              height="300px"
            />
          </Form.Item>

          <Form.Item
            label="所属区域"
            name="zone_id"
          >
            <Select placeholder="请选择区域">
              {zones.map(zone => (
                <Select.Option key={zone.id} value={zone.id}>
                  {zone.name}
                </Select.Option>
              ))}
            </Select>
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
