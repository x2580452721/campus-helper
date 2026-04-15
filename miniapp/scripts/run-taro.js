const { spawnSync } = require('node:child_process')
const path = require('node:path')

const taroCli = path.join(__dirname, '..', 'node_modules', '@tarojs', 'cli', 'bin', 'taro')
const args = process.argv.slice(2)

const result = spawnSync(process.execPath, [taroCli, ...args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI || '1'
  }
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 0)
