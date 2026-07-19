// pages/mine/mine.js
const app = getApp()
const db = wx.cloud.database()
const _ = db.command
Page({

	nickName: '',

  data: {
    userInfo: {},
    hasUserInfo: false,
    showDialog: false,
    showLogoutDialog: false,
    balance: 0
  },

  // 跳转到钱包
  goWallet(){
    wx.navigateTo({
      url: '/pages/wallet/wallet'
    });
  },

  // 加载钱包余额
  loadBalance(){
    if (!app.globalData.openid) return;
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('wallet').where({
      _openid: _.eq(app.globalData.openid)
    }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({ balance: res.data[0].balance || 0 });
        app.globalData.balance = res.data[0].balance || 0;
      }
    });
  },

  onShowDialog(){
    // 点击登录前，确保已经获取了 openid
    if (!app.globalData.openid) {
      wx.showLoading({ title: '加载中...' })
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(res => {
        wx.hideLoading()
        console.log('获取openid成功', res.result)
        app.globalData.openid = res.result.openid
        wx.setStorageSync('openid', res.result.openid)
        this.setData({ showDialog: true })
      }).catch(err => {
        wx.hideLoading()
        console.log('获取openid失败', err)
        wx.showToast({
          icon: 'none',
          title: '登录失败，请检查云函数是否部署'
        })
      })
    } else {
      this.setData({ showDialog: true })
    }
  },
  onClose() {
    this.setData({ showDialog: false });
  },

  // 退出登录相关
  onShowLogoutDialog(){
    this.setData({ showLogoutDialog: true });
  },
  onLogoutCancel(){
    this.setData({ showLogoutDialog: false });
  },
  onLogoutConfirm(){
    // 清除全局数据
    app.globalData.userInfo = {};
    app.globalData.openid = '';
    app.globalData.hasUserInfo = false;
    app.globalData.balance = 0;
    // 清除本地缓存
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    // 更新页面状态
    this.setData({
      userInfo: {},
      hasUserInfo: false,
      showLogoutDialog: false,
      balance: 0
    });
    wx.showToast({
      icon: 'success',
      title: '已退出登录'
    });
  },

  onChooseAvatar(e) {
		
		const that = this

		wx.cloud.uploadFile({
				cloudPath: 'avatar/' + app.globalData.openid + '_' + new Date().getTime() + '_avatarImg.jpg',
				filePath: e.detail.avatarUrl
			})
			.then(res => {
				console.log(res.fileID,"path");
				that.setData({
					'userInfo.avatarUrl': res.fileID,
				})
			})
			.catch(
				error => {
					console.log(error)
				});
  },

  nicknameBlur(e) {
    if(e.detail.value!=undefined)
      this.nickName = e.detail.value
  },

  onConfirm(){
	const that = this;
	// 先把昵称更新到 data 里
	that.setData({
		'userInfo.nickName': that.nickName || '微信用户'
	})

  // 如果还没有 openid，先获取
  if (!app.globalData.openid) {
    wx.showToast({ icon: 'none', title: '正在登录，请稍候...' })
    return
  }

	// 先查用户是否存在
	db.collection('user_info').where({
		_openid: _.eq(app.globalData.openid)
	}).get().then(res => {
		if (res.data.length > 0) {
			// 用户已存在，更新
			return db.collection('user_info').doc(res.data[0]._id).update({
				data: {
					nickName: that.data.userInfo.nickName,
					avatarUrl: that.data.userInfo.avatarUrl
				}
			})
		} else {
			// 用户不存在，新增
			var userInfo = {
				nickName: that.data.userInfo.nickName || '微信用户',
				avatarUrl: that.data.userInfo.avatarUrl || 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132'
			};
			return db.collection('user_info').add({
				data: userInfo
			})
		}
	}).then(res => {
		console.log('用户信息保存成功', res);
		// 更新全局数据和缓存
		app.globalData.userInfo = that.data.userInfo;
		wx.setStorageSync('userInfo', that.data.userInfo);
		that.setData({
			hasUserInfo: true,
			showDialog: false
		})
		wx.showToast({
			icon: 'success',
			title: '登录成功'
		})
	}).catch(err => {
		console.log('保存用户信息失败', err);
		wx.showToast({
			icon: 'none',
			title: '登录失败，请重试'
		})
	})
  },

  onLoad(options){
    // 从缓存读取 openid
    const openid = wx.getStorageSync('openid');
    if (openid) {
      app.globalData.openid = openid;
      console.log("openid:" + openid);
    }

    // 从缓存读取 userInfo
    const userInfoStorage = wx.getStorageSync('userInfo');
    if (userInfoStorage && userInfoStorage.nickName) {
      this.setData({
        userInfo: userInfoStorage,
        hasUserInfo: true
      });
      app.globalData.userInfo = userInfoStorage;
      app.globalData.hasUserInfo = true;
    }

    // 有 openid 就加载余额
    if (app.globalData.openid) {
      this.loadBalance();
    }
  },

  onShow(){
    if (app.globalData.openid) {
      // 如果全局有余额，先显示全局的
      if (app.globalData.balance !== undefined) {
        this.setData({ balance: app.globalData.balance });
      }
      // 然后重新加载最新的
      this.loadBalance();
    }
  },

})