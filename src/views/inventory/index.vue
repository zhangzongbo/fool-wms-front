<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>库存查询</h2>
        <p class="page-subtitle">按货主 / SKU / 批次 / 库位维度的实时库存，受数据范围隔离</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData(true)"
          ><el-icon><Refresh /></el-icon> 刷新</el-button
        >
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ rawList.length }}</div>
            <div class="stat-label">库存记录数</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card success">
          <div class="stat-content">
            <div class="stat-value">{{ totalQty }}</div>
            <div class="stat-label">在库总量</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card warning">
          <div class="stat-content">
            <div class="stat-value">{{ totalFrozen }}</div>
            <div class="stat-label">冻结总量</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card danger">
          <div class="stat-content">
            <div class="stat-value">{{ zeroCount }}</div>
            <div class="stat-label">零可用库存</div>
          </div>
        </div></el-col
      >
    </el-row>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"
            ><el-form-item label="货主"
              ><el-select v-model="search.ownerId" placeholder="全部货主" clearable style="width: 100%">
                <el-option
                  v-for="o in owners"
                  :key="o.id"
                  :label="o.ownerName"
                  :value="o.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="6"
            ><el-form-item label="商品编码/名称"
              ><el-input v-model="search.keyword" placeholder="商品编码或名称" clearable /></el-form-item
          ></el-col>
          <el-col :span="5"
            ><el-form-item label="批次号"
              ><el-input v-model="search.batchNo" placeholder="批次号" clearable /></el-form-item
          ></el-col>
          <el-col :span="7"
            ><el-form-item label=" ">
              <el-button type="primary" @click="page.current = 1"
                ><el-icon><Search /></el-icon>查询</el-button
              >
              <el-button @click="resetSearch"
                ><el-icon><Refresh /></el-icon>重置</el-button
              >
            </el-form-item></el-col
          >
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column label="货主" min-width="140"
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column prop="productCode" label="商品编码" min-width="130" show-overflow-tooltip />
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="locationCode" label="库位" min-width="110" />
        <el-table-column label="在库量" width="100" align="right"
          ><template #default="{ row }">{{ num(row.quantity) }}</template></el-table-column
        >
        <el-table-column label="冻结量" width="100" align="right">
          <template #default="{ row }"
            ><span :class="{ 'text-warning': num(row.frozenQuantity) > 0 }">{{
              num(row.frozenQuantity)
            }}</span></template
          >
        </el-table-column>
        <el-table-column label="可用量" width="100" align="right">
          <template #default="{ row }"
            ><span :class="available(row) <= 0 ? 'text-danger' : 'text-success'">{{ available(row) }}</span></template
          >
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" align="center" />
      </el-table>
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length"
        :current-page="page.current"
        :page-size="page.size"
        :page-sizes="[10, 20, 50]"
        @current-change="(v) => (page.current = v)"
        @size-change="
          (v) => {
            page.size = v
            page.current = 1
          }
        "
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Refresh, Search } from '@element-plus/icons-vue'
import { inventoryApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { settledValue } from '@/utils'
import { useRefDataStore } from '@/stores/refData'

const refData = useRefDataStore()
const { owners } = storeToRefs(refData)
const loading = ref(false)
const rawList = ref([])
const search = reactive({ ownerId: '', keyword: '', batchNo: '' })

const num = (v) => Number(v ?? 0)
const available = (row) => num(row.quantity) - num(row.frozenQuantity)
// 货主不在当前缓存中时显示 #id，便于排查
const ownerName = (id) => {
  if (!id) return '-'
  const name = refData.ownerName(id)
  return name === '-' ? `#${id}` : name
}

const filtered = computed(() =>
  rawList.value.filter((i) => {
    const kw = search.keyword.trim().toLowerCase()
    const matchKw = !kw || `${i.productCode || ''}${i.productName || ''}`.toLowerCase().includes(kw)
    const matchOwner = !search.ownerId || i.ownerId === search.ownerId
    const matchBatch = !search.batchNo || (i.batchNo || '').includes(search.batchNo.trim())
    return matchKw && matchOwner && matchBatch
  })
)
const { page, pagedList } = useLocalPage(filtered, search)
const totalQty = computed(() => rawList.value.reduce((s, i) => s + num(i.quantity), 0))
const totalFrozen = computed(() => rawList.value.reduce((s, i) => s + num(i.frozenQuantity), 0))
const zeroCount = computed(() => rawList.value.filter((i) => available(i) <= 0).length)

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  loading.value = true
  try {
    const [inv] = await Promise.allSettled([inventoryApi.list(), refData.ensure(['owners'], { force })])
    rawList.value = settledValue(inv, rawList.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => {
  Object.assign(search, { ownerId: '', keyword: '', batchNo: '' })
  page.current = 1
}

onMounted(loadData)
</script>
