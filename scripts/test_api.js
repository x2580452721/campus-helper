import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dnkhygbvdcierhmqmxbb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRua2h5Z2J2ZGNpZXJobXFteGJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI5ODI3NywiZXhwIjoyMDg4ODc0Mjc3fQ.9702dtty5gJ5GoYzIko1D45mjnUmtVr75ZmlhvEsO3g' // Service Role Key (for testing)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFlow() {
  console.log('🚀 Starting API Test Flow...')

  // 1. 模拟学生登录 (创建一个测试学生账号)
  const testEmail = `student_${Date.now()}@test.com`
  const testPassword = 'password123'
  
  console.log(`\n1. Creating test student: ${testEmail}`)
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  })

  if (authError) {
    console.error('❌ Create user failed:', authError.message)
    return
  }

  // 补全用户信息
  const { error: userDbError } = await supabase.from('users').insert({
    id: user.id,
    email: testEmail,
    student_id: `stu_${Date.now()}`,
    name: '测试学生',
    nickname: 'TestStu',
    role: 'student',
    status: 'active',
    credit_score: 100
  })

  if (userDbError) {
    console.error('❌ Insert user DB failed:', userDbError.message)
    return
  }
  console.log('✅ Test student created in DB')

  // 2. 模拟发布任务
  console.log('\n2. Publishing a task...')
  const taskData = {
    publisher_id: user.id,
    title: '帮我取个快递 (API测试)',
    description: '中通快递，送到宿舍楼下',
    type: 'delivery',
    reward: 5.00,
    deadline: new Date(Date.now() + 3600000).toISOString(),
    status: 'published',
    location: {
      latitude: 39.9088,
      longitude: 116.3975,
      address: '测试地址',
      name: '测试地点'
    }
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (taskError) {
    console.error('❌ Publish task failed:', taskError.message)
    return
  }
  console.log('✅ Task published:', task.id, task.title)

  // 3. 模拟查询任务 (模拟首页获取)
  console.log('\n3. Fetching nearby tasks...')
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'published')
    .limit(5)

  if (fetchError) {
    console.error('❌ Fetch tasks failed:', fetchError.message)
    return
  }
  
  console.log(`✅ Found ${tasks.length} published tasks:`)
  tasks.forEach(t => console.log(`   - [${t.title}] Reward: ￥${t.reward}`))

  console.log('\n🎉 All API tests passed!')
}

testFlow()
