// 云函数入口文件 - 生成测试订单（模拟其他用户发单）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { mockOpenid, mockNickName, category, title, message, reward, tel, pickUpAddress, arrivalAddress, arrivalTime, itemSize } = event

  const orderData = {
    _openid: mockOpenid || 'mock_openid_user_A',
    category: category || '快递代取',
    title: title || '测试订单 - 代取快递',
    message: message || '这是一条测试订单，用于模拟其他用户发布的跑腿需求',
    reward: Number(reward) || 5,
    tel: tel || '13800138000',
    pickUpAddress: pickUpAddress || '菜鸟驿站',
    arrivalAddress: arrivalAddress || '东区宿舍1号楼',
    arrivalTime: arrivalTime || '今天18:00前',
    itemSize: itemSize || '小件',
    status: '待接单',
    addtime: db.serverDate(),
    // 额外存一个昵称，方便列表显示
    mockNickName: mockNickName || '测试用户A'
  }

  try {
    const res = await db.collection('order_list').add({
      data: orderData
    })
    return {
      success: true,
      _id: res._id,
      message: '测试订单创建成功'
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
