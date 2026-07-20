import axios from 'axios'

const ENV_ID = 'cloud1-d2g8xapu734318bbb'
const GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`

// Mock 模式：false = 真实数据，true = 本地模拟
const MOCK_MODE = false

// 匿名登录获取 access_token（缓存到 localStorage）
let accessToken = localStorage.getItem('cb_access_token') || null

async function getAccessToken() {
  if (accessToken) return accessToken
  const res = await axios.post(`${GATEWAY}/auth/v1/signin/anonymously`, {}, {
    headers: { 'x-device-id': 'admin-panel-001', 'Content-Type': 'application/json' },
    timeout: 10000
  })
  accessToken = res.data.access_token
  localStorage.setItem('cb_access_token', accessToken)
  return accessToken
}

// 调用云函数
async function callFunction(data) {
  const token = await getAccessToken()
  const res = await axios.post(`${GATEWAY}/v1/functions/adminApi`, data, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15000
  })
  // 处理两种响应格式：
  // 1. 云函数直接返回 { errcode, errmsg, data }（新格式，API 网关透传）
  // 2. 云函数返回 HTTP 响应格式被 API 网关包裹为 { statusCode, body: "..." }
  if (res.data && res.data.errcode !== undefined) {
    return res.data
  }
  if (res.data && res.data.body) {
    // 旧格式：body 是 JSON 字符串
    const body = typeof res.data.body === 'string' ? JSON.parse(res.data.body) : res.data.body
    return body
  }
  return res.data
}

function getToken() {
  return localStorage.getItem('admin_token') || ''
}

function mockIfNeeded(realCall, mockData) {
  if (!MOCK_MODE) return realCall()
  return realCall().catch(() => mockData)
}

function checkResult(res) {
  if (res.errcode === 0) return res.data
  if (res.errcode === 401) {
    localStorage.removeItem('admin_token')
    window.location.hash = '#/login'
  }
  throw new Error(res.errmsg || '请求失败')
}

export function login(password) {
  return callFunction({ action: 'auth', password }).then(res => {
    if (res.errcode === 0) {
      localStorage.setItem('admin_token', res.data.token)
      return res.data
    }
    throw new Error(res.errmsg || '登录失败')
  })
}

export function getStats() {
  return mockIfNeeded(
    () => callFunction({ action: 'stats', token: getToken() }).then(checkResult),
    { totalOrders: 128, totalUsers: 56, totalAmount: '3580.50', completedOrders: 95, statusCounts: { '待接单': 18, '进行中': 10, '待确认': 5, '已完成': 95 } }
  )
}

export function getOrders(params = {}) {
  return mockIfNeeded(
    () => callFunction({ action: 'orders', token: getToken(), method: 'list', page: params.page || 1, pageSize: params.pageSize || 20, filterStatus: params.filterStatus || 'all' }).then(checkResult),
    { list: [
      { _id: '1', type: '快递', desc: '帮忙取一下中通快递', price: 5, publisherName: '张三', acceptorName: '李四', status: '待接单', createTime: Date.now() },
      { _id: '2', type: '外卖', desc: '帮忙带一份食堂二楼的麻辣烫', price: 8, publisherName: '王五', acceptorName: '', status: '待接单', createTime: Date.now() },
      { _id: '3', type: '商品', desc: '帮忙买洗发水和牙膏', price: 10, publisherName: '赵六', acceptorName: '孙七', status: '进行中', createTime: Date.now() },
      { _id: '4', type: '其他', desc: '帮忙去图书馆还书', price: 3, publisherName: '周八', acceptorName: '吴九', status: '已完成', createTime: Date.now() },
      { _id: '5', type: '快递', desc: '顺丰快递，在西门快递柜', price: 6, publisherName: '郑十', acceptorName: '钱十一', status: '待确认', createTime: Date.now() }
    ], total: 5, page: 1, pageSize: 20 }
  )
}

export function updateOrder(orderId, status) {
  return callFunction({ action: 'orders', token: getToken(), method: 'update', orderId, status }).then(checkResult)
}

export function deleteOrder(orderId) {
  return callFunction({ action: 'orders', token: getToken(), method: 'delete', orderId }).then(checkResult)
}

export function getUsers(params = {}) {
  return mockIfNeeded(
    () => callFunction({ action: 'users', token: getToken(), page: params.page || 1, pageSize: params.pageSize || 20 }).then(checkResult),
    { list: [{ _openid: 'mock', nickName: '测试用户', avatarUrl: '', gender: 1, createTime: Date.now() }], total: 1, page: 1, pageSize: 20 }
  )
}

export function getWalletRecords(params = {}) {
  return mockIfNeeded(
    () => callFunction({ action: 'wallet', token: getToken(), page: params.page || 1, pageSize: params.pageSize || 20 }).then(checkResult),
    { list: [{ _openid: 'mock', type: '充值', amount: 100, balance: 100, desc: '模拟充值', createTime: Date.now() }], total: 1, page: 1, pageSize: 20 }
  )
}