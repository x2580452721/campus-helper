import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, 'miniapp', '.env')
const key = 'TARO_APP_MAP_WEBVIEW_URL'

function normalizeUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  if (!/^https:\/\//i.test(raw)) {
    throw new Error('URL 必须是 HTTPS 地址')
  }
  return raw.replace(/\s+/g, '')
}

function updateEnvFile(url) {
  let content = ''
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8')
  }

  const line = `${key}=${url}`
  if (new RegExp(`^${key}=`, 'm').test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), line)
  } else {
    content = `${content.trim()}\n${line}\n`.trimStart()
  }

  fs.writeFileSync(envPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8')
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.log('用法: node scripts/set_map_webview_url.js <https-url>')
    console.log('示例: node scripts/set_map_webview_url.js https://xxx.tcloudbaseapp.com/index.html')
    process.exit(1)
  }

  const url = normalizeUrl(input)
  updateEnvFile(url)

  console.log('✅ 已更新小程序 WebView 地址:')
  console.log(`- ${key}=${url}`)
  console.log('')
  console.log('下一步执行:')
  console.log('1) cd miniapp')
  console.log('2) npm run build:weapp')
}

main()
