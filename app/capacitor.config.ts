import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campus.helper',
  appName: 'Campus Helper',
  webDir: 'www',
  server: {
    // 使用 Vercel 上已部署的 H5 地址
    url: 'https://campus-helper-miniapp.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false
  }
};

export default config;
