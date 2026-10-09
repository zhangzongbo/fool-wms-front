<template>
  <div class="page-container">
    <PageHeader subtitle="维护仓库下的功能库区划分（存储 / 拣货 / 收发货等）">
      <template #actions>
        <el-button v-perm="'sys:area:add'" type="primary" :icon="Plus" @click="openCreate">新增库区</el-button>
      </template>
    </PageHeader>

    <SearchPanel :model="query" :action-span="7" @search="search" @reset="reset">
      <el-col :span="6"
        ><el-form-item label="所属仓库"
          ><el-select v-model="query.warehouseId" placeholder="全部仓库" clearable style="width: 100%" @change="search">
            <el-option
              v-for="w in warehouses"
              :key="w.id"
              :label="w.warehouseName"
              :value="w.id" /></el-select></el-form-item
      ></el-col>
      <el-col :span="6"
        ><el-form-item label="库区名称/编码"
          ><el-input v-model="query.keyword" placeholder="名称或编码，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="库区类型"
          ><el-select v-model="query.areaType" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="t in AREA_TYPE"
              :key="t.value"
              :label="t.label"
              :value="t.value" /></el-select></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)" />
      <el-table v-loading="loading" :data="list" stripe border>
        <el-table-column type="index" :index="rowIndex(page)" label="#" width="60" align="center" />
        <el-table-column prop="areaCode" label="库区编码" min-width="130" show-overflow-tooltip />
        <el-table-column prop="areaName" label="库区名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="所属仓库" min-width="160" show-overflow-tooltip
          ><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column
        >
        <el-table-column label="库区类型" width="120" align="center">
          <template #default="{ row }"
            ><el-tag effect="plain">{{ optionLabel(AREA_TYPE, row.areaType) }}</el-tag></template
          >
        </el-table-column>
        <el-table-column prop="areaDesc" label="描述" min-width="200" show-overflow-tooltip :formatter="tableDash" />
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }"><RowActions :actions="rowActions(row)" /></template>
        </el-table-column>
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="total" @change="reload" />
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑库区' : '新增库区'"
      width="560px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="所属仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width: 100%">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id"
          /></el-select>
        </el-form-item>
        <el-form-item label="库区编码" prop="areaCode"
          ><el-input v-model="form.areaCode" :disabled="dialog.isEdit"
        /></el-form-item>
        <el-form-item label="库区名称" prop="areaName"><el-input v-model="form.areaName" /></el-form-item>
        <el-form-item label="库区类型" prop="areaType">
          <el-select v-model="form.areaType" placeholder="请选择" style="width: 100%">
            <el-option v-for="t in AREA_TYPE" :key="t.value" :label="t.label" :value="t.value"
          /></el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.areaDesc" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import RowActions from '@/components/RowActions.vue'
import { warehouseAreaApi } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { tableDash, rowIndex } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'
import { AREA_TYPE, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { warehouses } = storeToRefs(refData)
const { warehouseName } = refData

// 服务端分页：关键字匹配库区名称 / 编码
const { query, page, list, total, loading, search, reset, reload } = useServerList((p) => warehouseAreaApi.page(p), {
  keyword: '',
  warehouseId: null,
  areaType: null
})

// force：刷新按钮强制重拉参考数据（仓库下拉）
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['warehouses'], { force })])
}

// 库区变更后，其他页面缓存的库区下拉需重新拉取
const afterChange = () => {
  refData.invalidate('areas')
  reload()
}

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({ id: null, warehouseId: '', areaCode: '', areaName: '', areaType: '', areaDesc: '' }),
  create: (f) => warehouseAreaApi.add(f),
  update: (f) => warehouseAreaApi.update(f.id, f),
  onSuccess: afterChange
})
const rules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  areaCode: [{ required: true, message: '请输入库区编码', trigger: 'blur' }],
  areaName: [{ required: true, message: '请输入库区名称', trigger: 'blur' }],
  areaType: [{ required: true, message: '请选择库区类型', trigger: 'change' }]
}

const handleDelete = (row) =>
  confirmAction(`确定删除库区「${row.areaName}」吗？`, () => warehouseAreaApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: afterChange
  })

const rowActions = (row) => [
  { label: '编辑', perm: 'sys:area:update', onClick: () => openEdit(row) },
  { label: '删除', perm: 'sys:area:delete', danger: true, onClick: () => handleDelete(row) }
]

onMounted(() => loadData())
</script>
