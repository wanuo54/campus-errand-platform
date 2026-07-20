const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 管理员密码
const ADMIN_PASSWORD = 'admin123'

// CORS 响应头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
}

function success(data = {}, message = 'ok') {
  return { errcode: 0, errmsg: message, data }
}

function fail(errcode, errmsg) {
  return { errcode, errmsg, data: null }
}

function httpResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  }
}

exports.main = async (event, context) => {
  // 判断调用方式：HTTP 触发器 vs API 网关
  // HTTP 触发器：event 包含 httpMethod, body 等字段
  // API 网关：event 直接就是请求体 JSON 对象
  const isHttpTrigger = !!event.httpMethod

  // 处理 OPTIONS 预检请求（仅 HTTP 触发器）
  if (isHttpTrigger && event.httpMethod === 'OPTIONS') {
    return httpResponse(200, '')
  }

  // 解析请求体
  let params = {}
  try {
    if (isHttpTrigger) {
      // HTTP 触发器格式：参数在 event.body 中
      if (event.body) {
        params = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      }
    } else {
      // API 网关格式：event 本身就是参数
      params = event
    }
  } catch (e) {
    return isHttpTrigger ? httpResponse(400, fail(400, '请求参数格式错误')) : fail(400, '请求参数格式错误')
  }

  const { action, token, ...data } = params

  // 登录接口不需要验证
  if (action === 'auth') {
    const result = await handleAuth(data)
    // API 网关返回原始 JSON，HTTP 触发器返回 HTTP 格式
    return isHttpTrigger ? httpResponse(result.errcode === 0 ? 200 : 401, result) : result
  }

  // 验证 token
  if (!token || token !== ADMIN_PASSWORD) {
    return isHttpTrigger ? httpResponse(401, fail(401, '未授权访问')) : fail(401, '未授权访问')
  }

  let result
  switch (action) {
    case 'stats':    result = await handleStats(); break
    case 'orders':   result = await handleOrders(data); break
    case 'users':    result = await handleUsers(data); break
    case 'wallet':   result = await handleWallet(data); break
    default:         result = fail(404, '未知操作: ' + action)
  }

  // API 网关返回原始 JSON，HTTP 触发器返回 HTTP 格式
  return isHttpTrigger ? httpResponse(result.errcode === 0 ? 200 : 400, result) : result
}

// ==================== 登录 ====================
async function handleAuth(data) {
  const { password } = data
  if (password === ADMIN_PASSWORD) {
    return success({ token: ADMIN_PASSWORD }, '登录成功')
  }
  return fail(401, '密码错误')
}

// ==================== 统计 ====================
async function handleStats() {
  try {
    const [orderCount, userCount] = await Promise.all([
      db.collection('order_list').count(),
      db.collection('user_info').count()
    ])

    const allOrders = await db.collection('order_list').limit(1000).get()
    const statusCounts = {}
    let totalAmount = 0
    let completedOrders = 0

    allOrders.data.forEach(order => {
      const status = order.status || '待接单'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      if (status === '已完成') {
        completedOrders++
        if (order.reward) totalAmount += Number(order.reward) || 0
      }
    })

    return success({
      totalOrders: orderCount.total,
      totalUsers: userCount.total,
      totalAmount: totalAmount.toFixed(2),
      completedOrders,
      statusCounts
    })
  } catch (e) {
    console.error('统计失败:', e)
    return fail(-1, '统计查询失败: ' + e.message)
  }
}

// ==================== 订单管理 ====================
async function handleOrders(data) {
  const { method, orderId, status, page = 1, pageSize = 20, filterStatus } = data

  if (method === 'update' && orderId && status) return await updateOrder(orderId, status)
  if (method === 'delete' && orderId) return await deleteOrder(orderId)
  return await listOrders(filterStatus, page, pageSize)
}

async function listOrders(filterStatus, page, pageSize) {
  try {
    const skip = (page - 1) * pageSize

    // 构建匹配条件
    let matchStage = {}
    if (filterStatus && filterStatus !== 'all') {
      matchStage.status = filterStatus
    }

    // 使用聚合查询关联 user_info 获取发布者昵称和接单者昵称
    const pipeline = db.collection('order_list').aggregate()

    if (Object.keys(matchStage).length > 0) {
      pipeline.match(matchStage)
    }

    const result = await pipeline
      .lookup({
        from: 'user_info',
        localField: '_openid',
        foreignField: '_openid',
        as: '_publisherInfo'
      })
      .lookup({
        from: 'user_info',
        localField: 'orderTaker',
        foreignField: '_openid',
        as: '_takerInfo'
      })
      .addFields({
        publisherName: { $arrayElemAt: ['$_publisherInfo.nickName', 0] },
        acceptorName: { $arrayElemAt: ['$_takerInfo.nickName', 0] }
      })
      .project({
        _publisherInfo: 0,
        _takerInfo: 0
      })
      .sort({ addtime: -1 })
      .skip(skip)
      .limit(pageSize)
      .end()

    // 单独查询总数
    let countQuery = db.collection('order_list')
    if (filterStatus && filterStatus !== 'all') {
      countQuery = countQuery.where({ status: filterStatus })
    }
    const countResult = await countQuery.count()

    // 映射字段名：小程序字段 → 后台表格字段
    const list = (result.list || []).map(order => ({
      _id: order._id,
      type: order.category || '其他',
      desc: order.title || '',
      price: order.reward || 0,
      publisherName: order.publisherName || order.mockNickName || '未知',
      acceptorName: order.acceptorName || '未接单',
      status: order.status || '待接单',
      createTime: order.addtime,
      // 保留原始字段供详情使用
      category: order.category,
      title: order.title,
      reward: order.reward,
      pickUpAddress: order.pickUpAddress,
      arrivalAddress: order.arrivalAddress,
      tel: order.tel,
      itemSize: order.itemSize,
      message: order.message
    }))

    return success({ list, total: countResult.total, page, pageSize })
  } catch (e) {
    return fail(-1, '订单查询失败: ' + e.message)
  }
}

async function updateOrder(orderId, status) {
  try {
    await db.collection('order_list').doc(orderId).update({
      data: { status, updateTime: new Date() }
    })
    return success(null, '订单状态更新成功')
  } catch (e) {
    return fail(-1, '订单更新失败: ' + e.message)
  }
}

async function deleteOrder(orderId) {
  try {
    await db.collection('order_list').doc(orderId).remove()
    return success(null, '订单删除成功')
  } catch (e) {
    return fail(-1, '订单删除失败: ' + e.message)
  }
}

// ==================== 用户管理 ====================
async function handleUsers(data) {
  const { page = 1, pageSize = 20 } = data
  try {
    const skip = (page - 1) * pageSize
    const [result, countResult] = await Promise.all([
      db.collection('user_info').skip(skip).limit(pageSize).get(),
      db.collection('user_info').count()
    ])
    return success({ list: result.data, total: countResult.total, page, pageSize })
  } catch (e) {
    return fail(-1, '用户查询失败: ' + e.message)
  }
}

// ==================== 钱包管理 ====================
async function handleWallet(data) {
  const { page = 1, pageSize = 20 } = data
  try {
    const skip = (page - 1) * pageSize
    const [records, countResult] = await Promise.all([
      db.collection('wallet_record').orderBy('createTime', 'desc').skip(skip).limit(pageSize).get(),
      db.collection('wallet_record').count()
    ])
    // 映射字段名
    const list = (records.data || []).map(record => ({
      _openid: record._openid,
      type: record.type === 'income' ? '收入' : record.type === 'expense' ? '支出' : record.type || '未知',
      amount: record.amount || 0,
      desc: record.title || '',
      createTime: record.createTime,
      orderId: record.orderId || ''
    }))
    return success({ list, total: countResult.total, page, pageSize })
  } catch (e) {
    return fail(-1, '钱包记录查询失败: ' + e.message)
  }
}