// index.js
const app = getApp();
Page({
    data: {
        bannerList: [
            '/images/banner1.jpg',
            '/images/banner2.jpg'
        ],
        categories: [
            {
                iconPath: '/images/express.png',
                text: '快递代取'
            },
            {
                iconPath: '/images/catering.png',
                text: '外卖代拿'
            },
            {
                iconPath: '/images/goods.png',
                text: '商品代买'
            },
            {
                iconPath: '/images/item.png',
                text: '物品代送'
            }
        ],
        orderList: [],
        expandedIndex: -1  // 当前展开的订单索引，-1表示都不展开
    },

    onLoad(options){
        this.loadOrderList();
    },

    onShow(){
        // tabBar 页面切换时刷新列表
        this.loadOrderList();
        // 每次回到首页收起展开的详情
        this.setData({ expandedIndex: -1 });
    },

    loadOrderList(){
        wx.cloud.callFunction({
            name: 'getOrderList',
            data: {
                status: '待接单'
            },
            success: res => {
              console.log("获取成功", res)
              const list = res.result.list;
              list.map(item => {
                console.log(item)
                if(item._openid == app.globalData.openid){
                  item.isOwn = true;
                }
              })
              this.setData({
                orderList: list
              })
            },
            fail: err => {
              console.log(err)
            }
        })
    },

    // 展开/收起订单详情
    toggleDetail(e){
        if (!app.globalData.openid) {
            wx.showToast({
              icon: 'none',
              title: '请先登录',
              complete: res => {
                setTimeout(function() {
                  wx.switchTab({
                    url: '/pages/mine/mine',
                  })
                }, 2000);
              }
            })
            return
        }
        const index = e.currentTarget.dataset.index;
        const current = this.data.expandedIndex;
        this.setData({
            expandedIndex: current === index ? -1 : index
        });
    },

    handleAcceptOrder(e){
        if (!app.globalData.openid) {
            wx.showToast({
              icon: 'none',
              title: '请先登录',
              complete: res => {
                setTimeout(function() {
                  wx.switchTab({
                    url: '/pages/mine/mine',
                  })
                }, 2000);
              }
            })
            return
        }
        const id = e.currentTarget.dataset.orderId;
        const index = e.currentTarget.dataset.index;
        const order = this.data.orderList[index];

        // 接单确认弹窗
        wx.showModal({
            title: '确认接单',
            content: `确定要接这个订单吗？\n\n订单：${order.title}\n赏金：¥${order.reward}\n取件：${order.pickUpAddress}\n送达：${order.arrivalAddress}`,
            confirmText: '确认接单',
            confirmColor: '#1989fa',
            success: res => {
                if (res.confirm) {
                    this.doAcceptOrder(id);
                }
            }
        })
    },

    doAcceptOrder(id){
        wx.showLoading({ title: '接单中...' });
        let updateData = {
            status: '进行中', 
            orderTaker: app.globalData.openid
        }
        wx.cloud.callFunction({
            name: 'updateOrder',
            data: {
                _id: id,
                updateData
            },
            success: res => {
                wx.hideLoading();
                console.log("接单结果", res)
                // 兼容新旧两种返回格式
                const result = res.result || {};
                const isSuccess = result.success === true || 
                                  (result.errMsg && result.errMsg.indexOf('ok') > -1);
                if (isSuccess) {
                    wx.showToast({
                        icon: 'success',
                        title: '接单成功',
                        duration: 1500
                    });
                    // 收起展开的详情
                    this.setData({ expandedIndex: -1 });
                    // 刷新列表
                    setTimeout(() => {
                        this.loadOrderList();
                    }, 1500);
                    // 跳转到订单详情
                    setTimeout(() => {
                        wx.navigateTo({
                          url: "/pages/orderDetail/orderDetail?id="+id,
                        })
                    }, 2000);
                } else {
                    wx.showToast({
                        icon: 'none',
                        title: result.message || '接单失败，请重试'
                    });
                }
              },
              fail: err => {
                wx.hideLoading();
                console.log(err);
                wx.showToast({
                    icon: 'none',
                    title: '接单失败，请重试'
                });
              }
        })
    }

})
