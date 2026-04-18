const fs = require('fs');
const path = require('path');

console.log('🎓 正在生成 Campus Helper 图标...\n');

// 定义所有需要的尺寸
const sizes = [
    { size: 48, folder: 'mipmap-mdpi' },
    { size: 72, folder: 'mipmap-hdpi' },
    { size: 96, folder: 'mipmap-xhdpi' },
    { size: 144, folder: 'mipmap-xxhdpi' },
    { size: 192, folder: 'mipmap-xxxhdpi' },
    { size: 512, folder: 'icon-512' },
    { size: 1024, folder: 'icon-1024' }
];

// 创建输出目录
const outputDir = path.join(__dirname, 'android-icons');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach(s => {
    const dir = path.join(outputDir, s.folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

console.log('✅ 目录创建完成');

// 首先保存SVG源文件
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
console.log('✅ SVG源文件保存完成');

console.log('\n现在尝试生成PNG...\n');

// 使用sharp库生成PNG
async function generateIcons() {
    try {
        const sharp = require('sharp');
        console.log('✅ 使用sharp库生成PNG...\n');
        
        for (const s of sizes) {
            try {
                await sharp(Buffer.from(svgContent))
                    .resize(s.size, s.size)
                    .png()
                    .toFile(path.join(outputDir, s.folder, 'ic_launcher.png'));
                
                await sharp(Buffer.from(svgContent))
                    .resize(s.size, s.size)
                    .png()
                    .toFile(path.join(outputDir, s.folder, 'ic_launcher_round.png'));
                
                console.log(`✅ ${s.folder} (${s.size}x${s.size})`);
            } catch (e) {
                console.log(`⚠️  ${s.folder} 出错:`, e.message);
            }
        }
        
        // 生成主图标
        await sharp(Buffer.from(svgContent))
            .resize(1024, 1024)
            .png()
            .toFile(path.join(outputDir, 'icon.png'));
        
        console.log('\n🎉 所有图标生成成功！');
        console.log(`\n输出目录: ${outputDir}`);
        
        // 复制到app/assets/icons供GitHub使用
        const assetsDir = path.join(__dirname, 'assets', 'icons');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        fs.copyFileSync(path.join(outputDir, 'icon.svg'), path.join(assetsDir, 'icon.svg'));
        fs.copyFileSync(path.join(outputDir, 'icon.png'), path.join(assetsDir, 'icon.png'));
        
        console.log('\n✅ 图标已复制到 assets/icons');
        console.log('\n现在可以提交到Git并推送到GitHub了！');
        
    } catch (e) {
        console.log('❌ 错误:', e.message);
    }
}

generateIcons();
