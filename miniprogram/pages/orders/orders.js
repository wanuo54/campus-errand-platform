// pages/orders/orders.js
const db = wx.cloud.database()
const _ = db.command
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    active: 0,
    publishedOrders: [],
    acceptedOrders: [],
  },

  getOrderList(){
    // 获取发布的订单
    wx.cloud.callFunction({
      name: 'getOrderList',
      data: {
        openid: app.globalData.openid
      },
      success: res => {
        console.log("获取发布的订单成功", res)
        this.setData({ publishedOrders: res.result.list })
      },
      fail: err => {
        console.log(err)
      }
    });
    // 获取已接受的订单
    wx.cloud.callFunction({
      name: 'getOrderList',
      data: { orderTaker: app.globalData.openid },
      success: res => {
        console.log("获取接受的订单成功", res)
        this.setData({ acceptedOrders: res.result.list })
      },
      fail: err => {
        console.log(err)
      }
  })
  },

  handleCancelOrder(e){
    let that = this
    wx.showLoading({
      title: '正在删除数据......',
      mask:"true"
    })
    const index = e.currentTarget.dataset.index
    const _id = e.currentTarget.dataset.orderId;
    db.collection('order_list').doc(_id).remove({
      success: function(res) {
        wx.hideLoading()
        let newOrders = that.data.publishedOrders
        newOrders.splice(index, 1)
        that.setData({
          publishedOrders: newOrders
        })

      }
    })
  },

  toOrderDetail(e){
    const id = e.currentTarget.dataset.orderId
      wx.navigateTo({
        url: "/pages/orderDetail/orderDetail?id="+id,
      })
  },

  // 接单人：申请完成
  handleApplyFinish(e){
    const that = this;
    const id = e.currentTarget.dataset.orderId;
    const index = e.currentTarget.dataset.index;
    const order = this.data.acceptedOrders[index];

    wx.showModal({
      title: '申请完成',
      content: `确认已完成订单并申请验收吗？\n发单人确认后赏金将转入你的钱包`,
      confirmText: '申请完成',
      confirmColor: '#1989fa',
      success: modalRes => {
        if (modalRes.confirm) {
          that.doApplyFinish(id, index);
        }
      }
    })
  },

  doApplyFinish(id, index){
    const that = this;
    wx.showLoading({ title: '提交中...' });
    const updateData = { status: '待确认' };
    wx.cloud.callFunction({
      name: 'updateOrder',
      data: { _id: id, updateData },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          wx.showToast({ icon: 'success', title: '已申请完成' });
          const updatedOrder = 'acceptedOrders[' + index + '].status';
          that.setData({ [updatedOrder]: '待确认' });
        } else {
          wx.showToast({ icon: 'none', title: res.result.message || '操作失败' });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.log(err);
        wx.showToast({ icon: 'none', title: '操作失败' });
      }
    })
  },

  // 发单人：确认完成（结算打款）
  handleConfirmFinish(e){
    const that = this;
    const id = e.currentTarget.dataset.orderId;
    const index = e.currentTarget.dataset.index;
    const order = this.data.publishedOrders[index];

    wx.showModal({
      title: '确认完成',
      content: `确认订单已完成吗？\n确认后将从你的钱包扣除 ¥${order.reward} 支付给接单人`,
      confirmText: '确认完成',
      confirmColor: '#1989fa',
      success: modalRes => {
        if (modalRes.confirm) {
          that.doConfirmFinish(id, index, order);
        }
      }
    })
  },

  doConfirmFinish(id, index, order){
    const that = this;
    wx.showLoading({ title: '结算中...' });

    // 调用结算云函数：从发单人扣款，给接单人加钱
    wx.cloud.callFunction({
      name: 'walletCompleteOrder',
      data: {
        orderId: id,
        amount: Number(order.reward),
        orderTaker: order.orderTaker,
        publisher: order._openid,
        title: order.title
      },
      success: settleRes => {
        if (settleRes.result && settleRes.result.success) {
          // 结算成功，更新订单状态
          const updateData = { status: '已完成' };
          wx.cloud.callFunction({
            name: 'updateOrder',
            data: { _id: id, updateData },
            success: res => {
              wx.hideLoading();
              wx.showToast({ icon: 'success', title: '订单已完成' });
              const updatedOrder = 'publishedOrders[' + index + '].status';
              that.setData({ [updatedOrder]: '已完成' });
            },
            fail: err => {
              wx.hideLoading();
              console.log(err);
              wx.showToast({ icon: 'none', title: '更新订单状态失败' });
            }
          })
        } else {
          wx.hideLoading();
          console.log('结算失败详情：', settleRes.result);
          const errMsg = settleRes.result && settleRes.result.message ? settleRes.result.message : '结算失败';
          wx.showModal({
            title: '结算失败',
            content: errMsg,
            showCancel: false
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.log('结算调用失败', err);
        wx.showModal({
          title: '调用失败',
          content: '请先部署 walletCompleteOrder 云函数\n\n' + (err.errMsg || ''),
          showCancel: false
        });
      }
    })
  },

  toComment(e){
    const id = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: '/pages/orders/comment/comment?id=' + id,
    })
  },

  toEditOrder(e){
    const id = e.currentTarget.dataset.orderId;
    const index = e.currentTarget.dataset.index;
    //如果当前订单状态为待接单，则跳转到修改订单，否则跳转到订单详情
    if(this.data.publishedOrders[index].status == '待接单'){
      wx.navigateTo({
        url: '/pages/publish/publish?id=' + id,
      })
    }else{
      wx.navigateTo({
        url: "/pages/orderDetail/orderDetail?id="+id,
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getOrderList();
  },

  onShow() {
    // tabBar 页面切换时刷新
    this.getOrderList();
  },

})
