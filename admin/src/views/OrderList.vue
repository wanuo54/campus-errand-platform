<template>
  <div class="order-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>订单列表</span>
          <el-select
            v-model="filterStatus"
            placeholder="筛选状态"
            clearable
            @change="loadOrders"
            style="width: 140px"
          >
            <el-option label="全部" value="all" />
            <el-option label="待接单" value="待接单" />
            <el-option label="进行中" value="进行中" />
            <el-option label="待确认" value="待确认" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </div>
      </template>

      <el-table :data="orderList" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" size="small">{{ row.type || '其他' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="price" label="酬劳" width="100">
          <template #default="{ row }">
            <span style="color: #e6a23c; font-weight: bold;">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publisherName" label="发布者" width="120" show-overflow-tooltip />
        <el-table-column prop="acceptorName" label="接单者" width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ row.status || '待接单' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === '待接单'"
              type="warning" size="small" text
              @click="handleStatus(row, '进行中')"
            >标记进行中</el-button>
            <el-button
              v-if="row.status === '进行中'"
              type="primary" size="small" text
              @click="handleStatus(row, '待确认')"
            >标记待确认</el-button>
            <el-button
              v-if="row.status === '待确认'"
              type="success" size="small" text
              @click="handleStatus(row, '已完成')"
            >标记已完成</el-button>
            <el-popconfirm
              title="确定删除该订单？"
              @confirm="handleDelete(row._id)"
            >
              <template #reference>
                <el-button type="danger" size="small" text>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrders, updateOrder, deleteOrder } from '../api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const orderList = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterStatus = ref('all')

function typeTag(type) {
  const map = { '快递': 'primary', '外卖': 'success', '商品': 'warning', '其他': 'info' }
  return map[type] || 'info'
}

function statusTag(status) {
  const map = { '待接单': 'warning', '进行中': '', '待确认': 'info', '已完成': 'success' }
  return map[status] || 'info'
}

function formatTime(time) {
  if (!time) return '-'
  // 处理 CloudBase Date 格式: { "$date": "2026-07-20T..." }
  let raw = time
  if (typeof time === 'object' && time.$date) {
    raw = time.$date
  }
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(time)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadOrders() {
  loading.value = true
  try {
    const data = await getOrders({
      page: page.value,
      pageSize: pageSize.value,
      filterStatus: filterStatus.value
    })
    orderList.value = data.list
    total.value = data.total
  } catch (e) {
    ElMessage.error('加载订单失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

async function handleStatus(row, status) {
  try {
    await updateOrder(row._id, status)
    ElMessage.success('状态更新成功')
    loadOrders()
  } catch (e) {
    ElMessage.error('更新失败: ' + e.message)
  }
}

async function handleDelete(id) {
  try {
    await deleteOrder(id)
    ElMessage.success('删除成功')
    loadOrders()
  } catch (e) {
    ElMessage.error('删除失败: ' + e.message)
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.order-page {
  max-width: 1400px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>