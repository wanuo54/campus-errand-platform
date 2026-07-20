<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #e6f7ff;">
            <el-icon :size="28" color="#1890ff"><List /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #f6ffed;">
            <el-icon :size="28" color="#52c41a"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">注册用户</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #fff7e6;">
            <el-icon :size="28" color="#fa8c16"><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">¥{{ stats.totalAmount }}</div>
            <div class="stat-label">总交易额</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #fff0f6;">
            <el-icon :size="28" color="#eb2f96"><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completedOrders }}</div>
            <div class="stat-label">已完成订单</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>订单状态分布</span>
          </template>
          <div ref="pieChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover">
          <template #header>
            <span>最近订单概况</span>
          </template>
          <div class="status-overview">
            <div class="status-item" v-for="(count, status) in statusCounts" :key="status">
              <el-tag :type="getStatusType(status)" size="large">{{ status }}</el-tag>
              <span class="status-count">{{ count }} 单</span>
            </div>
            <el-empty v-if="Object.keys(statusCounts).length === 0" description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { getStats } from '../api'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const stats = ref({
  totalOrders: 0,
  totalUsers: 0,
  totalAmount: '0.00',
  completedOrders: 0,
  statusCounts: {}
})
const statusCounts = ref({})
const pieChartRef = ref(null)
let pieChart = null

const statusColorMap = {
  '待接单': 'warning',
  '进行中': '',
  '待确认': 'info',
  '已完成': 'success'
}

function getStatusType(status) {
  return statusColorMap[status] || 'info'
}

function renderPieChart() {
  if (!pieChartRef.value) return
  const data = Object.entries(statusCounts.value).map(([name, value]) => ({ name, value }))
  if (data.length === 0) return

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value)
  }
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%'
      },
      data: data,
      color: ['#e6a23c', '#409eff', '#909399', '#67c23a']
    }]
  })
}

async function loadStats() {
  try {
    const data = await getStats()
    stats.value = data
    statusCounts.value = data.statusCounts || {}
    await nextTick()
    renderPieChart()
  } catch (e) {
    ElMessage.error('加载统计数据失败: ' + e.message)
  }
}

watch(statusCounts, () => {
  nextTick(() => renderPieChart())
})

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
.stat-row {
  margin-bottom: 20px;
}
.stat-card {
  margin-bottom: 20px;
}
.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.chart-row {
  margin-bottom: 20px;
}
.chart-box {
  height: 320px;
}
.status-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-count {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
</style>