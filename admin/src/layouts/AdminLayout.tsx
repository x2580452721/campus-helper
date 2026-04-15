import { Layout, Menu, Button } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { 
  DashboardOutlined, 
  UnorderedListOutlined, 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  BorderOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { useEffect, useState, useCallback } from 'react'

const { Header, Sider, Content } = Layout

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const checkAdminRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (data?.role !== 'admin') {
      console.warn('Current user is not admin')
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        checkAdminRole(session.user.id)
      }
    })
  }, [navigate, checkAdminRole])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const items = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/tasks',
      icon: <UnorderedListOutlined />,
      label: '任务审核',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/locations',
      icon: <EnvironmentOutlined />,
      label: '地点管理',
    },
    {
      key: '/zones',
      icon: <BorderOutlined />,
      label: '区域划分',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)', 
          textAlign: 'center', 
          lineHeight: '32px', 
          color: '#fff', 
          fontWeight: 'bold' 
        }}>
          {collapsed ? 'CH' : 'Campus Helper'}
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
