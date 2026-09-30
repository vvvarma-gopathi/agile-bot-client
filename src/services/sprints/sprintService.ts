import { authorizedFetch } from '../apiClient'

export type Sprint = {
  id: string
  projectId: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SprintTask = {
  id: string
  projectId: string
  userStoryId: string
  title: string
  description: string
  priority: string
  status: string
  assignedTo: string
  createdBy: string
  estimatedHours: number
  actualHours: number
  dueDate: string
  createdAt: string
  updatedAt: string
  completedAt: string
}

export type TaskStatus = 'todo' | 'in progress' | 'in review' | 'completed'

export type SprintPayload = {
  name: string
  project_id: string
  goal: string
  start_date: string
  end_date: string
  status: string
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {}
}

function textValue(record: UnknownRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string
  }
  return fallback
}

function numberValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  }
  return 0
}

function mapSprint(value: unknown): Sprint {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id']),
    projectId: textValue(record, ['project_id', 'projectId']),
    name: textValue(record, ['name', 'title'], 'Untitled sprint'),
    goal: textValue(record, ['goal'], 'No goal provided.'),
    startDate: textValue(record, ['start_date', 'startDate'], 'Not set'),
    endDate: textValue(record, ['end_date', 'endDate'], 'Not set'),
    status: textValue(record, ['status'], 'Planned'),
    createdBy: textValue(record, ['created_by', 'createdBy'], 'Not assigned'),
    createdAt: textValue(record, ['created_at', 'createdAt']),
    updatedAt: textValue(record, ['updated_at', 'updatedAt']),
  }
}

function mapTask(value: unknown): SprintTask {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id']),
    projectId: textValue(record, ['project_id', 'projectId']),
    userStoryId: textValue(record, ['user_story_id', 'userStoryId']),
    title: textValue(record, ['title', 'name'], 'Untitled task'),
    description: textValue(record, ['description', 'details'], 'No description available.'),
    priority: textValue(record, ['priority'], 'Medium'),
    status: textValue(record, ['status'], 'Not Started'),
    assignedTo: textValue(record, ['assigned_to', 'assignedTo'], 'Not assigned'),
    createdBy: textValue(record, ['created_by', 'createdBy'], 'Not assigned'),
    estimatedHours: numberValue(record, ['estimated_hours', 'estimatedHours']),
    actualHours: numberValue(record, ['actual_hours', 'actualHours']),
    dueDate: textValue(record, ['due_date', 'dueDate'], 'Not set'),
    createdAt: textValue(record, ['created_at', 'createdAt']),
    updatedAt: textValue(record, ['updated_at', 'updatedAt']),
    completedAt: textValue(record, ['completed_at', 'completedAt']),
  }
}

function asArray(value: unknown, keys: string[]) {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

async function readJson(path: string) {
  const response = await authorizedFetch(path)
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to load sprints.')
  }
  return { data, message: typeof record.message === 'string' ? record.message : '' }
}

export async function getSprints(projectId: string) {
  const result = await readJson(`/sprints/getall/sprints/${encodeURIComponent(projectId)}`)
  return { sprints: asArray(result.data, ['sprints', 'data', 'items', 'results']).map(mapSprint), message: result.message }
}

export async function getSprintTasks(sprintId: string) {
  const result = await readJson(`/epics/get/tasks/${encodeURIComponent(sprintId)}`)
  return { tasks: asArray(result.data, ['tasks', 'data', 'items', 'results']).map(mapTask), message: result.message }
}

async function mutateSprint(path: string, method: 'POST' | 'PUT', payload: SprintPayload) {
  const response = await authorizedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const record = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to save sprint.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'Sprint saved successfully.' }
}

export function createSprint(payload: SprintPayload) {
  return mutateSprint('/sprints/create', 'POST', payload)
}

export function updateSprint(sprintId: string, payload: SprintPayload) {
  return mutateSprint(`/sprints/update/${encodeURIComponent(sprintId)}`, 'PUT', payload)
}

export async function deleteSprint(sprintId: string) {
  const response = await authorizedFetch(`/sprints/delete/${encodeURIComponent(sprintId)}`, { method: 'DELETE' })
  const record = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to delete sprint.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'Sprint deleted successfully.' }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const response = await authorizedFetch(`/epics/task/update/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  const data = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to update task status.')
  }
  return { message: typeof data.message === 'string' ? data.message : 'Task status updated successfully.' }
}