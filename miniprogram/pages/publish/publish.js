// pages/publish/publish.js
const app = getApp()
const db = wx.cloud.database()
const _ = db.command
Page({

  category: '',

  /**
   * 页面的初始数据
   */
  data: {
    id: '', // 订单id 根据id有无判断是更新订单还是发起订单
    title: '',
    message: '',
    tel: '',
    pickUpAddress: '', //取件地址
    arrivalAddress: '', //送达地址
    showArrivalTimePopup: false, //送达时间弹出层是否展示
    arrivalTime: '', //送达时间
    showSizesPopup: false,
    itemSize: '小件',
    sizes: ['特小件', '小件', '中件', '大件', '特大件'],
    reward: 1,
    filter(type, options) { //时间间隔为20分
      if (type === 'minute') {
        return options.filter((option) => option % 20 === 0);
      }
      return options;
    },
  },

  onClickArrivalTime() {
    this.setData({ showArrivalTimePopup: true });
  },

  onCloseArrivalTimePopup() {
    this.setData({ showArrivalTimePopup: false });
  },

  onConfirmArrivalTime(event) {
    this.setData({
      arrivalTime: event.detail,
      showArrivalTimePopup: false
    });
  },

  onClickItemSize(){
    this.setData({ showSizesPopup: true });
  },

  onCloseSizesPopup(){
    this.setData({ showSizesPopup: false });
  },

  onConfirmItemSize(event) {
    this.setData({
      itemSize: event.detail.value,
      showSizesPopup: false
    })
  },

  onChangeReward(event){
    this.setData({
      reward: event.detail
    })
  },

  formSubmit(e){
    console.log(e)
    if (!app.globalData.openid) {
      wx.showToast({
        icon: 'none',
        title: '请先登陆',
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
    wx.showLoading({
      title: '正在发布',
    });
    const {arrivalTime, itemSize, reward} = this.data;
    const {pickUpAddress, arrivalAddress, title, message, tel} = e.detail.value;
    if(pickUpAddress && arrivalAddress && arrivalTime && itemSize && title && tel && reward){
      if(this.data.id){
        db.collection('order_list').doc(this.data.id).update({
          data: {
            category: this.category,
            reward: Number(reward),
            tel: tel,
            message: message,
            title: title,
            pickUpAddress: pickUpAddress,
            arrivalAddress: arrivalAddress,
            arrivalTime: arrivalTime,
            addtime: db.serverDate(),
            itemSize: itemSize,
            status: '待接单', 
          },
          success: res => {
            console.log('更新成功', res)
            wx.hideLoading();
            wx.showToast({
              icon: 'success',
              title: '更新成功',
              complete: res => {
                console.log(res)
                wx.switchTab({
                  url: '/pages/orders/orders',
                })
              }
            })
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({
              icon: 'none',
              title: '更新失败'
            })
            console.log(err)
          }
        })
      }else{
        // 发布新订单：直接创建（订单完成时才扣款）
        db.collection('order_list').add({
          data: {
            category: this.category,
            reward: Number(reward),
            tel: tel,
            message: message,
            title: title,
            pickUpAddress: pickUpAddress,
            arrivalAddress: arrivalAddress,
            arrivalTime: arrivalTime,
            addtime: db.serverDate(),
            itemSize: itemSize,
            status: '待接单', 
          },
          success: res => {
            console.log('发布成功', res)
            wx.hideLoading();
            wx.showToast({
              icon: 'success',
              title: '发布成功',
              complete: res => {
                console.log(res)
                wx.switchTab({
                  url: '/pages/orders/orders',
                })
              }
            })
          },
          fail: err => {
            wx.hideLoading();
            wx.showToast({
              icon: 'none',
              title: '发布失败'
            })
            console.log(err)
          }
        })
      }
    }else {
      wx.showToast({
        icon: 'none',
        title: '请填写完整信息'
      })
    }
  },

  onLoad(options){
    if(options.id){
      db.collection('order_list').doc(options.id).get().then(res => {
        console.log(res);
        const data = res.data
        
        this.category = data.category;
        console.log(res.data)
        this.setData({
          id: data._id,
          title: data.title,
          message: data.message,
          tel: data.tel,
          pickUpAddress: data.pickUpAddress,
          arrivalAddress: data.arrivalAddress,
          arrivalTime: data.arrivalTime,
          itemSize: data.itemSize,
          reward: data.reward,
        })
        wx.setNavigationBarTitle({
          　title: "修改订单"
        })
      })
    }else if(options.category){
      this.category = options.category;
      //更换页面标题
      wx.setNavigationBarTitle({
        　title: options.category  
      })
    }
    

  },

  onShow () {
    // 已移除地图选点功能
  },

  onUnload() {
    // 已移除地图选点功能
  },

})