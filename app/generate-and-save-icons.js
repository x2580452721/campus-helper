const fs = require('fs');
const path = require('path');

console.log('🎓 Generating Campus Helper Icons...\n');

const iconSizes = [
    { name: 'icon-1024.png', size: 1024, folder: 'mipmap-xxxhdpi' },
    { name: 'icon-512.png', size: 512, folder: 'mipmap-xxhdpi' },
    { name: 'icon-256.png', size: 256, folder: 'mipmap-xhdpi' },
    { name: 'icon-192.png', size: 192, folder: 'mipmap-xxhdpi' },
    { name: 'icon-144.png', size: 144, folder: 'mipmap-xxhdpi' },
    { name: 'icon-96.png', size: 96, folder: 'mipmap-xhdpi' },
    { name: 'icon-72.png', size: 72, folder: 'mipmap-hdpi' },
    { name: 'icon-48.png', size: 48, folder: 'mipmap-mdpi' }
];

const outputDir = path.join(__dirname, 'assets', 'icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// SVG content for Design A
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

const svgPath = path.join(outputDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent);
console.log('✅ SVG icon saved');

// Now let's create a simple HTML file that can be used to generate PNGs
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Generate Icons</title>
</head>
<body>
    <h1>Generating Icons...</h1>
    <script>
        const svgContent = \`${svgContent.replace(/`/g, '\\`')}\`;
        
        function downloadIcon(svgText, size, filename) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, size, size);
                    
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.click();
                        setTimeout(resolve, 100);
                    });
                };
                const blob = new Blob([svgText], {type: 'image/svg+xml'});
                img.src = URL.createObjectURL(blob);
            });
        }
        
        async function generateAll() {
            const sizes = [1024, 512, 256, 192, 144, 96, 72, 48];
            for (const size of sizes) {
                await downloadIcon(svgContent, size, 'icon-' + size + '.png');
            }
            await downloadIcon(svgContent, 1024, 'icon.png');
            document.body.innerHTML = '<h1>✅ All icons downloaded!</h1>';
        }
        
        generateAll();
    </script>
</body>
</html>
`;

const htmlPath = path.join(outputDir, 'generate.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log('✅ HTML generator saved');

console.log('\n📋 Next steps:');
console.log('   1. Open ' + htmlPath + ' in a browser');
console.log('   2. It will automatically download all icon sizes');
console.log('   3. Or use generate-icons.html in the app folder');
console.log('   4. Copy the icons to Android mipmap folders');
console.log('\n💡 The GitHub Actions workflow will handle this automatically on next push!');
