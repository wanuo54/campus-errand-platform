// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { _id, updateData } = event;
  const { status, orderTaker } = updateData;

  if(status == "进行中"){
    // 接单前先检查订单状态，防止重复接单
    const orderRes = await db.collection('order_list').doc(_id).get();
    if (!orderRes.data || orderRes.data.status !== '待接单') {
      return {
        success: false,
        message: '订单已被接单或不存在'
      }
    }

    let orderTakingTime = db.serverDate() 
    await db.collection('order_list').doc(_id).update({
      data: {
        status,
        orderTaker,
        orderTakingTime,
      }
    })
    return { success: true, message: '接单成功' }
  } else if(status == "待确认"){
    // 接单人申请完成，状态变为待确认
    let applyFinishTime = db.serverDate()
    await db.collection('order_list').doc(_id).update({
      data: {
        status,
        applyFinishTime
      }
    })
    return { success: true, message: '已申请完成，等待发单人确认' }
  } else if(status == "已完成"){
    let orderFinishTime = db.serverDate() ;
    await db.collection('order_list').doc(_id).update({
      data: {
        status,
        orderFinishTime
      }
    })
    return { success: true, message: '更新成功' }
  } else {
    return { success: false, message: '未知状态' }
  }
  
}
