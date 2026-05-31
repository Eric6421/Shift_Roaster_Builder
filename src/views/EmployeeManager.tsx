import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { useRosterController } from '@/controllers/useRosterController'
import { ROLE_OPTIONS, type Employee } from '@/models/types'

type EmployeeFormValues = {
  name: string
  roles: string[]
}

type RosterEmployeeActions = Pick<
  ReturnType<typeof useRosterController>,
  'employees' | 'addEmployee' | 'editEmployee' | 'removeEmployee'
>

type EmployeeManagerProps = RosterEmployeeActions

export function EmployeeManager({
  employees,
  addEmployee,
  editEmployee,
  removeEmployee,
}: EmployeeManagerProps) {
  const [form] = Form.useForm<EmployeeFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  const openCreateModal = useCallback(() => {
    setEditingEmployee(null)
    form.setFieldsValue({ name: '', roles: [] })
    setModalOpen(true)
  }, [form])

  const openEditModal = useCallback(
    (employee: Employee) => {
      setEditingEmployee(employee)
      form.setFieldsValue({ name: employee.name, roles: employee.roles })
      setModalOpen(true)
    },
    [form],
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingEmployee(null)
    form.resetFields()
  }, [form])

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields()
      const name = values.name.trim()
      const roles = values.roles.filter((role) =>
        (ROLE_OPTIONS as readonly string[]).includes(role),
      )

      if (!name) {
        message.error('Employee name cannot be empty.')
        return
      }

      if (roles.length === 0) {
        message.error('Assign at least one role.')
        return
      }

      if (editingEmployee) {
        editEmployee(editingEmployee.id, { name, roles })
        message.success(`Updated ${name}.`)
      } else {
        addEmployee({ name, roles })
        message.success(`Added ${name}.`)
      }

      closeModal()
    } catch {
      message.error('Please fix the highlighted fields before saving.')
    }
  }, [addEmployee, closeModal, editEmployee, editingEmployee, form])

  const handleRemove = useCallback(
    (employee: Employee) => {
      removeEmployee(employee.id)
      message.success(`Removed ${employee.name}.`)
    },
    [removeEmployee],
  )

  const columns: ColumnsType<Employee> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-medium text-slate-800">{name}</span>,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <Space size={[4, 4]} wrap>
          {roles.map((role) => (
            <Tag key={role} color="blue">
              {role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, employee) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Pencil className="h-4 w-4" aria-hidden />}
            aria-label={`Edit ${employee.name}`}
            onClick={() => openEditModal(employee)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Remove employee?"
            description={`Remove ${employee.name} and their shift assignments?`}
            okText="Remove"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemove(employee)}
          >
            <Button
              type="text"
              danger
              icon={<Trash2 className="h-4 w-4" aria-hidden />}
              aria-label={`Remove ${employee.name}`}
            >
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Employees</h2>
          <p className="text-sm text-slate-600">
            Add team members and assign one or more roles for scheduling.
          </p>
        </div>
        <Button type="primary" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={openCreateModal}>
          Add employee
        </Button>
      </div>

      <Table<Employee>
        rowKey="id"
        columns={columns}
        dataSource={employees}
        pagination={false}
        locale={{ emptyText: 'No employees yet. Add your first team member.' }}
        className="rounded-lg bg-white shadow-sm"
      />

      <Modal
        title={editingEmployee ? 'Edit employee' : 'Add employee'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingEmployee ? 'Save changes' : 'Add employee'}
        destroyOnHidden
      >
        <Form<EmployeeFormValues> form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Name is required.' },
              {
                validator: async (_, value: string | undefined) => {
                  if (!value?.trim()) {
                    return Promise.reject(new Error('Name cannot be empty.'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="e.g. Alex Chen" autoFocus maxLength={80} />
          </Form.Item>

          <Form.Item
            label="Roles"
            name="roles"
            rules={[
              { required: true, message: 'Select at least one role.' },
              {
                validator: async (_, value: string[] | undefined) => {
                  const roles = (value ?? []).map((role) => role.trim()).filter(Boolean)
                  if (roles.length === 0) {
                    return Promise.reject(new Error('Assign at least one role.'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select roles"
              options={ROLE_OPTIONS.map((role) => ({ label: role, value: role }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
