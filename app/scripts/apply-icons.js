const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Campus Helper 图标应用工具\n');

const baseDir = path.join(__dirname, '..');
const androidIconsDir = path.join(baseDir, 'android-icons');
const androidDir = path.join(baseDir, 'android');

if (!fs.existsSync(androidDir)) {
  console.log('⚠️ Android项目不存在！');
  console.log('💡 请先运行: npx cap add android');
  console.log('💡 或者: npm run build:android');
  process.exit(1);
}

const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');

if (!fs.existsSync(resDir)) {
  console.log('⚠️ 无法找到Android资源文件夹！');
  process.exit(1);
}

const mipmapFolders = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

let copied = 0;
let deleted = 0;

// 删除自适应图标相关的文件
const adaptiveIconPaths = [
  path.join(resDir, 'mipmap-anydpi-v26'),
  path.join(resDir, 'values', 'ic_launcher_background.xml')
];

adaptiveIconPaths.forEach(adaptivePath => {
  if (fs.existsSync(adaptivePath)) {
    if (fs.statSync(adaptivePath).isDirectory()) {
      fs.rmSync(adaptivePath, { recursive: true, force: true });
      console.log(`🗑️ 删除自适应图标文件夹: ${path.basename(adaptivePath)}`);
    } else {
      fs.unlinkSync(adaptivePath);
      console.log(`🗑️ 删除自适应图标文件: ${path.basename(adaptivePath)}`);
    }
    deleted++;
  }
});

// 复制我们的PNG图标
mipmapFolders.forEach(folder => {
  const sourceFolder = path.join(androidIconsDir, folder);
  const targetFolder = path.join(resDir, folder);
  
  if (fs.existsSync(sourceFolder)) {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    
    const files = fs.readdirSync(sourceFolder);
    files.forEach(file => {
      if (file.endsWith('.png')) {
        const srcFile = path.join(sourceFolder, file);
        const destFile = path.join(targetFolder, file);
        fs.copyFileSync(srcFile, destFile);
        console.log(`✅ 复制: ${folder}/${file}`);
        copied++;
      }
    });
  }
});

console.log(`\n🎉 成功应用 ${copied} 个图标文件！`);
if (deleted > 0) {
  console.log(`🗑️ 删除了 ${deleted} 个自适应图标相关文件/文件夹`);
}
console.log('\n📱 下一步:');
console.log('   1. 运行: npx cap open android');
console.log('   2. 在Android Studio中构建并运行应用');
console.log('   3. 或者运行: npm run build:android');
