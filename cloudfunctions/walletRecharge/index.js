// 云函数：钱包充值
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { amount } = event

  if (!amount || amount <= 0) {
    return { success: false, message: '充值金额无效' }
  }

  try {
    // 查询钱包
    const walletRes = await db.collection('wallet').where({
      _openid: _.eq(OPENID)
    }).get()

    let currentBalance = 0
    if (walletRes.data.length > 0) {
      // 更新余额
      await db.collection('wallet').doc(walletRes.data[0]._id).update({
        data: {
          balance: _.inc(Number(amount))
        }
      })
      currentBalance = (walletRes.data[0].balance || 0) + Number(amount)
    } else {
      // 新建钱包（云函数中需要手动设置 _openid）
      await db.collection('wallet').add({
        data: {
          _openid: OPENID,
          balance: Number(amount),
          createTime: db.serverDate()
        }
      })
      currentBalance = Number(amount)
    }

    // 写入交易记录（云函数中需要手动设置 _openid）
    await db.collection('wallet_record').add({
      data: {
        _openid: OPENID,
        type: 'income',
        title: '账户充值',
        amount: Number(amount),
        orderId: '',
        createTime: db.serverDate()
      }
    })

    return { success: true, message: '充值成功', balance: currentBalance }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
