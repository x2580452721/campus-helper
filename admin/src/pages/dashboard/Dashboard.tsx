import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Space, Select } from 'antd'
import { UserOutlined, FileTextOutlined, CheckCircleOutlined, DollarOutlined, ClockCircleOutlined, RiseOutlined } from '@ant-design/icons'
import { useEffect, useState, useCallback, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { supabase } from '../../utils/supabase'

const { RangePicker } = DatePicker
const { Option } = Select

interface TaskStat {
  id: string
  title: string
  reward: number
  status: string
  created_at: string
  type: string
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeTasks: 0,
    totalRewards: 0,
    avgTaskReward: 0
  })
  const [recentTasks, setRecentTasks] = useState<TaskStat[]>([])
  const [dateRange, setDateRange] = useState<any>(null)
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async (startDate?: string, endDate?: string, type?: string) => {
    setLoading(true)
    try {
      let tasksQuery = supabase.from('tasks').select('*')
      let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true })

      if (startDate) {
        tasksQuery = tasksQuery.gte('created_at', startDate)
      }
      if (endDate) {
        tasksQuery = tasksQuery.lte('created_at', endDate)
      }
      if (type && type !== 'all') {
        tasksQuery = tasksQuery.eq('type', type)
      }

      const [usersResult, tasksResult] = await Promise.all([
        usersQuery,
        tasksQuery
      ])

      const tasks = tasksResult.data || []
      let completedCount = 0
      let pendingCount = 0
      let activeCount = 0
      let totalRewards = 0

      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i]
        // 确保正确转换 reward 为数字
        const reward = parseFloat(t.reward) || 0
        totalRewards += reward
        switch (t.status) {
          case 'completed': completedCount++; break
          case 'published': pendingCount++; break
          case 'accepted': activeCount++; break
        }
      }
      const avgTaskReward = tasks.length > 0 ? totalRewards / tasks.length : 0

      setStats({
        totalUsers: usersResult.count || 0,
        totalTasks: tasks.length,
        completedTasks: completedCount,
        pendingTasks: pendingCount,
        activeTasks: activeCount,
        totalRewards,
        avgTaskReward
      })

      setRecentTasks(tasks.slice(0, 10))
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates)
    if (dates && dates.length === 2) {
      fetchStats(
        dates[0].startOf('day').toISOString(),
        dates[1].endOf('day').toISOString(),
        taskTypeFilter
      )
    } else {
      fetchStats(undefined, undefined, taskTypeFilter)
    }
  }

  const handleTypeFilterChange = (value: string) => {
    setTaskTypeFilter(value)
    if (dateRange && dateRange.length === 2) {
      fetchStats(
        dateRange[0].startOf('day').toISOString(),
        dateRange[1].endOf('day').toISOString(),
        value
      )
    } else {
      fetchStats(undefined, undefined, value)
    }
  }

  const taskTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().subtract(6 - i, 'day').format('MM-DD')
      return date
    })
    return {
      xAxis: {
        type: 'category',
        data: last7Days
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '任务数',
          type: 'line',
          data: [3, 5, 2, 8, 6, 4, 7],
          smooth: true,
          itemStyle: { color: '#1890ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
              ]
            }
          }
        }
      ],
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }
  }, [])

  const taskStatusPieData = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center'
      },
      series: [
        {
          name: '任务状态',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: stats.completedTasks, name: '已完成', itemStyle: { color: '#52c41a' } },
            { value: stats.activeTasks, name: '进行中', itemStyle: { color: '#1890ff' } },
            { value: stats.pendingTasks, name: '待接单', itemStyle: { color: '#faad14' } }
          ]
        }
      ]
    }
  }, [stats.completedTasks, stats.activeTasks, stats.pendingTasks])

  const taskTypeBarData = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: ['代取', '帮忙', '辅导', '其他']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '任务数',
          type: 'bar',
          data: [12, 8, 5, 3],
          itemStyle: {
            color: '#1890ff'
          },
          barWidth: '50%'
        }
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }
  }, [])

  const STATUS_MAP: Record<string, { color: string; text: string }> = {
    published: { color: 'blue', text: '待接单' },
    accepted: { color: 'processing', text: '进行中' },
    completed: { color: 'green', text: '已完成' },
    cancelled: { color: 'red', text: '已取消' }
  }

  const TYPE_EMOJI_MAP: Record<string, string> = {
    delivery: '📦',
    help: '🤝',
    tutoring: '📚',
    other: '📋'
  }

  const getStatusTag = (status: string) => {
    const info = STATUS_MAP[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getTypeEmoji = (type: string) => {
    return TYPE_EMOJI_MAP[type] || '📋'
  }

  const columns = [
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: TaskStat) => (
        <Space>
          <span>{getTypeEmoji(record.type)}</span>
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      )
    },
    {
      title: '酬金',
      dataIndex: 'reward',
      key: 'reward',
      render: (reward: any) => <span style={{ color: '#faad14', fontWeight: 600 }}>¥{parseFloat(reward) || 0}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>数据仪表盘</h2>
        <Space>
          <Select
            value={taskTypeFilter}
            onChange={handleTypeFilterChange}
            style={{ width: 120 }}
            placeholder="任务类型"
          >
            <Option value="all">全部类型</Option>
            <Option value="delivery">代取</Option>
            <Option value="help">帮忙</Option>
            <Option value="tutoring">辅导</Option>
            <Option value="other">其他</Option>
          </Select>
          <RangePicker
            onChange={handleDateRangeChange}
            placeholder={['开始日期', '结束日期']}
          />
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.totalTasks}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核任务"
              value={stats.pendingTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成任务"
              value={stats.completedTasks}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="进行中任务"
              value={stats.activeTasks}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="总酬金流水"
              value={stats.totalRewards}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="近7天任务趋势" extra={<span style={{ color: '#1890ff' }}>趋势图</span>}>
            <ReactECharts option={taskTrendData} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="任务状态分布" extra={<span style={{ color: '#52c41a' }}>饼图</span>}>
            <ReactECharts option={taskStatusPieData} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="任务类型分布" extra={<span style={{ color: '#722ed1' }}>柱状图</span>}>
            <ReactECharts option={taskTypeBarData} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card title="最近任务" extra={<span style={{ color: '#999' }}>最近10条任务</span>}>
        <Table
          columns={columns}
          dataSource={recentTasks}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  )
}
