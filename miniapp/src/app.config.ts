export default defineAppConfig({
  pages: [
    'pages/splash/index',
    'pages/index/index',
    'pages/map/index',
    'pages/login/index',
    'pages/auth/verify',
    'pages/task/publish/index',
    'pages/task/detail/index',
    'pages/task/review/index',
    'pages/my-tasks/index',
    'pages/profile/index',
    'pages/profile/edit'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '校园互助平台',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1890FF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'static/tab-home.png',
        selectedIconPath: 'static/tab-home-active.png'
      },
      {
        pagePath: 'pages/task/publish/index',
        text: '发布',
        iconPath: 'static/tab-add.png',
        selectedIconPath: 'static/tab-add-active.png'
      },
      {
        pagePath: 'pages/my-tasks/index',
        text: '任务',
        iconPath: 'static/tab-task.png',
        selectedIconPath: 'static/tab-task-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'static/tab-user.png',
        selectedIconPath: 'static/tab-user-active.png'
      }
    ]
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于展示附近的任务和导航'
    }
  },
  requiredPrivateInfos: [
    'getLocation',
    'chooseLocation'
  ],
  plugins: {},
  useExtendedLib: {
    'weui': true
  }
})
