import { authorizedFetch } from '../apiClient'

export type Epic = {
  id: string
  projectId: string
  title: string
  description: string
  status: string
  priority: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type EpicPayload = {
  project_id: string
  title: string
  description: string
  status: string
  priority: string
}

export type UserStory = {
  id: string
  epicId: string
  title: string
  description: string
  acceptanceCriteria: string
  priority: string
  storyPoints: number
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateUserStoryPayload = {
  epic_id: string
  title: string
  description: string
  acceptance_criteria: string
  priority: string
  story_points: number
  status: string
}

export type UpdateUserStoryPayload = Partial<Omit<CreateUserStoryPayload, 'epic_id'>>

export type Task = {
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

function mapEpic(value: unknown): Epic {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id', 'epic_id', 'epicId']),
    projectId: textValue(record, ['project_id', 'projectId']),
    title: textValue(record, ['title', 'epic_title', 'epicTitle', 'name'], 'Untitled epic'),
    description: textValue(record, ['description', 'details'], 'No description available.'),
    status: textValue(record, ['status'], 'Not Started'),
    priority: textValue(record, ['priority'], 'Medium'),
    createdBy: textValue(record, ['created_by', 'createdBy'], 'Not assigned'),
    createdAt: textValue(record, ['created_at', 'createdAt']),
    updatedAt: textValue(record, ['updated_at', 'updatedAt']),
  }
}

function mapUserStory(value: unknown): UserStory {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id']),
    epicId: textValue(record, ['epic_id', 'epicId']),
    title: textValue(record, ['title', 'name'], 'Untitled user story'),
    description: textValue(record, ['description', 'details'], 'No description available.'),
    acceptanceCriteria: textValue(record, ['acceptance_criteria', 'acceptanceCriteria'], 'Not provided'),
    priority: textValue(record, ['priority'], 'Medium'),
    storyPoints: numberValue(record, ['story_points', 'storyPoints']),
    status: textValue(record, ['status'], 'Not Started'),
    createdBy: textValue(record, ['created_by', 'createdBy'], 'Not assigned'),
    createdAt: textValue(record, ['created_at', 'createdAt']),
    updatedAt: textValue(record, ['updated_at', 'updatedAt']),
  }
}

function mapTask(value: unknown): Task {
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

async function readJson(path: string) {
  const response = await authorizedFetch(path)
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to load epics.')
  }
  return data
}

function asEpicArray(value: unknown): Epic[] {
  if (Array.isArray(value)) return value.map(mapEpic)
  const record = asRecord(value)
  for (const key of ['epics', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(mapEpic)
    if (record[key] && typeof record[key] === 'object') return asEpicArray(record[key])
  }
  return []
}

function asUserStoryArray(value: unknown): UserStory[] {
  if (Array.isArray(value)) return value.map(mapUserStory)
  const record = asRecord(value)
  for (const key of ['user_stories', 'userStories', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(mapUserStory)
  }
  return []
}

function asTaskArray(value: unknown): Task[] {
  if (Array.isArray(value)) return value.map(mapTask)
  const record = asRecord(value)
  for (const key of ['tasks', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(mapTask)
  }
  return []
}

export async function getEpics(projectId: string) {
  return asEpicArray(await readJson(`/epics/getepics/${encodeURIComponent(projectId)}`))
}

export async function searchEpicsByTitle(title: string) {
  return asEpicArray(await readJson(`/epics/getepics/title/${encodeURIComponent(title)}`))
}

export async function getUserStories(epicId: string) {
  return asUserStoryArray(await readJson(`/epics/get/userstories/${encodeURIComponent(epicId)}`))
}

export async function getTasks(userStoryId: string) {
  return asTaskArray(await readJson(`/epics/get/task/${encodeURIComponent(userStoryId)}`))
}

async function mutateUserStory(path: string, method: 'POST' | 'PUT', payload: CreateUserStoryPayload | UpdateUserStoryPayload) {
  const response = await authorizedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const record = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to save user story.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'User story saved successfully.' }
}

export function createUserStory(payload: CreateUserStoryPayload) {
  return mutateUserStory('/epics/create/userstory', 'POST', payload)
}

export function updateUserStory(userStoryId: string, payload: UpdateUserStoryPayload) {
  if (!Object.keys(payload).length) {
    throw new Error('Update at least one user story field.')
  }
  return mutateUserStory(`/epics/update/userstory/${encodeURIComponent(userStoryId)}`, 'PUT', payload)
}

export async function deleteUserStory(userStoryId: string) {
  const response = await authorizedFetch(`/epics/delete/userstory/${encodeURIComponent(userStoryId)}`, { method: 'DELETE' })
  const record = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to delete user story.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'User story deleted successfully.' }
}

async function mutateEpic(path: string, method: 'POST' | 'PUT', payload: EpicPayload) {
  const response = await authorizedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to save epic.')
  }
  return { message: typeof data.message === 'string' ? data.message : 'Epic saved successfully.' }
}

export function createEpic(payload: EpicPayload) {
  return mutateEpic('/epics/create/epic', 'POST', payload)
}

export function updateEpic(epicId: string, payload: EpicPayload) {
  return mutateEpic(`/epics/update/epic/${encodeURIComponent(epicId)}`, 'PUT', payload)
}

export async function deleteEpic(epicId: string) {
  const response = await authorizedFetch(`/epics/delete/epic/${encodeURIComponent(epicId)}`, { method: 'DELETE' })
  const data = asRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to delete epic.')
  }
  return { message: typeof data.message === 'string' ? data.message : 'Epic deleted successfully.' }
}