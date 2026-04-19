const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🎨 正在生成 Campus Helper 应用图标...\n');

const iconSizes = [
  { size: 36, folder: 'mipmap-mdpi' },
  { size: 48, folder: 'mipmap-mdpi' }, 
  { size: 72, folder: 'mipmap-hdpi' },
  { size: 96, folder: 'mipmap-xhdpi' },
  { size: 144, folder: 'mipmap-xxhdpi' },
  { size: 192, folder: 'mipmap-xxxhdpi' },
  { size: 512, folder: 'icon-512' },
  { size: 1024, folder: 'icon-1024' }
];

const baseDir = path.join(__dirname, '..');
const androidIconsDir = path.join(baseDir, 'android-icons');
const assetsDir = path.join(baseDir, 'assets');

if (!fs.existsSync(androidIconsDir)) {
  fs.mkdirSync(androidIconsDir, { recursive: true });
}

iconSizes.forEach(({ size, folder }) => {
  const targetDir = path.join(androidIconsDir, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
});

const iconSVG = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
        </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#grad1)" rx="180"/>
    <circle cx="512" cy="512" r="400" fill="url(#glow)"/>
    <g transform="translate(512, 480)">
        <polygon points="0,-120 200,40 0,120 -200,40" fill="#ffffff" opacity="0.95"/>
        <circle cx="180" cy="50" r="35" fill="#ffffff" opacity="0.9"/>
        <ellipse cx="0" cy="180" rx="80" ry="20" fill="#ffffff" opacity="0.9"/>
        <path d="M-40,180 Q0,280 40,180" stroke="#ffffff" stroke-width="16" fill="none" opacity="0.85" stroke-linecap="round"/>
    </g>
    <g transform="translate(680, 280)">
        <rect x="0" y="0" width="24" height="120" rx="12" fill="#ffffff" opacity="0.7"/>
        <circle cx="12" cy="-10" r="20" fill="#ffffff" opacity="0.85"/>
    </g>
</svg>`;

const iconSVGNoRound = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
        </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#grad1)"/>
    <circle cx="512" cy="512" r="400" fill="url(#glow)"/>
    <g transform="translate(512, 480)">
        <polygon points="0,-120 200,40 0,120 -200,40" fill="#ffffff" opacity="0.95"/>
        <circle cx="180" cy="50" r="35" fill="#ffffff" opacity="0.9"/>
        <ellipse cx="0" cy="180" rx="80" ry="20" fill="#ffffff" opacity="0.9"/>
        <path d="M-40,180 Q0,280 40,180" stroke="#ffffff" stroke-width="16" fill="none" opacity="0.85" stroke-linecap="round"/>
    </g>
    <g transform="translate(680, 280)">
        <rect x="0" y="0" width="24" height="120" rx="12" fill="#ffffff" opacity="0.7"/>
        <circle cx="12" cy="-10" r="20" fill="#ffffff" opacity="0.85"/>
    </g>
</svg>`;

const svgPath = path.join(androidIconsDir, 'icon.svg');
fs.writeFileSync(svgPath, iconSVG);
console.log('✅ 保存主 SVG 图标:', svgPath);

const icon1024Path = path.join(androidIconsDir, 'icon.png');
const htmlPath = path.join(baseDir, 'generate-temp.html');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Generate Icons</title>
</head>
<body>
    <canvas id="canvas" width="1024" height="1024"></canvas>
    <script>
        const svg = \`${iconSVG.replace(/`/g, '\\`')}\`;
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, 1024, 1024);
            console.log('LOADED');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    </script>
</body>
</html>
`;

console.log('\n📝 创建临时 HTML 文件用于生成 PNG...');

const generatePngs = async () => {
  const puppeteerInstalled = await new Promise(resolve => {
    try {
      require.resolve('puppeteer');
      resolve(true);
    } catch (e) {
      resolve(false);
    }
  });

  if (puppeteerInstalled) {
    console.log('🚀 使用 Puppeteer 生成高质量 PNG 图标...');
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      for (const { size, folder } of iconSizes) {
        const canvasHTML = `
<!DOCTYPE html>
<html>
<head><title>Icon ${size}</title></head>
<body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const svg = \`${iconSVG.replace(/`/g, '\\`')}\`;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = function() {
    ctx.drawImage(img, 0, 0, ${size}, ${size});
};
img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
</script>
</body>
</html>`;
        
        await page.setContent(canvasHTML);
        await page.waitForTimeout(100);
        
        const element = await page.$('#c');
        const outputPath = path.join(androidIconsDir, folder, 'ic_launcher.png');
        await element.screenshot({ path: outputPath });
        
        const canvasHTMLNoRound = `
<!DOCTYPE html>
<html>
<head><title>Icon ${size}</title></head>
<body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const svg = \`${iconSVGNoRound.replace(/`/g, '\\`')}\`;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = function() {
    ctx.drawImage(img, 0, 0, ${size}, ${size});
};
img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
</script>
</body>
</html>`;
        
        await page.setContent(canvasHTMLNoRound);
        await page.waitForTimeout(100);
        
        const elementNoRound = await page.$('#c');
        const outputPathRound = path.join(androidIconsDir, folder, 'ic_launcher_round.png');
        await elementNoRound.screenshot({ path: outputPathRound });
        
        console.log(`✅ 生成 ${size}x${size} 图标`);
      }
      
      await browser.close();
      console.log('\n🎉 图标生成完成！');
      console.log('📂 图标保存在:', androidIconsDir);
    } catch (e) {
      console.log('⚠️ Puppeteer 生成失败，使用备用方案');
      saveBackupIcons();
    }
  } else {
    saveBackupIcons();
  }
};

const saveBackupIcons = () => {
  console.log('\n📝 保存 SVG 源文件，你可以手动转换为 PNG');
  
  const svgFolder = path.join(androidIconsDir, 'icon-1024');
  if (!fs.existsSync(svgFolder)) fs.mkdirSync(svgFolder, { recursive: true });
  
  const svgIconPath = path.join(svgFolder, 'icon.svg');
  fs.writeFileSync(svgIconPath, iconSVG);
  
  const instructions = `
🚀 快速设置图标指南：

1. 方法 1: 使用在线工具转换
   - 访问: https://convertio.co/zh/svg-png/
   - 上传: app/android-icons/icon.svg
   - 转换为各种尺寸 (1024, 512, 192, 144, 96, 72, 48, 36)
   - 保存到对应文件夹

2. 方法 2: 使用 icon-design.html
   - 在浏览器中打开 app/icon-design.html
   - 点击设计A的 "Download" 按钮
   - 会自动下载 1024/512/256 三个尺寸

3. 方法 3: 等待 Capacitor sync
   - 在项目根目录运行: npm run build:android
   - 或使用: cd app && npx cap add android (如果还没有)
   - 然后使用 Capacitor Assets 工具

📁 图标文件夹:
- mipmap-mdpi: 48x48, 36x36
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

🎨 已选择: 设计 A - 简约渐变
`;

  console.log(instructions);
  
  const instructionsPath = path.join(androidIconsDir, 'README.txt');
  fs.writeFileSync(instructionsPath, instructions);
  
  console.log('\n📄 说明已保存到:', instructionsPath);
};

generatePngs();
