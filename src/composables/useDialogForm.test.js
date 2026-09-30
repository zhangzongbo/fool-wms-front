import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn() } }))
import { ElMessage } from 'element-plus'
import { useDialogForm } from './useDialogForm'

const mockFormRef = (valid = true) => ({
  validate: vi.fn(() => (valid ? Promise.resolve(true) : Promise.reject({ name: [{ message: '必填' }] }))),
  clearValidate: vi.fn()
})

const setup = (overrides = {}) => {
  const create = vi.fn(() => Promise.resolve(true))
  const update = vi.fn(() => Promise.resolve(true))
  const onSuccess = vi.fn()
  const api = useDialogForm({ defaultForm: () => ({ id: null, name: '' }), create, update, onSuccess, ...overrides })
  api.formRef.value = mockFormRef()
  return { ...api, create, update, onSuccess }
}

describe('useDialogForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('openCreate 重置表单并以新增模式打开', () => {
    const { form, dialog, openCreate } = setup()
    form.name = '脏数据'
    openCreate()
    expect(form).toEqual({ id: null, name: '' })
    expect(dialog).toMatchObject({ visible: true, isEdit: false })
  })

  it('openEdit 回填行数据并以编辑模式打开', () => {
    const { form, dialog, openEdit } = setup()
    openEdit({ id: 7, name: '货主A' })
    expect(form).toEqual({ id: 7, name: '货主A' })
    expect(dialog).toMatchObject({ visible: true, isEdit: true })
  })

  it('新增提交：调用 create、提示、关闭并回调', async () => {
    const { openCreate, handleSubmit, create, update, onSuccess, dialog } = setup({ createText: '创建成功' })
    openCreate()
    await handleSubmit()
    expect(create).toHaveBeenCalledOnce()
    expect(update).not.toHaveBeenCalled()
    expect(ElMessage.success).toHaveBeenCalledWith('创建成功')
    expect(dialog.visible).toBe(false)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('编辑提交：调用 update', async () => {
    const { openEdit, handleSubmit, create, update } = setup()
    openEdit({ id: 7, name: '货主A' })
    await handleSubmit()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
    expect(create).not.toHaveBeenCalled()
  })

  it('校验失败时不调接口、不报「保存失败」', async () => {
    const { openCreate, handleSubmit, create, formRef, dialog } = setup()
    formRef.value = mockFormRef(false)
    openCreate()
    await handleSubmit()
    expect(create).not.toHaveBeenCalled()
    expect(dialog.visible).toBe(true)
  })

  it('接口失败时不抛出异常，弹窗保持打开，submitting 复位', async () => {
    const { openCreate, handleSubmit, dialog, submitting, onSuccess } = setup({ create: () => Promise.reject(new Error('500')) })
    openCreate()
    await expect(handleSubmit()).resolves.toBeUndefined()
    expect(dialog.visible).toBe(true)
    expect(submitting.value).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
