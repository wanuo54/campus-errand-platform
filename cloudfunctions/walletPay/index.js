// 云函数：发布订单时从钱包扣款
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { orderId, amount, title } = event

  if (!amount || amount <= 0) {
    return { success: false, message: '金额无效' }
  }

  try {
    // 查询钱包
    const walletRes = await db.collection('wallet').where({
      _openid: _.eq(OPENID)
    }).get()

    if (walletRes.data.length === 0) {
      return { success: false, message: '钱包不存在，请先充值' }
    }

    const currentBalance = walletRes.data[0].balance || 0
    if (currentBalance < Number(amount)) {
      return { success: false, message: '余额不足，请先充值' }
    }

    // 扣款
    await db.collection('wallet').doc(walletRes.data[0]._id).update({
      data: {
        balance: _.inc(-Number(amount))
      }
    })

    // 写入交易记录（云函数中需要手动设置 _openid）
    await db.collection('wallet_record').add({
      data: {
        _openid: OPENID,
        type: 'expense',
        title: `发布订单：${title || '跑腿订单'}`,
        amount: Number(amount),
        orderId: orderId || '',
        createTime: db.serverDate()
      }
    })

    return { success: true, message: '扣款成功', balance: currentBalance - Number(amount) }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
