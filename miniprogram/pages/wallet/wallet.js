// pages/wallet/wallet.js
const app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({

  data: {
    balance: 0,
    records: [],
    showRecharge: false,
    rechargeAmount: '',
    quickAmounts: [10, 20, 50, 100, 200, 500]
  },

  onLoad() {
    this.loadWallet();
    this.loadRecords();
  },

  onShow() {
    this.loadWallet();
    this.loadRecords();
  },

  // 加载钱包余额
  loadWallet() {
    if (!app.globalData.openid) return;
    db.collection('wallet').where({
      _openid: _.eq(app.globalData.openid)
    }).get().then(res => {
      if (res.data.length > 0) {
        this.setData({
          balance: res.data[0].balance || 0
        });
        app.globalData.balance = res.data[0].balance || 0;
      } else {
        // 没有钱包记录，初始化一个
        db.collection('wallet').add({
          data: {
            balance: 0,
            createTime: db.serverDate()
          }
        }).then(() => {
          this.setData({ balance: 0 });
          app.globalData.balance = 0;
        });
      }
    });
  },

  // 加载交易记录
  loadRecords() {
    if (!app.globalData.openid) return;
    db.collection('wallet_record').where({
      _openid: _.eq(app.globalData.openid)
    }).orderBy('createTime', 'desc').limit(50).get().then(res => {
      // 把 Date 对象转成时间戳，WXS 的 getDate() 才能解析
      const records = res.data.map(item => {
        if (item.createTime && typeof item.createTime.getTime === 'function') {
          item.createTime = item.createTime.getTime();
        }
        return item;
      });
      this.setData({
        records: records
      });
    });
  },

  // 显示充值弹窗
  onShowRecharge() {
    this.setData({ showRecharge: true });
  },

  onCloseRecharge() {
    this.setData({ showRecharge: false, rechargeAmount: '' });
  },

  // 选择快捷金额
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ rechargeAmount: amount });
  },

  // 确认充值
  onConfirmRecharge() {
    const amount = Number(this.data.rechargeAmount || 0);
    if (!amount || amount <= 0) {
      wx.showToast({ icon: 'none', title: '请输入充值金额' });
      return;
    }
    if (amount > 10000) {
      wx.showToast({ icon: 'none', title: '单次充值不超过10000元' });
      return;
    }

    wx.showLoading({ title: '充值中...' });
    wx.cloud.callFunction({
      name: 'walletRecharge',
      data: { amount: amount }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({ icon: 'success', title: '充值成功' });
        this.setData({ showRecharge: false, rechargeAmount: '' });
        this.loadWallet();
        this.loadRecords();
      } else {
        wx.showToast({ icon: 'none', title: res.result.message || '充值失败' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.log('充值失败', err);
      wx.showToast({ icon: 'none', title: '请先部署walletRecharge云函数' });
    });
  },

  // 跳转到提现（暂做提示）
  onWithdraw() {
    wx.showModal({
      title: '提示',
      content: '提现功能需要绑定微信支付，当前为演示版本，暂不支持真实提现。',
      showCancel: false
    });
  }

})
