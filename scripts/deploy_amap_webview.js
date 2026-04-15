import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function updateEnvFile(envPath, publicUrl) {
  const key = 'TARO_APP_MAP_WEBVIEW_URL'
  const line = `${key}=${publicUrl}`

  let content = ''
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8')
  }

  if (content.includes(`${key}=`)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), line)
  } else {
    content = `${content.trim()}\n${line}\n`.trimStart()
  }

  fs.writeFileSync(envPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8')
}

async function main() {
  const sourcePath = path.join(projectRoot, 'miniapp', 'src', 'static', 'amap-h5.html')
  const deployRoot = path.join(projectRoot, 'vercel-amap-webview')
  const deployIndexPath = path.join(deployRoot, 'index.html')
  const envPath = path.join(projectRoot, 'miniapp', '.env')

  console.log('Source amap-h5.html path:')
  console.log(sourcePath)
  console.log('')
  console.log('Standalone Vercel project path:')
  console.log(deployRoot)
  console.log('')
  console.log('Deploy this folder to Vercel as a static site.')
  console.log('Its root page is index.html, and /static/amap-h5.html is kept working by vercel.json.')
  console.log('')
  console.log('Supabase Storage cannot be used as a mini program web-view host for HTML pages.')
  console.log('It returns HTML with Content-Type: text/plain, so WeChat WebView will display raw source code instead of rendering the page.')
  console.log('')
  console.log('Use a real static host that serves text/html over HTTPS, for example:')
  console.log('- Vercel')
  console.log('- Netlify')
  console.log('- Cloudflare Pages')
  console.log('- Your own HTTPS site')
  console.log('')
  console.log('After deploying, write the final URL into:')
  console.log(envPath)
  console.log('')
  console.log('Example:')
  console.log('TARO_APP_MAP_WEBVIEW_URL=https://campus-helper-blush.vercel.app/static/amap-h5.html')
  console.log('')
  console.log('If you keep the same /static/amap-h5.html URL shape, point it to:')
  console.log(deployIndexPath)
  console.log('')
  console.log('Then:')
  console.log('1. Add that domain to WeChat Mini Program business domains')
  console.log('2. Rebuild miniapp: npm run build:weapp')
}

main().catch(error => {
  console.error('❌ Deploy failed:')
  console.error(error)
  process.exit(1)
})
