import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dnkhygbvdcierhmqmxbb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRua2h5Z2J2ZGNpZXJobXFteGJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI5ODI3NywiZXhwIjoyMDg4ODc0Mjc3fQ.9702dtty5gJ5GoYzIko1D45mjnUmtVr75ZmlhvEsO3g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  console.log('Creating admin user...')

  const email = 'admin@campus.com'
  const password = 'admin123'
  let userId

  // 1. 尝试创建用户
  const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })

  if (authError) {
    // 如果用户已存在，尝试查询该用户的 ID
    if (authError.message.includes('already been registered')) {
      console.log('User already exists, fetching ID...')
      // 注意：listUsers 需要 service_role 权限
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('List users error:', listError.message)
        return
      }
      const existingUser = users.find(u => u.email === email)
      if (existingUser) {
        userId = existingUser.id
      } else {
        console.error('Could not find existing user ID')
        return
      }
    } else {
      console.error('Auth Error:', authError.message)
      return
    }
  } else {
    userId = user.id
  }

  console.log('Target User ID:', userId)

  // 2. 插入或更新 Users 表
  const { error: dbError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: email,
      student_id: 'admin001',
      name: '系统管理员',
      nickname: 'Admin',
      role: 'admin',
      status: 'active'
    })

  if (dbError) {
    console.error('DB Error:', dbError.message)
  } else {
    console.log('✅ Admin account configured successfully!')
    console.log('Email:', email)
    console.log('Password:', password)
  }
}

createAdmin()
