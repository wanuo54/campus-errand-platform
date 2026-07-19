// pages/orderDetail/orderDetail.js
const db = wx.cloud.database()
const app = getApp()
Page({

  id: undefined,
  isPublisher: false, // 是否是发单人
  isTaker: false,     // 是否是接单人

  /**
   * 页面的初始数据
   */
  data: {
    order: {
      title: '',
      pickUpAddress: '',
      arrivalAddress: '',
      arrivalTime: '',
      itemSize: '',
      tel: '',
      message: '',
      reward: ''
    },
    isPublisher: false,
    isTaker: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const that = this
    const id = options.id;
    this.id = id;
    wx.cloud.callFunction({
      name: 'getOneOrder',
      data: {
        _id: id
      },
      success: res => {
        console.log("获取订单成功", res)
        const order = res.result.list[0]
        const isPublisher = order._openid === app.globalData.openid
        const isTaker = order.orderTaker === app.globalData.openid
        that.setData({
          order: order,
          isPublisher: isPublisher,
          isTaker: isTaker
        })
        that.isPublisher = isPublisher
        that.isTaker = isTaker
      },
      fail: err => {
        console.log(err)
      }
    })
  },

  // 接单人：申请完成
  handleApplyFinish(){
    const that = this
    const _id = this.id
    wx.showModal({
      title: '申请完成',
      content: '确认已完成订单并申请验收吗？\n发单人确认后赏金将转入你的钱包',
      confirmText: '申请完成',
      confirmColor: '#1989fa',
      success: modalRes => {
        if (modalRes.confirm) {
          that.doApplyFinish(_id)
        }
      }
    })
  },

  doApplyFinish(_id){
    const that = this
    wx.showLoading({ title: '提交中...' })
    const updateData = { status: '待确认' }
    wx.cloud.callFunction({
      name: 'updateOrder',
      data: { _id, updateData },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({ icon: 'success', title: '已申请完成' })
          // 刷新订单状态
          that.refreshOrder()
        } else {
          wx.showToast({ icon: 'none', title: res.result.message || '操作失败' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.log(err)
        wx.showToast({ icon: 'none', title: '操作失败' })
      }
    })
  },

  // 发单人：确认完成（结算打款）
  handleConfirmFinish(){
    const that = this
    const _id = this.id
    const order = this.data.order

    wx.showModal({
      title: '确认完成',
      content: `确认订单已完成吗？\n确认后将从你的钱包扣除 ¥${order.reward} 支付给接单人`,
      confirmText: '确认完成',
      confirmColor: '#1989fa',
      success: modalRes => {
        if (modalRes.confirm) {
          that.doConfirmFinish(_id, order)
        }
      }
    })
  },

  doConfirmFinish(_id, order){
    const that = this
    wx.showLoading({ title: '结算中...' })

    // 调用结算云函数：从发单人扣款，给接单人加钱
    wx.cloud.callFunction({
      name: 'walletCompleteOrder',
      data: {
        orderId: _id,
        amount: Number(order.reward),
        orderTaker: order.orderTaker,
        publisher: order._openid,
        title: order.title
      },
      success: settleRes => {
        if (settleRes.result && settleRes.result.success) {
          // 结算成功，更新订单状态
          const updateData = { status: '已完成' }
          wx.cloud.callFunction({
            name: 'updateOrder',
            data: { _id, updateData },
            success: res => {
              wx.hideLoading()
              wx.showToast({ icon: 'success', title: '订单已完成' })
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            },
            fail: err => {
              wx.hideLoading()
              console.log(err)
              wx.showToast({ icon: 'none', title: '更新订单状态失败' })
            }
          })
        } else {
          wx.hideLoading()
          console.log('结算失败详情：', settleRes.result)
          const errMsg = settleRes.result && settleRes.result.message ? settleRes.result.message : '结算失败';
          wx.showModal({
            title: '结算失败',
            content: errMsg,
            showCancel: false
          })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.log('结算调用失败', err)
        wx.showModal({
          title: '调用失败',
          content: '请先部署 walletCompleteOrder 云函数\n\n' + (err.errMsg || ''),
          showCancel: false
        })
      }
    })
  },

  // 刷新订单信息
  refreshOrder(){
    const that = this
    wx.cloud.callFunction({
      name: 'getOneOrder',
      data: { _id: this.id },
      success: res => {
        that.setData({
          order: res.result.list[0]
        })
      },
      fail: err => {
        console.log(err)
      }
    })
  },

})
