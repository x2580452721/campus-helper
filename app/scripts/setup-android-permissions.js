const fs = require('fs');
const path = require('path');

console.log('🔧 设置 Android 定位权限...');

const androidManifestPath = path.join(
  __dirname,
  '../android/app/src/main/AndroidManifest.xml'
);

if (!fs.existsSync(androidManifestPath)) {
  console.warn('⚠️ AndroidManifest.xml 不存在，跳过');
  process.exit(0);
}

let manifest = fs.readFileSync(androidManifestPath, 'utf8');

// 检查是否已经有权限
const hasLocationPermissions =
  manifest.includes('ACCESS_COARSE_LOCATION') &&
  manifest.includes('ACCESS_FINE_LOCATION');

if (hasLocationPermissions) {
  console.log('✅ 定位权限已存在');
  process.exit(0);
}

// 添加定位权限
const permissionsToAdd = `
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
`;

// 在 <manifest> 标签内、<application> 标签前插入权限
const applicationTag = '<application';
if (manifest.includes(applicationTag)) {
  manifest = manifest.replace(applicationTag, permissionsToAdd + '\n    ' + applicationTag);
  fs.writeFileSync(androidManifestPath, manifest, 'utf8');
  console.log('✅ 定位权限已添加');
} else {
  console.warn('⚠️ 无法找到 <application> 标签');
}

console.log('✅ AndroidManifest.xml 配置完成');
