<template>
  <div class="wallet-page">
    <el-card shadow="hover">
      <template #header>
        <span>钱包交易记录</span>
      </template>

      <el-table :data="records" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="_openid" label="用户OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" size="small">{{ row.type || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.amount > 0 ? '#67c23a' : '#f56c6c', fontWeight: 'bold' }">
              {{ row.amount > 0 ? '+' : '' }}¥{{ row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="orderId" label="关联订单" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.orderId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
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
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getWalletRecords } from '../api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const records = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function typeTag(type) {
  const map = { '收入': 'success', '支出': 'danger', '充值': 'success', '退款': 'warning' }
  return map[type] || 'info'
}

function formatTime(time) {
  if (!time) return '-'
  let raw = time
  if (typeof time === 'object' && time.$date) {
    raw = time.$date
  }
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(time)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadRecords() {
  loading.value = true
  try {
    const data = await getWalletRecords({ page: page.value, pageSize: pageSize.value })
    records.value = data.list
    total.value = data.total
  } catch (e) {
    ElMessage.error('加载钱包记录失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.wallet-page {
  max-width: 1400px;
  margin: 0 auto;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>