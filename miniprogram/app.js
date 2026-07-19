// app.js
App({
  onLaunch: function () {

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d2g8xapu734318bbb',
        traceUser: true,
      })
    }
    
    this.globalData = {}
    // 开发调试模式：从缓存读取模拟的 openid（如果有的话）
    const mockOpenid = wx.getStorageSync("mockOpenid");
    if (mockOpenid) {
      this.globalData.openid = mockOpenid;
      console.log("【调试模式】使用模拟openid:", mockOpenid);
    } else {
      this.globalData.openid = wx.getStorageSync("openid");
    }

    // 读取用户信息
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo && userInfo.nickName) {
      this.globalData.userInfo = userInfo;
      this.globalData.hasUserInfo = true;
    }

    console.log("openid:" + this.globalData.openid)
  },
  globalData: {
    nickName:"",
    openid:"",
    userInfo: {},
    hasUserInfo: false,
    // 开发调试：模拟用户列表
    mockUsers: {
      userA: {
        openid: 'mock_openid_user_A',
        nickName: '测试用户A',
        avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132'
      },
      userB: {
        openid: 'mock_openid_user_B',
        nickName: '测试用户B',
        avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTLL5YqVrDibMfXmibKz3eYib1YicnQicWwVvibzibFwibibibibibibibibibibibibibibibib/132'
      },
      userC: {
        openid: 'mock_openid_user_C',
        nickName: '测试用户C',
        avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132'
      }
    }
  }
})
