import { authorizedFetch } from '../apiClient'

export type DashboardProject = {
  id: string | number
  name: string
  description: string
  goal: string
  progress: number
  epics: number
  sprints: number
  tasks: number
  completedTasks: number
  status: string
  startDate: string
  endDate: string
  ownerId: string
  ownerName: string
  createdAt: string
  updatedOn: string
}

export type DashboardProfile = {
  user_id: string
  userName: string
  role: string
}

export type DashboardData = {
  projects: DashboardProject[]
  profile: DashboardProfile
  totals: {
    projects: number
    epics: number
    sprints: number
    tasks: number
  }
}

export type CreateProjectPayload = {
  name: string
  description: string
  goal: string
  status: string
  start_date: string
  end_date: string
}

export type UpdateProjectPayload = {
  owner_id: string
  name: string
  description: string
  goal: string
  status: string
  end_date: string
}

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  userName: string
  projectRole: string
  joinedAt: string
  isActive: boolean
}

export type SelectableUser = {
  id: string
  userName: string
}

export type AddProjectMemberPayload = {
  project_id: string
  user_id: string
  project_role: string
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {}
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of ['projects', 'project_members', 'members', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  return []
}

function numberValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  }
  return 0
}

function textValue(record: UnknownRecord, keys: string[], fallback: string) {
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key]) return record[key] as string
  }
  return fallback
}

function mapProject(value: unknown, index: number): DashboardProject {
  const record = asRecord(value)
  const totalTasks = numberValue(record, ['total_tasks', 'tasks', 'task_count'])
  const completedTasks = numberValue(record, ['completed_tasks', 'completed_task_count'])
  const progress = totalTasks > 0
    ? (completedTasks / totalTasks) * 100
    : numberValue(record, ['progress', 'progress_percentage', 'completion'])
  return {
    id: typeof record.id === 'string' || typeof record.id === 'number' ? record.id : index,
    name: textValue(record, ['name', 'project_name', 'title'], `Project ${index + 1}`),
    description: textValue(record, ['description', 'details', 'summary'], 'Project workspace'),
    goal: textValue(record, ['goal', 'project_goal'], 'Project delivery'),
    progress: Math.min(100, Math.max(0, progress)),
    epics: numberValue(record, ['total_epics', 'epics', 'epic_count']),
    sprints: numberValue(record, ['total_sprints', 'sprints', 'sprint_count']),
    tasks: totalTasks,
    completedTasks,
    status: textValue(record, ['status', 'project_status'], 'In Progress'),
    startDate: textValue(record, ['start_date', 'startDate'], 'Not set'),
    endDate: textValue(record, ['end_date', 'endDate'], 'Not set'),
    ownerId: textValue(record, ['owner_id', 'ownerId'], ''),
    ownerName: textValue(record, ['owner_name', 'ownerName', 'owner', 'user_name', 'created_by', 'createdBy'], textValue(record, ['owner_id', 'ownerId', 'created_by', 'createdBy'], 'Not assigned')),
    createdAt: textValue(record, ['created_at', 'createdAt'], 'Recently'),
    updatedOn: textValue(record, ['updated_on', 'updated_at', 'updatedOn'], 'Recently'),
  }
}

let dashboardRequest: Promise<DashboardData> | null = null

async function readJson(path: string) {
  const response = await authorizedFetch(path)
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = asRecord(data).message
    throw new Error(typeof message === 'string' ? message : 'Unable to load dashboard data.')
  }
  return data
}

async function loadDashboardData(): Promise<DashboardData> {
  const [workDetails, projectResponse, profileResponse] = await Promise.all([
    readJson('/projects/get/work/details'),
    readJson('/projects/getprojects'),
    readJson('/auth/profile/dash'),
  ])
  const work = asRecord(workDetails)
  const projects = asArray(projectResponse).map(mapProject)
  const details = asRecord(work.data ?? work)
  const profile = asRecord(profileResponse)

  return {
    projects,
    profile: {
      user_id: textValue(profile, ['user_id', 'userId', 'id', 'sub'], ''),
      userName: textValue(profile, ['user_name', 'username', 'name'], 'User'),
      role: textValue(profile, ['role', 'user_role'], 'User'),
    },
    totals: {
      projects: numberValue(details, ['total_projects', 'projects', 'project_count']),
      epics: numberValue(details, ['total_epics', 'epics', 'epic_count']),
      sprints: numberValue(details, ['total_sprints', 'sprints', 'sprint_count']),
      tasks: numberValue(details, ['total_tasks', 'tasks', 'task_count']),
    },
  }
}

export function getDashboardData(): Promise<DashboardData> {
  if (!dashboardRequest) {
    return refreshDashboardData()
  }

  return dashboardRequest
}

export function refreshDashboardData(): Promise<DashboardData> {
  dashboardRequest = loadDashboardData().catch((error) => {
    dashboardRequest = null
    throw error
  })
  return dashboardRequest
}
async function readProjects(path: string): Promise<DashboardProject[]> {
  const data = await readJson(path)
  const record = asRecord(data)

  if (record.id !== undefined || record.name !== undefined || record.project_name !== undefined) {
    return [mapProject(data, 0)]
  }

  return asArray(data).map(mapProject)
}

async function mutateProject(path: string, method: 'POST' | 'PUT', payload: CreateProjectPayload | UpdateProjectPayload) {
  const response = await authorizedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = asRecord(await response.json().catch(() => ({})))

  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to save project.')
  }

  return { message: typeof data.message === 'string' ? data.message : 'Project saved successfully.' }
}

export function createProject(payload: CreateProjectPayload) {
  return mutateProject('/projects/createproject', 'POST', payload)
}

export function updateProject(projectId: string | number, payload: UpdateProjectPayload) {
  return mutateProject(`/projects/updateproject/${encodeURIComponent(String(projectId))}`, 'PUT', payload)
}

export async function deleteProject(projectId: string | number) {
  const response = await authorizedFetch(`/projects/deleteproject/${encodeURIComponent(String(projectId))}`, {
    method: 'DELETE',
  })
  const data = asRecord(await response.json().catch(() => ({})))

  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to delete project.')
  }

  return { message: typeof data.message === 'string' ? data.message : 'Project deleted successfully.' }
}

export function getProjectsByName(name: string): Promise<DashboardProject[]> {
  return readProjects(`/projects/getproject/name/${encodeURIComponent(name)}`)
}

export function getProjectsByStatus(status: string): Promise<DashboardProject[]> {
  return readProjects(`/projects/getproject/${encodeURIComponent(status)}`)
}

function mapProjectMember(value: unknown): ProjectMember {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id', 'member_id'], ''),
    projectId: textValue(record, ['project_id', 'projectId'], ''),
    userId: textValue(record, ['user_id', 'userId'], ''),
    userName: textValue(record, ['user_name', 'userName'], textValue(record, ['user_id'], 'Unknown user')),
    projectRole: textValue(record, ['project_role', 'projectRole', 'role'], 'Member'),
    joinedAt: textValue(record, ['joined_at', 'joinedAt'], ''),
    isActive: record.is_active !== false && record.isActive !== false,
  }
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const data = await readJson(`/projects/getprojectmember/${encodeURIComponent(projectId)}`)
  return asArray(data).map(mapProjectMember)
}

export async function getProjectMembersByRole(role: string): Promise<ProjectMember[]> {
  const data = await readJson(`/projects/get/projectmember/role/${encodeURIComponent(role)}`)
  return asArray(data).map(mapProjectMember)
}

export async function getSelectableUsers(): Promise<SelectableUser[]> {
  const data = await readJson('/auth/select/users')
  return asArray(data).map((value) => {
    const record = asRecord(value)
    return {
      id: textValue(record, ['id'], ''),
      userName: textValue(record, ['user_name', 'username', 'name'], 'User'),
    }
  }).filter((user) => user.id)
}

export async function addProjectMember(payload: AddProjectMemberPayload): Promise<ProjectMember> {
  const response = await authorizedFetch('/projects/add/projectmember', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = asRecord(data).message
    throw new Error(typeof message === 'string' ? message : 'Unable to add project member.')
  }

  return mapProjectMember(data)
}

export async function deleteProjectMember(userId: string) {
  const response = await authorizedFetch(`/projects/remove/member/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
  const data = asRecord(await response.json().catch(() => ({})))

  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Unable to remove project member.')
  }

  return { message: typeof data.message === 'string' ? data.message : 'Project member removed successfully.' }
}