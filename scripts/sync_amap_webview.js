import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const sourcePath = path.join(projectRoot, 'miniapp', 'src', 'static', 'amap-h5.html')
const targetPath = path.join(projectRoot, 'vercel-amap-webview', 'index.html')

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  fs.copyFileSync(sourcePath, targetPath)
  console.log('Synced WebView page:')
  console.log(`- from: ${sourcePath}`)
  console.log(`- to:   ${targetPath}`)
}

main()
