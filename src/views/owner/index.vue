<template>
  <div class="page-container">
    <PageHeader subtitle="3PL 多货主主数据，按当前账号数据范围展示">
      <template #actions>
        <el-button v-perm="'sys:owner:add'" type="primary" :icon="Plus" @click="openCreate">新增货主</el-button>
      </template>
    </PageHeader>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ rawList.length }}</div>
            <div class="stat-label">货主总数</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card success">
          <div class="stat-content">
            <div class="stat-value">{{ countBy('status', 'ENABLED') }}</div>
            <div class="stat-label">合作中</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card danger">
          <div class="stat-content">
            <div class="stat-value">{{ countBy('ownerLevel', 'VIP') }}</div>
            <div class="stat-label">VIP 货主</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card warning">
          <div class="stat-content">
            <div class="stat-value">{{ countBy('ownerLevel', 'TRIAL') }}</div>
            <div class="stat-label">试用货主</div>
          </div>
        </div></el-col
      >
    </el-row>

    <SearchPanel :model="search" :show-search="false" :action-span="8" @reset="resetSearch">
      <el-col :span="6"
        ><el-form-item label="货主名称/编码"
          ><el-input v-model="search.keyword" placeholder="名称或编码" clearable /></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="等级"
          ><el-select v-model="search.ownerLevel" placeholder="全部" clearable style="width: 100%">
            <el-option v-for="(v, k) in OWNER_LEVEL" :key="k" :label="v.label" :value="k" /></el-select></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="状态"
          ><el-select v-model="search.status" placeholder="全部" clearable style="width: 100%">
            <el-option v-for="(v, k) in OWNER_STATUS" :key="k" :label="v.label" :value="k" /></el-select></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData" />
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column prop="ownerCode" label="货主编码" min-width="130" show-overflow-tooltip />
        <el-table-column prop="ownerName" label="货主名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contactName" label="联系人" min-width="100" />
        <el-table-column prop="contactPhone" label="联系电话" min-width="130" />
        <el-table-column label="等级" width="100" align="center">
          <template #default="{ row }"
            ><el-tag :type="dictType(OWNER_LEVEL, row.ownerLevel)" effect="light">{{
              dictLabel(OWNER_LEVEL, row.ownerLevel)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"
            ><el-tag :type="dictType(OWNER_STATUS, row.status)">{{
              dictLabel(OWNER_STATUS, row.status)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column prop="registerAddress" label="注册地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }"><RowActions :actions="rowActions(row)" /></template>
        </el-table-column>
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="filtered.length" />
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑货主' : '新增货主'"
      width="720px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12"
            ><el-form-item label="货主编码" prop="ownerCode"
              ><el-input v-model="form.ownerCode" placeholder="唯一编码" :disabled="dialog.isEdit" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="货主名称" prop="ownerName"><el-input v-model="form.ownerName" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="联系人" prop="contactName"><el-input v-model="form.contactName" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="联系电话" prop="contactPhone"><el-input v-model="form.contactPhone" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="等级" prop="ownerLevel"
              ><el-select v-model="form.ownerLevel" style="width: 100%">
                <el-option
                  v-for="(v, k) in OWNER_LEVEL"
                  :key="k"
                  :label="v.label"
                  :value="k" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="状态" prop="status"
              ><el-select v-model="form.status" style="width: 100%">
                <el-option
                  v-for="(v, k) in OWNER_STATUS"
                  :key="k"
                  :label="v.label"
                  :value="k" /></el-select></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="注册地址"><el-input v-model="form.registerAddress" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="营业执照号"><el-input v-model="form.businessLicense" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="法人身份证"><el-input v-model="form.legalIdCard" /></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="银行账户"><el-input v-model="form.bankAccount" /></el-form-item
          ></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import RowActions from '@/components/RowActions.vue'
import { ownerApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { useRefDataStore } from '@/stores/refData'
import { OWNER_LEVEL, OWNER_STATUS, dictLabel, dictType } from '@/constants/dict'

const refData = useRefDataStore()
const loading = ref(false)
const rawList = ref([])
const search = reactive({ keyword: '', ownerLevel: '', status: '' })

const filtered = computed(() =>
  rawList.value.filter((o) => {
    const kw = search.keyword.trim().toLowerCase()
    const matchKw = !kw || `${o.ownerName || ''}${o.ownerCode || ''}`.toLowerCase().includes(kw)
    const matchLevel = !search.ownerLevel || o.ownerLevel === search.ownerLevel
    const matchStatus = !search.status || o.status === search.status
    return matchKw && matchLevel && matchStatus
  })
)
const { page, pagedList } = useLocalPage(filtered, search)
const countBy = (key, val) => rawList.value.filter((o) => o[key] === val).length

const loadData = async () => {
  loading.value = true
  try {
    rawList.value = (await ownerApi.list()) || []
  } catch (e) {
    // 错误提示已由请求拦截器处理
  } finally {
    loading.value = false
  }
}
const resetSearch = () => Object.assign(search, { keyword: '', ownerLevel: '', status: '' })

// 货主变更后，其他页面缓存的货主下拉需重新拉取
const afterChange = () => {
  refData.invalidate('owners')
  loadData()
}

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({
    id: null,
    ownerCode: '',
    ownerName: '',
    contactName: '',
    contactPhone: '',
    ownerLevel: 'NORMAL',
    status: 'ENABLED',
    registerAddress: '',
    businessLicense: '',
    legalIdCard: '',
    bankAccount: ''
  }),
  create: (f) => ownerApi.add(f),
  update: (f) => ownerApi.update(f.id, f),
  onSuccess: afterChange
})
const rules = {
  ownerCode: [{ required: true, message: '请输入货主编码', trigger: 'blur' }],
  ownerName: [{ required: true, message: '请输入货主名称', trigger: 'blur' }],
  contactPhone: [{ pattern: /^\d{7,15}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

const handleDelete = (row) =>
  confirmAction(`确定删除货主「${row.ownerName}」吗？`, () => ownerApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: afterChange
  })

const rowActions = (row) => [
  { label: '编辑', perm: 'sys:owner:update', onClick: () => openEdit(row) },
  { label: '删除', perm: 'sys:owner:delete', danger: true, onClick: () => handleDelete(row) }
]

onMounted(loadData)
</script>
