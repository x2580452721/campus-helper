import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dnkhygbvdcierhmqmxbb.supabase.co'
// 这里必须使用 Service Role Key 来绕过 RLS 进行强制更新
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRua2h5Z2J2ZGNpZXJobXFteGJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI5ODI3NywiZXhwIjoyMDg4ODc0Mjc3fQ.9702dtty5gJ5GoYzIko1D45mjnUmtVr75ZmlhvEsO3g'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixAdminRole() {
  console.log('Fixing admin role...')

  const email = 'admin@campus.com'

  // 1. 查找用户 ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('List users error:', listError)
    return
  }

  const adminUser = users.find(u => u.email === email)
  if (!adminUser) {
    console.error('Admin user not found!')
    return
  }

  console.log('Found admin user:', adminUser.id)

  // 2. 强制更新 users 表
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      role: 'admin',
      status: 'active'
    })
    .eq('id', adminUser.id)

  if (updateError) {
    console.error('Update failed:', updateError)
  } else {
    console.log('✅ Admin role fixed successfully!')
  }
}

fixAdminRole()
