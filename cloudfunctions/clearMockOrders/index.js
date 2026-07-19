// 云函数入口文件 - 清空所有测试订单
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 删除所有 _openid 以 mock_ 开头的测试订单
    const result = await db.collection('order_list').where({
      _openid: db.RegExp({
        regexp: '^mock_',
        options: 'i'
      })
    }).remove()

    return {
      success: true,
      removed: result.stats.removed,
      message: `已删除 ${result.stats.removed} 条测试订单`
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
