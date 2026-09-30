import { authorizedFetch } from '../apiClient'

export type TaskComment = {
  id: string
  userId: string
  userName: string
  taskId: string
  projectId: string
  parentCommentId: string | null
  content: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCommentPayload = {
  task_id: string
  project_id: string
  parent_comment_id: string | null
  content: string
}

export type CommentAttachment = {
  fileName: string
  fileUrl: string
  fileType: string
  uploadedBy: string
  createdAt: string
}

export type CreateCommentAttachmentPayload = {
  task_id: string
  comment_id: string
  file_name: string
  file_url: string
  file_type: string
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? value as UnknownRecord : {}
}

function textValue(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === 'string') return record[key] as string
  }
  return ''
}

function mapComment(value: unknown): TaskComment {
  const record = asRecord(value)
  return {
    id: textValue(record, ['id']),
    userId: textValue(record, ['user_name', 'userName', 'user_id', 'userId']),
    userName: textValue(record, ['user_name', 'userName']),
    taskId: textValue(record, ['task_id', 'taskId']),
    projectId: textValue(record, ['project_id', 'projectId']),
    parentCommentId: textValue(record, ['parent_comment_id', 'parentCommentId']) || null,
    content: textValue(record, ['content']),
    isDeleted: record.is_delete === true || record.isDeleted === true,
    createdAt: textValue(record, ['created_at', 'createdAt']),
    updatedAt: textValue(record, ['updated_at', 'updatedAt']),
  }
}

function asComments(value: unknown): TaskComment[] {
  if (Array.isArray(value)) return value.map(mapComment)
  const record = asRecord(value)
  for (const key of ['comments', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(mapComment)
    if (record[key] && typeof record[key] === 'object') return asComments(record[key])
  }
  return []
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const response = await authorizedFetch(`/comments/task/${encodeURIComponent(taskId)}`)
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to load task comments.')
  }
  return asComments(data).filter((comment) => !comment.isDeleted)
}

export async function createTaskComment(payload: CreateCommentPayload) {
  const response = await authorizedFetch('/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to add comment.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'Comment added successfully.' }
}

export async function deleteTaskComment(commentId: string) {
  const response = await authorizedFetch(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to delete comment.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'Comment deleted successfully.' }
}

function mapCommentAttachment(value: unknown): CommentAttachment {
  const record = asRecord(value)
  return {
    fileName: textValue(record, ['file_name', 'fileName']),
    fileUrl: textValue(record, ['file_url', 'fileUrl']),
    fileType: textValue(record, ['file_type', 'fileType']),
    uploadedBy: textValue(record, ['uploaded_by', 'uploadedBy']),
    createdAt: textValue(record, ['created_at', 'createdAt']),
  }
}

export async function createCommentAttachment(payload: CreateCommentAttachmentPayload) {
  const response = await authorizedFetch('/comments/create/attachment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data: unknown = await response.json().catch(() => ({}))
  const record = asRecord(data)
  if (!response.ok) {
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to add attachment.')
  }
  return { message: typeof record.message === 'string' ? record.message : 'Attachment added successfully.' }
}

export async function getCommentAttachments(commentId: string): Promise<CommentAttachment[]> {
  const response = await authorizedFetch(`/comments/attachments/${encodeURIComponent(commentId)}`)
  const data: unknown = await response.json().catch(() => [])
  if (!response.ok) {
    const record = asRecord(data)
    throw new Error(typeof record.message === 'string' ? record.message : 'Unable to load attachments.')
  }
  if (Array.isArray(data)) return data.map(mapCommentAttachment)
  const record = asRecord(data)
  for (const key of ['attachments', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(mapCommentAttachment)
  }
  return []
}