<template>
  <div class="user-page">
    <el-card shadow="hover">
      <template #header>
        <span>用户列表</span>
      </template>

      <el-table :data="userList" stripe v-loading="loading" style="width: 100%">
        <el-table-column prop="nickName" label="昵称" min-width="150" />
        <el-table-column prop="_openid" label="OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatarUrl" :size="40" />
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            {{ row.gender === 1 ? '男' : row.gender === 2 ? '女' : '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" width="170">
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
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers } from '../api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const userList = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

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

async function loadUsers() {
  loading.value = true
  try {
    const data = await getUsers({ page: page.value, pageSize: pageSize.value })
    userList.value = data.list
    total.value = data.total
  } catch (e) {
    ElMessage.error('加载用户失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-page {
  max-width: 1400px;
  margin: 0 auto;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>