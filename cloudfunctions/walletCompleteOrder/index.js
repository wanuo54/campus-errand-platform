// 云函数：订单完成结算（从发单人钱包扣款，给接单人加钱）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderId, amount, orderTaker, publisher, title } = event

  console.log('结算参数：', { orderId, amount, orderTaker, publisher, title })

  if (!orderTaker || !publisher || !amount || amount <= 0) {
    return { success: false, message: '参数无效：' + JSON.stringify(event) }
  }

  try {
    // 1. 查询发单人钱包
    const publisherWalletRes = await db.collection('wallet').where({
      _openid: _.eq(publisher)
    }).get()

    console.log('发单人钱包查询结果：', publisherWalletRes.data.length, '条记录')

    if (publisherWalletRes.data.length === 0) {
      return { success: false, message: '发单人钱包不存在，请先充值（发单人openid：' + publisher + '）' }
    }

    const publisherBalance = publisherWalletRes.data[0].balance || 0
    console.log('发单人当前余额：', publisherBalance)

    if (publisherBalance < Number(amount)) {
      return { success: false, message: '发单人余额不足，当前余额：' + publisherBalance + '，需要：' + amount }
    }

    // 2. 从发单人钱包扣款
    await db.collection('wallet').doc(publisherWalletRes.data[0]._id).update({
      data: {
        balance: _.inc(-Number(amount))
      }
    })
    console.log('发单人扣款成功，扣减：', amount)

    // 3. 写入发单人交易记录（支出）
    await db.collection('wallet_record').add({
      data: {
        _openid: publisher,
        type: 'expense',
        title: `订单完成：${title || '跑腿订单'}`,
        amount: Number(amount),
        orderId: orderId || '',
        createTime: db.serverDate()
      }
    })
    console.log('发单人交易记录已写入')

    // 4. 查询接单人钱包
    const takerWalletRes = await db.collection('wallet').where({
      _openid: _.eq(orderTaker)
    }).get()

    console.log('接单人钱包查询结果：', takerWalletRes.data.length, '条记录')

    if (takerWalletRes.data.length > 0) {
      // 更新余额
      await db.collection('wallet').doc(takerWalletRes.data[0]._id).update({
        data: {
          balance: _.inc(Number(amount))
        }
      })
      console.log('接单人余额更新成功，增加：', amount)
    } else {
      // 新建钱包
      await db.collection('wallet').add({
        data: {
          _openid: orderTaker,
          balance: Number(amount),
          createTime: db.serverDate()
        }
      })
      console.log('接单人新钱包已创建，初始余额：', amount)
    }

    // 5. 写入接单人交易记录（收入）
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
    console.log('接单人交易记录已写入')

    return { success: true, message: '结算成功' }
  } catch (err) {
    console.error('结算异常：', err)
    return { success: false, message: '结算异常：' + err.message }
  }
}
