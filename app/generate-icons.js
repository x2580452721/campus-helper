const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

console.log('🎓 Generating Campus Helper Icons...\n');

const iconSizes = [
    { name: 'icon-1024.png', size: 1024 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-256.png', size: 256 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-144.png', size: 144 },
    { name: 'icon-96.png', size: 96 },
    { name: 'icon-72.png', size: 72 },
    { name: 'icon-48.png', size: 48 },
    { name: 'icon-36.png', size: 36 }
];

const outputDir = path.join(__dirname, 'assets', 'icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
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
</svg>
`;

const svgPath = path.join(outputDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);

console.log('✅ SVG icon saved');

const sharp = require('sharp');

async function generateIcons() {
    try {
        for (const icon of iconSizes) {
            const outputPath = path.join(outputDir, icon.name);
            
            await sharp(Buffer.from(svgContent))
                .resize(icon.size, icon.size)
                .png()
                .toFile(outputPath);
            
            console.log(`✅ Generated: ${icon.name} (${icon.size}x${icon.size})`);
        }
        
        const mainIconPath = path.join(outputDir, 'icon.png');
        await sharp(Buffer.from(svgContent))
            .resize(1024, 1024)
            .png()
            .toFile(mainIconPath);
        
        console.log(`✅ Generated: icon.png (1024x1024)`);
        
        console.log('\n🎉 All icons generated successfully!');
        console.log(`   Output directory: ${outputDir}`);
        
    } catch (error) {
        console.error('❌ Error generating icons:', error.message);
        console.log('\n💡 Alternative: Use generate-icons.html in a browser to download icons manually.');
    }
}

generateIcons();
