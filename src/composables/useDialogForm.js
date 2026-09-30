import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 新增 / 编辑弹窗表单
 * @param {object} options
 * @param {() => object} options.defaultForm 表单初始值工厂
 * @param {(form: object) => Promise} options.create 新增接口
 * @param {(form: object) => Promise} options.update 编辑接口
 * @param {() => void} [options.onSuccess] 保存成功后回调（通常为刷新列表）
 * @param {string} [options.createText] 新增成功提示
 * @param {string} [options.updateText] 编辑成功提示
 */
export function useDialogForm({
  defaultForm,
  create,
  update,
  onSuccess,
  createText = '新增成功',
  updateText = '更新成功'
}) {
  const dialog = reactive({ visible: false, isEdit: false })
  const formRef = ref()
  const form = reactive(defaultForm())
  const submitting = ref(false)

  const resetForm = () => {
    Object.assign(form, defaultForm())
    formRef.value?.clearValidate()
  }
  const openCreate = () => {
    resetForm()
    dialog.isEdit = false
    dialog.visible = true
  }
  const openEdit = (row) => {
    resetForm()
    Object.assign(form, row)
    dialog.isEdit = true
    dialog.visible = true
  }
  const handleSubmit = async () => {
    // 校验失败时 validate() 会 reject，单独处理，避免当作保存失败
    if (!(await formRef.value.validate().catch(() => false))) return
    submitting.value = true
    try {
      if (dialog.isEdit) {
        await update(form)
        ElMessage.success(updateText)
      } else {
        await create(form)
        ElMessage.success(createText)
      }
      dialog.visible = false
      onSuccess?.()
    } catch (e) {
      // 接口错误提示已由请求拦截器统一弹出
    } finally {
      submitting.value = false
    }
  }

  return { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit }
}
