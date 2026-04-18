const fs = require('fs')
const path = require('path')

console.log('[setup-android] 正在检查 Android 权限...')

const manifestPath = path.join(
  __dirname,
  '../android/app/src/main/AndroidManifest.xml'
)

if (!fs.existsSync(manifestPath)) {
  console.warn('[setup-android] AndroidManifest.xml 不存在')
  process.exit(0)
}

let manifest = fs.readFileSync(manifestPath, 'utf8')

const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION'
]

console.log('[setup-android] 检查权限中...')
const missingPermissions = []
requiredPermissions.forEach(perm => {
  const has = manifest.includes(perm)
  console.log(`  ${perm}: ${has ? '✓' : '✗'}`)
  if (!has) missingPermissions.push(perm)
})

if (missingPermissions.length === 0) {
  console.log('[setup-android] 所有权限已配置！')
  process.exit(0)
}

console.log(`[setup-android] 缺少 ${missingPermissions.length} 个权限，正在添加...`)

let permString = ''
missingPermissions.forEach(perm => {
  permString += `    <uses-permission android:name="${perm}" />\n`
})

const appTag = '<application'
if (manifest.includes(appTag)) {
  manifest = manifest.replace(appTag, permString + '    ' + appTag)
  fs.writeFileSync(manifestPath, manifest, 'utf8')
  console.log('[setup-android] 权限添加成功！')
} else {
  console.log('[setup-android] 警告：找不到 application 标签')
}

console.log('[setup-android] 配置完成')
