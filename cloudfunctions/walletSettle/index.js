// 云函数：订单完成时给接单人打款
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderId, amount, orderTaker, title } = event

  if (!orderTaker || !amount || amount <= 0) {
    return { success: false, message: '参数无效' }
  }

  try {
    // 查询接单人钱包
    const walletRes = await db.collection('wallet').where({
      _openid: _.eq(orderTaker)
    }).get()

    if (walletRes.data.length > 0) {
      // 更新余额
      await db.collection('wallet').doc(walletRes.data[0]._id).update({
        data: {
          balance: _.inc(Number(amount))
        }
      })
    } else {
      // 新建钱包
      await db.collection('wallet').add({
        data: {
          _openid: orderTaker,
          balance: Number(amount),
          createTime: db.serverDate()
        }
      })
    }

    // 写入交易记录（用接单人身份写入需要管理员权限，这里用云函数直接操作）
    // 注意：云函数直接add的记录，_openid是云函数环境的，需要手动指定
    // 这里我们直接操作数据库，手动设置_openid
    await db.collection('wallet_record').add({
      data: {
        _openid: orderTaker,
        type: 'income',
        title: `完成订单：${title || '跑腿订单'}`,
        amount: Number(amount),
        orderId: orderId || '',
        createTime: db.serverDate()
      }
    })

    return { success: true, message: '打款成功' }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
