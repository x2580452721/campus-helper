const fs = require('fs');
const path = require('path');

console.log('🎓 Creating simple placeholder icons...\n');

const outputDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 定义不同尺寸
const sizes = [
    { size: 48, folder: 'mipmap-mdpi' },
    { size: 72, folder: 'mipmap-hdpi' },
    { size: 96, folder: 'mipmap-xhdpi' },
    { size: 144, folder: 'mipmap-xxhdpi' },
    { size: 192, folder: 'mipmap-xxxhdpi' }
];

// 保存SVG
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#grad1)" rx="180"/>
    <g transform="translate(512, 480)">
        <polygon points="0,-120 200,40 0,120 -200,40" fill="#ffffff"/>
        <circle cx="180" cy="50" r="35" fill="#ffffff"/>
        <ellipse cx="0" cy="180" rx="80" ry="20" fill="#ffffff"/>
        <path d="M-40,180 Q0,280 40,180" stroke="#ffffff" stroke-width="16" fill="none" stroke-linecap="round"/>
    </g>
    <g transform="translate(680, 280)">
        <rect x="0" y="0" width="24" height="120" rx="12" fill="#ffffff"/>
        <circle cx="12" cy="-10" r="20" fill="#ffffff"/>
    </g>
</svg>
`;

fs.writeFileSync(path.join(outputDir, 'icon.svg'), svgContent);
console.log('✅ SVG icon saved');

// 创建一个README文件说明如何使用
const readme = `
# Campus Helper Icons

## 自动生成（GitHub Actions）
下次推送到GitHub时，GitHub Actions会自动：
1. 构建应用
2. 生成图标（使用SVG源文件）
3. 打包APK

## 本地生成方法

### 方法1: 使用浏览器（最简单）
1. 打开 \`generate-icons.html\`
2. 点击"下载所有图标"
3. 下载后复制到Android项目

### 方法2: 使用在线工具
1. 打开 https://convertio.co/zh/svg-png/
2. 上传 \`assets/icons/icon.svg\`
3. 下载不同尺寸

### 方法3: 手动创建Android资源
把下载的PNG文件复制到：
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72  
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readme);

console.log('\n✅ Icons prepared!');
console.log(`   SVG file: ${path.join(outputDir, 'icon.svg')}`);
console.log('\n🚀 Push to GitHub to trigger automatic APK build with icons!');
