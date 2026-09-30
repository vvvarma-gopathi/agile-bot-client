import { useEffect, useState, type FormEvent } from 'react'
import { clearAccessToken } from '../../services/auth/authTokenService'
import { createProject, deleteProject, getDashboardData, getProjectsByName, getProjectsByStatus, refreshDashboardData, updateProject, type CreateProjectPayload, type DashboardData, type DashboardProject, type UpdateProjectPayload } from '../../services/dashboard/dashboardService'
import { createEpic, createUserStory, deleteEpic, deleteUserStory, getEpics, getTasks, getUserStories, updateEpic, updateUserStory, type CreateUserStoryPayload, type Epic, type EpicPayload, type Task, type UpdateUserStoryPayload, type UserStory } from '../../services/epics/epicService'
import { createSprint, deleteSprint, getSprintTasks, getSprints, updateSprint, updateTaskStatus, type Sprint, type SprintPayload, type SprintTask, type TaskStatus } from '../../services/sprints/sprintService'
import { createCommentAttachment, createTaskComment, deleteTaskComment, getCommentAttachments, getTaskComments, type CommentAttachment, type TaskComment } from '../../services/comments/commentService'
import { addProjectMember, deleteProjectMember, getProjectMembers, getSelectableUsers, type ProjectMember, type SelectableUser } from '../../services/dashboard/dashboardService'

type CommentAttachmentPanelProps = {
  taskId: string
  comment: TaskComment
  mode: "add" | "show"
  onClose: () => void
  onCreated: () => void
}

function CommentAttachmentPanel({ taskId, comment, mode, onClose, onCreated }: CommentAttachmentPanelProps) {
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [loading, setLoading] = useState(mode === "show");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "show") return;
    let cancelled = false;
    getCommentAttachments(comment.id)
      .then((result) => {
        if (!cancelled) setAttachments(result);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load attachments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [comment.id, mode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await createCommentAttachment({
        task_id: taskId,
        comment_id: comment.id,
        file_name: fileName.trim(),
        file_url: fileUrl.trim(),
        file_type: fileType.trim(),
      });
      window.alert(result.message);
      onCreated();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to add attachment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="comment-attachment-overlay" onMouseDown={onClose}>
      <section
        className="comment-attachment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-attachment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="comment-attachment-heading">
          <div>
            <h3 id="comment-attachment-title">
              {mode === "add" ? "Add attachment" : "Comment attachments"}
            </h3>
            <p>{comment.content}</p>
          </div>
          <button type="button" aria-label="Close attachments" onClick={onClose}>
            ×
          </button>
        </header>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {mode === "add" ? (
          <form className="comment-attachment-form" onSubmit={submit}>
            <label>
              <span>File name</span>
              <input required value={fileName} onChange={(event) => setFileName(event.target.value)} />
            </label>
            <label>
              <span>File URL</span>
              <input type="url" required value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="https://..." />
            </label>
            <label>
              <span>File type</span>
              <input required value={fileType} onChange={(event) => setFileType(event.target.value)} placeholder="e.g. PDF" />
            </label>
            <button className="project-form-submit" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Attachment"}
            </button>
          </form>
        ) : loading ? (
          <p className="detail-loading">Loading attachments...</p>
        ) : !attachments.length ? (
          <p className="detail-empty-state">No attachments for this comment.</p>
        ) : (
          <ul className="comment-attachment-list">
            {attachments.map((attachment, index) => (
              <li key={`${attachment.fileUrl}-${index}`}>
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                  {attachment.fileName || attachment.fileUrl}
                </a>
                <small>
                  {attachment.fileType}
                  {attachment.uploadedBy && ` · Uploaded by ${attachment.uploadedBy}`}
                  {attachment.createdAt && ` · ${formatProjectDate(attachment.createdAt)}`}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type DashboardProps = { pathname: string; onNavigate: (path: string) => void; onLogout: () => void }

const menuItems = [
  ['⌂', 'Dashboard', '/dashboard'],
  ['▣', 'Projects', '/dashboard/projects'],
  ['▱', 'Epics', '/dashboard/epics'],
  ['◷', 'Sprints', '/dashboard/sprints'],
  ['♧', 'Project Members', '/dashboard/members'],
  ['⚙', 'Settings', '/dashboard/settings'],
]

const statItems = [
  ['▣', 'Projects', 'projects', 'from last month'],
  ['▰', 'Epics', 'epics', 'from last month'],
  ['◷', 'Sprints', 'sprints', 'from last month'],
  ['☑', 'Tasks', 'tasks', 'from last month'],
] as const

function projectInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function profileInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function formatProjectDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function getTimeBasedMessage(date: Date) {
  const hour = date.getHours()

  if (hour < 12) return { greeting: 'Good morning', wish: 'Ready to make progress today?' }
  if (hour < 17) return { greeting: 'Good afternoon', wish: 'Keep the momentum going!' }
  if (hour < 21) return { greeting: 'Good evening', wish: 'Great work today. Wrap up strong!' }
  return { greeting: 'Good night', wish: 'Rest well and recharge for tomorrow.' }
}

type ProjectFormProps = {
  mode: 'create' | 'update'
  project?: DashboardProject
  onSaved: () => Promise<void>
}

function ProjectForm({ mode, project, onSaved }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [goal, setGoal] = useState(project?.goal ?? '')
  const [status, setStatus] = useState(project?.status ?? 'planning')
  const [startDate, setStartDate] = useState(project?.startDate === 'Not set' ? '' : project?.startDate ?? '')
  const [endDate, setEndDate] = useState(project?.endDate === 'Not set' ? '' : project?.endDate ?? '')
  const [formError, setFormError] = useState('')
  const isUpdate = mode === 'update'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    try {
      const result = isUpdate
        ? await updateProject(project!.id, { owner_id: project!.ownerId, name, description, goal, status, end_date: endDate } satisfies UpdateProjectPayload)
        : await createProject({ name, description, goal, status, start_date: startDate, end_date: endDate } satisfies CreateProjectPayload)
      window.alert(result.message)
      await onSaved()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to save project.')
    }
  }

  return <form className="project-form" onSubmit={submit}>
    <div className="project-form-grid">
      <label><span>Name</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Status</span><input required value={status} onChange={(event) => setStatus(event.target.value)} /></label>
      <label className="project-form-wide"><span>Description</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label className="project-form-wide"><span>Goal</span><textarea required value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
      {!isUpdate && <label><span>Start Date</span><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>}
      <label><span>End Date</span><input required type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
    </div>
    {formError && <p className="dashboard-error" role="alert">{formError}</p>}
    <button className="project-form-submit" type="submit">{isUpdate ? 'Update Project' : 'Create Project'}</button>
  </form>
}

type EpicFormProps = {
  mode: 'create' | 'update'
  projectId: string
  epic?: Epic
  onSaved: () => void
}

type ProjectMembersSectionProps = {
  projectId: string
}

function ProjectMembersSection({ projectId }: ProjectMembersSectionProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [users, setUsers] = useState<SelectableUser[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState('Member')
  const [roleFilter, setRoleFilter] = useState('')
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [removingUserId, setRemovingUserId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getProjectMembers(projectId).then((result) => {
      if (cancelled) return
      const projectMembers = result.filter((member) => !member.projectId || member.projectId === projectId)
      setAvailableRoles(Array.from(new Set(projectMembers.map((member) => member.projectRole))).sort())
      setMembers(roleFilter
        ? projectMembers.filter((member) => member.projectRole.toLowerCase() === roleFilter.toLowerCase())
        : projectMembers)
    }).catch((loadError) => {
      if (cancelled) return
      setMembers([])
      setAvailableRoles([])
      setError(loadError instanceof Error ? loadError.message : 'Unable to load project members.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [projectId, roleFilter, refreshVersion])

  useEffect(() => {
    if (!showForm || users.length) return
    getSelectableUsers().then(setUsers).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.')
    })
  }, [showForm, users.length])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addProjectMember({ project_id: projectId, user_id: selectedUserId, project_role: role })
      setSelectedUserId('')
      setRole('Member')
      setShowForm(false)
      setRefreshVersion((version) => version + 1)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add project member.')
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (userId: string) => {
    setRemovingUserId(userId)
    setError('')
    try {
      const result = await deleteProjectMember(userId)
      window.alert(result.message)
      setRefreshVersion((version) => version + 1)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove project member.')
    } finally {
      setRemovingUserId('')
    }
  }

  return <section className="project-members-page"><div className="projects-page-heading"><div><h2>Project Members</h2><p>Manage the people collaborating on the selected project.</p></div><button className="member-add-button" type="button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close Form' : '＋ Add Project Member'}</button></div><div className="member-controls"><label><span>Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option>{availableRoles.map((memberRole) => <option key={memberRole} value={memberRole}>{memberRole}</option>)}</select></label></div>{showForm && <form className="member-form" onSubmit={submit}><label><span>User</span><select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}><option value="">Select a user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.userName}</option>)}</select></label><label><span>Role</span><input required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Developer" /></label><button className="project-form-submit" type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Member'}</button></form>}{error && <p className="dashboard-error" role="alert">{error}</p>}{loading ? <p className="detail-loading">Loading project members...</p> : !members.length ? <p className="detail-empty-state">No members found for this project.</p> : <div className="member-card-grid">{members.map((member) => <article className="member-card" key={member.id}><div className="member-avatar">{member.userName.slice(0, 2).toUpperCase()}</div><div className="member-card-info"><strong>{member.userName}</strong><span>{member.projectRole}</span><small>Joined {formatProjectDate(member.joinedAt)}</small></div><i className={`status ${member.isActive ? 'on-track' : 'in-active'}`}>{member.isActive ? 'Active' : 'Inactive'}</i><button className="member-delete-button" type="button" onClick={() => void removeMember(member.userId)} disabled={removingUserId === member.userId}>{removingUserId === member.userId ? 'Removing...' : 'Delete'}</button></article>)}</div>}</section>
}

function EpicForm({ mode, projectId, epic, onSaved }: EpicFormProps) {
  const [title, setTitle] = useState(epic?.title ?? '')
  const [description, setDescription] = useState(epic?.description === 'No description available.' ? '' : epic?.description ?? '')
  const [status, setStatus] = useState(epic?.status ?? 'Not Started')
  const [priority, setPriority] = useState(epic?.priority ?? 'Medium')
  const [formError, setFormError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const payload: EpicPayload = { project_id: projectId, title, description, status, priority }

    try {
      const result = mode === 'update' ? await updateEpic(epic!.id, payload) : await createEpic(payload)
      window.alert(result.message)
      onSaved()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to save epic.')
    }
  }

  return <form className="project-form epic-form" onSubmit={submit}>
    <div className="project-form-grid">
      <label><span>Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span>Status</span><input required value={status} onChange={(event) => setStatus(event.target.value)} /></label>
      <label><span>Priority</span><input required value={priority} onChange={(event) => setPriority(event.target.value)} /></label>
      <label className="project-form-wide"><span>Description</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    </div>
    {formError && <p className="dashboard-error" role="alert">{formError}</p>}
    <button className="project-form-submit" type="submit">{mode === 'update' ? 'Update Epic' : 'Create Epic'}</button>
  </form>
}

type UserStoryFormProps = {
  epicId: string
  story: UserStory | null
  onCancel: () => void
  onSaved: () => void
}

const userStoryStatuses = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Planning", value: "planning" },
  { label: "Completed", value: "completed" },
]

function UserStoryForm({ epicId, story, onCancel, onSaved }: UserStoryFormProps) {
  const [title, setTitle] = useState(story?.title ?? "");
  const [description, setDescription] = useState(story?.description === "No description available." ? "" : story?.description ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(story?.acceptanceCriteria === "Not provided" ? "" : story?.acceptanceCriteria ?? "");
  const [priority, setPriority] = useState(story?.priority ?? "");
  const [storyPoints, setStoryPoints] = useState(story ? String(story.storyPoints) : "");
  const [status, setStatus] = useState(story?.status.toLowerCase() ?? "planning");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (story) {
        const payload: UpdateUserStoryPayload = {};
        if (title !== story.title) payload.title = title;
        if (description !== (story.description === "No description available." ? "" : story.description)) payload.description = description;
        if (acceptanceCriteria !== (story.acceptanceCriteria === "Not provided" ? "" : story.acceptanceCriteria)) payload.acceptance_criteria = acceptanceCriteria;
        if (priority !== story.priority) payload.priority = priority;
        if (storyPoints && Number(storyPoints) !== story.storyPoints) payload.story_points = Number(storyPoints);
        if (status !== story.status.toLowerCase()) payload.status = status;
        if (!Object.keys(payload).length) {
          setError("Change at least one field before updating this user story.");
          return;
        }
        const result = await updateUserStory(story.id, payload);
        window.alert(result.message);
      } else {
        const payload: CreateUserStoryPayload = {
          epic_id: epicId,
          title: title.trim(),
          description: description.trim(),
          acceptance_criteria: acceptanceCriteria.trim(),
          priority: priority.trim(),
          story_points: Number(storyPoints),
          status,
        };
        const result = await createUserStory(payload);
        window.alert(result.message);
      }
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save user story.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-story-form-overlay" onMouseDown={onCancel}>
      <section
        className="user-story-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-story-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="comment-attachment-heading">
          <h3 id="user-story-form-title">{story ? "Update User Story" : "Add User Story"}</h3>
          <button type="button" aria-label="Close user story form" onClick={onCancel}>×</button>
        </header>
        <form className="user-story-form" onSubmit={submit}>
          <label>
            <span>Title</span>
            <input required={!story} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>Description</span>
            <textarea required={!story} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <span>Acceptance criteria</span>
            <textarea required={!story} value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} />
          </label>
          <div className="user-story-form-row">
            <label>
              <span>Priority</span>
              <select required={!story} value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="" disabled>Select priority</option>
                {story && !["low", "moderate", "high"].includes(priority.toLowerCase()) && <option value={priority}>{story.priority}</option>}
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              <span>Story points</span>
              <select required={!story} value={storyPoints} onChange={(event) => setStoryPoints(event.target.value)}>
                <option value="" disabled>Select story points</option>
                {story && !["1", "2", "3", "4", "5"].includes(storyPoints) && <option value={storyPoints}>{story.storyPoints}</option>}
                {[1, 2, 3, 4, 5].map((points) => <option key={points} value={points}>{points}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {story && !userStoryStatuses.some((option) => option.value === status) && <option value={status}>{story.status}</option>}
              {userStoryStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {error && <p className="dashboard-error" role="alert">{error}</p>}
          <div className="user-story-form-actions">
            <button className="project-form-submit" type="submit" disabled={saving}>
              {saving ? "Saving..." : story ? "Update Story" : "Create Story"}
            </button>
            <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

type EpicSectionProps = {
  projectId: string
  canManage: boolean
}

function EpicSection({ projectId, canManage }: EpicSectionProps) {
  const [epics, setEpics] = useState<Epic[]>([])
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showUserStoryForm, setShowUserStoryForm] = useState(false)
  const [editingUserStory, setEditingUserStory] = useState<UserStory | null>(null)
  const [deletingUserStoryId, setDeletingUserStoryId] = useState("")
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [userStoryRefreshVersion, setUserStoryRefreshVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const result = await getEpics(projectId)
        if (!cancelled) {
          const projectEpics = result.filter((epic) => !epic.projectId || epic.projectId === projectId)
          const titleFilter = search.trim().toLowerCase()
          setEpics(titleFilter ? projectEpics.filter((epic) => epic.title.toLowerCase().includes(titleFilter)) : projectEpics)
          setError('')
        }
      } catch (loadError) {
        if (!cancelled) {
          setEpics([])
          setError(loadError instanceof Error ? loadError.message : 'Unable to load epics.')
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId, search, refreshVersion])

  useEffect(() => {
    if (!selectedEpic) return

    let cancelled = false
    setDetailsLoading(true)
    setSelectedStory(null)
    setTasks([])
    getUserStories(selectedEpic.id).then((result) => {
      if (!cancelled) setUserStories(result)
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load user stories.')
    }).finally(() => {
      if (!cancelled) setDetailsLoading(false)
    })

    return () => { cancelled = true }
  }, [selectedEpic, userStoryRefreshVersion])

  const closeUserStoryForm = () => {
    setShowUserStoryForm(false)
    setEditingUserStory(null)
  }

  const saveUserStory = () => {
    closeUserStoryForm()
    setSelectedStory(null)
    setTasks([])
    setUserStoryRefreshVersion((version) => version + 1)
  }

  const removeUserStory = async (story: UserStory) => {
    if (!canManage || !window.confirm(`Do you want to delete user story '${story.title}'?`)) return
    setDeletingUserStoryId(story.id)
    setError('')
    try {
      const result = await deleteUserStory(story.id)
      window.alert(result.message)
      if (selectedStory?.id === story.id) {
        setSelectedStory(null)
        setTasks([])
      }
      setUserStoryRefreshVersion((version) => version + 1)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete user story.')
    } finally {
      setDeletingUserStoryId('')
    }
  }

  useEffect(() => {
    if (!selectedStory) return

    let cancelled = false
    setTasksLoading(true)
    getTasks(selectedStory.id).then((result) => {
      if (!cancelled) setTasks(result)
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load tasks.')
    }).finally(() => {
      if (!cancelled) setTasksLoading(false)
    })

    return () => { cancelled = true }
  }, [selectedStory])

  const visibleEpics = statusFilter ? epics.filter((epic) => epic.status.toLowerCase() === statusFilter.toLowerCase()) : epics
  const epicList = <section className="epics-page">
    <div className="epics-page-heading"><div><h2>Epics</h2><p>Break down big ideas into manageable epics.</p></div>{canManage && <button className="epic-create-button" type="button" onClick={() => setShowCreate(!showCreate)}>＋ Create Epic</button>}</div>
    {canManage && showCreate && <section className="project-form-panel"><div className="panel-heading"><div><span className="panel-icon">＋</span><div><h2>Create Epic</h2><p>Create an epic for the selected project.</p></div></div></div><EpicForm mode="create" projectId={projectId} onSaved={() => { setShowCreate(false); setRefreshVersion((version) => version + 1) }} /></section>}
    <div className="project-controls epic-controls"><label className="project-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search epics..." aria-label="Search epics by title" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter epics by status"><option value="">All Status</option>{Array.from(new Set(epics.map((epic) => epic.status))).map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    <div className="epic-card-grid">{visibleEpics.map((epic) => <button className="epic-card" type="button" key={epic.id} onClick={() => setSelectedEpic(epic)}><div className="epic-card-top"><span className="epic-card-icon">▱</span><span className={`status ${statusClass(epic.status)}`}>{epic.status}</span></div><span className="epic-card-id">{epic.id.slice(0, 8)}</span><h3>{epic.title}</h3><p>{epic.description}</p><footer><span>Priority: {epic.priority}</span><span>{formatProjectDate(epic.updatedAt)}</span></footer></button>)}</div>
    {!error && !visibleEpics.length && <p className="empty-projects">No epics found for this project.</p>}
  </section>

  const removeEpic = async () => {
    if (!selectedEpic) return
    try {
      const result = await deleteEpic(selectedEpic.id)
      window.alert(result.message)
      setSelectedEpic(null)
      setRefreshVersion((version) => version + 1)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete epic.')
    }
  }

  if (selectedEpic) {
    return <section className="epics-page">
      <button className="back-projects-button" type="button" onClick={() => { setSelectedEpic(null); setEditing(false) }}>← Back to Epics</button>
      <article className="epic-detail-card">
        <div className="epic-detail-heading">
          <div><span className="epic-detail-id">Epic</span><h2>{selectedEpic.title}</h2></div>
          <div className="project-detail-actions">
            <span className={`status ${statusClass(selectedEpic.status)}`}>{selectedEpic.status}</span>
            {canManage && <button className="delete-project-button" type="button" onClick={removeEpic}>Delete Epic</button>}
          </div>
        </div>
        {editing && canManage ? (
          <EpicForm mode="update" projectId={projectId} epic={selectedEpic} onSaved={() => { setEditing(false); setSelectedEpic(null); setRefreshVersion((version) => version + 1) }} />
        ) : (
          <>
            <p className="epic-detail-description">{selectedEpic.description}</p>
            <dl className="epic-detail-meta">
              <div><dt>Priority</dt><dd>{selectedEpic.priority}</dd></div>
              <div><dt>Created By</dt><dd>{selectedEpic.createdBy}</dd></div>
              <div><dt>Created</dt><dd>{formatProjectDate(selectedEpic.createdAt)}</dd></div>
              <div><dt>Updated</dt><dd>{formatProjectDate(selectedEpic.updatedAt)}</dd></div>
            </dl>
            {canManage && <button className="project-form-submit" type="button" onClick={() => setEditing(true)}>✎ Edit Epic</button>}
          </>
        )}
      </article>
      <section className="epic-children-section">
        <div className="detail-card-heading">
          <h3>User Stories</h3>
          <div className="epic-story-heading-actions">
            <span className="children-count">{userStories.length}</span>
            {canManage && <button className="epic-create-button" type="button" onClick={() => { setEditingUserStory(null); setShowUserStoryForm(true) }}>+ Add User Story</button>}
          </div>
        </div>
        {detailsLoading && <p className="detail-loading">Loading user stories...</p>}
        {!detailsLoading && !userStories.length && <p className="detail-empty-state">No user stories found for this epic.</p>}
        {!detailsLoading && userStories.length > 0 && (
          <div className="user-story-list">
            {userStories.map((story) => (
              <article className={`user-story-row ${selectedStory?.id === story.id ? 'selected' : ''}`} key={story.id}>
                <button className="user-story-item" type="button" onClick={() => setSelectedStory(story)}>
                  <span><strong>{story.title}</strong><small>{story.description}</small><small className="user-story-acceptance"><b>Acceptance criteria:</b> {story.acceptanceCriteria}</small></span>
                  <span className="user-story-meta"><b>{story.storyPoints} pts</b><i className={`status ${statusClass(story.status)}`}>{story.status}</i></span>
                </button>
                {canManage && (
                  <div className="user-story-actions">
                    <button className="user-story-action" type="button" onClick={() => { setEditingUserStory(story); setShowUserStoryForm(true) }}>Edit</button>
                    <button className="user-story-action delete-project-button" type="button" disabled={deletingUserStoryId === story.id} onClick={() => void removeUserStory(story)}>{deletingUserStoryId === story.id ? 'Deleting...' : 'Delete'}</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {selectedStory && <article className="story-tasks"><div className="detail-card-heading"><div><h3>{selectedStory.title} Tasks</h3><p>{selectedStory.description}</p></div><span className="children-count">{tasks.length}</span></div>{tasksLoading && <p className="detail-loading">Loading tasks...</p>}{!tasksLoading && !tasks.length && <p className="detail-empty-state">No tasks found for this user story.</p>}{!tasksLoading && tasks.length > 0 && <div className="task-list">{tasks.map((task) => <div className="task-item" key={task.id}><div><strong>{task.title}</strong><p>{task.description}</p></div><div className="task-meta"><span className={`status ${statusClass(task.status)}`}>{task.status}</span><small>{task.estimatedHours}h estimated</small></div></div>)}</div>}</article>}
      </section>
      {showUserStoryForm && canManage && (
        <UserStoryForm
          key={editingUserStory?.id ?? 'new-user-story'}
          epicId={selectedEpic.id}
          story={editingUserStory}
          onCancel={closeUserStoryForm}
          onSaved={saveUserStory}
        />
      )}
    </section>
  }

  return epicList
}

type SprintFormProps = {
  projectId: string
  sprint: Sprint | null
  onCancel: () => void
  onSaved: () => void
}

function SprintForm({ projectId, sprint, onCancel, onSaved }: SprintFormProps) {
  const [name, setName] = useState(sprint?.name ?? "");
  const [goal, setGoal] = useState(sprint?.goal ?? "");
  const [startDate, setStartDate] = useState(
    sprint?.startDate && sprint.startDate !== "Not set"
      ? sprint.startDate.slice(0, 10)
      : "",
  );
  const [endDate, setEndDate] = useState(
    sprint?.endDate && sprint.endDate !== "Not set"
      ? sprint.endDate.slice(0, 10)
      : "",
  );
  const [status, setStatus] = useState(sprint?.status.toLowerCase() ?? "planned");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    const payload: SprintPayload = {
      name: name.trim(),
      project_id: sprint?.projectId || projectId,
      goal: goal.trim(),
      start_date: startDate,
      end_date: endDate,
      status,
    };

    try {
      const result = sprint
        ? await updateSprint(sprint.id, payload)
        : await createSprint(payload);
      window.alert(result.message);
      onSaved();
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save sprint.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statuses = ["planned", "active", "completed", "cancelled"];

  return (
    <form className="sprint-form project-form" onSubmit={submit}>
      <div className="project-form-grid">
        <label>
          <span>Sprint name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {!statuses.includes(status) && <option value={status}>{sprint?.status}</option>}
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="project-form-wide">
          <span>Goal</span>
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} required />
        </label>
        <label>
          <span>Start date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label>
          <span>End date</span>
          <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
        </label>
      </div>
      {formError && <p className="dashboard-error" role="alert">{formError}</p>}
      <div className="sprint-form-actions">
        <button className="project-form-submit" type="submit" disabled={saving}>
          {saving ? "Saving..." : sprint ? "Save Sprint" : "Create Sprint"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

type SprintSectionProps = {
  projectId: string
  canManage: boolean
}

function SprintSection({ projectId, canManage }: SprintSectionProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [selectedTask, setSelectedTask] = useState<SprintTask | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState("");
  const [attachmentPanel, setAttachmentPanel] = useState<{
    comment: TaskComment;
    mode: "add" | "show";
  } | null>(null);
  const [profileUserName, setProfileUserName] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "mine">("all");
  const [commentError, setCommentError] = useState("");
  const [commentRefreshVersion, setCommentRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [deletingSprintId, setDeletingSprintId] = useState("");
  const [sprintRefreshVersion, setSprintRefreshVersion] = useState(0);
  const [error, setError] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardData()
      .then((dashboard) => {
        if (!cancelled) {
          setProfileUserName(dashboard.profile.userName);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getSprints(projectId)
      .then((result) => {
        if (cancelled) return;
        if (result.message) window.alert(result.message);
        setSprints(result.sprints);
      })
      .catch((loadError) => {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load sprints.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, sprintRefreshVersion]);

  const closeSprintForm = () => {
    setShowSprintForm(false);
    setEditingSprint(null);
  };

  const saveSprint = () => {
    closeSprintForm();
    setSprintRefreshVersion((version) => version + 1);
  };

  const removeSprint = async (sprint: Sprint) => {
    if (!canManage || !window.confirm(`Do you want to delete sprint '${sprint.name}'`)) return;

    setDeletingSprintId(sprint.id);
    setError("");
    try {
      const result = await deleteSprint(sprint.id);
      window.alert(result.message);
      setSprintRefreshVersion((version) => version + 1);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete sprint.",
      );
    } finally {
      setDeletingSprintId("");
    }
  };

  const selectSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setSelectedTask(null);
    setTasks([]);
    setTasksLoading(true);
    setError("");
    getSprintTasks(sprint.id)
      .then((result) => {
        if (result.message) window.alert(result.message);
        setTasks(result.tasks);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load sprint tasks.",
        );
      })
      .finally(() => setTasksLoading(false));
  };

  useEffect(() => {
    if (!selectedTask) {
      setComments([]);
      return;
    }

    let cancelled = false;
    setCommentsLoading(true);
    setCommentError("");
    getTaskComments(selectedTask.id)
      .then((result) => {
        if (!cancelled) setComments(result);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setComments([]);
          setCommentError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load task comments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTask, commentRefreshVersion]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask || !commentText.trim()) return;

    setCommentSaving(true);
    setCommentError("");
    try {
      const result = await createTaskComment({
        task_id: selectedTask.id,
        project_id: selectedTask.projectId || projectId,
        parent_comment_id: null,
        content: commentText.trim(),
      });
      window.alert(result.message);
      setCommentText("");
      setCommentRefreshVersion((version) => version + 1);
    } catch (submitError) {
      setCommentError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to add comment.",
      );
    } finally {
      setCommentSaving(false);
    }
  };

  const removeComment = async (comment: TaskComment) => {
    setDeletingCommentId(comment.id);
    setCommentError("");
    try {
      const result = await deleteTaskComment(comment.id);
      window.alert(result.message);
      setCommentRefreshVersion((version) => version + 1);
    } catch (deleteError) {
      setCommentError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete comment.",
      );
    } finally {
      setDeletingCommentId("");
    }
  };

  const statusColumns: { label: string; value: TaskStatus }[] = [
    { label: "Todo", value: "todo" },
    { label: "In progress", value: "in progress" },
    { label: "In review", value: "in review" },
    { label: "Completed", value: "completed" },
  ];

  const normalizedStatus = (status: string) =>
    status.trim().toLowerCase().replace(/[_-]+/g, " ");

  const visibleTasks = taskFilter === "mine"
    ? tasks.filter((task) => profileUserName && task.assignedTo === profileUserName)
    : tasks;

  const moveTask = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || normalizedStatus(task.status) === nextStatus) return;

    const previousStatus = task.status;
    setError("");
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId ? { ...item, status: nextStatus } : item,
      ),
    );
    setUpdatingTaskId(taskId);
    try {
      await updateTaskStatus(taskId, nextStatus);
    } catch (updateError) {
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === taskId ? { ...item, status: previousStatus } : item,
        ),
      );
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update task status.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <section className="sprints-page">
      <div className="epics-page-heading">
        <div>
          <h2>{selectedSprint ? `${selectedSprint.name} Tasks` : "Sprints"}</h2>
          <p>
            {selectedSprint
              ? selectedSprint.goal
              : "Plan and track work for the selected project."}
          </p>
        </div>
        {canManage && (
          <button
            className="epic-create-button"
            type="button"
            onClick={() => {
              if (showSprintForm) {
                closeSprintForm();
              } else {
                setEditingSprint(null);
                setShowSprintForm(true);
              }
            }}
          >
            {showSprintForm ? "Close Form" : "+ Create Sprint"}
          </button>
        )}
        {selectedSprint && (
          <label className="sprint-task-filter">
            <span>Filter tasks</span>
            <select
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value as "all" | "mine")}
            >
              <option value="all">All tasks</option>
              <option value="mine">My tasks</option>
            </select>
          </label>
        )}
      </div>
      {canManage && showSprintForm && (
        <SprintForm
          key={editingSprint?.id ?? "new-sprint"}
          projectId={projectId}
          sprint={editingSprint}
          onCancel={closeSprintForm}
          onSaved={saveSprint}
        />
      )}
      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}
      {!selectedSprint && loading && (
        <p className="detail-loading">Loading sprints...</p>
      )}
      {!selectedSprint && !loading && !error && !sprints.length && (
        <p className="detail-empty-state">No sprints found for this project.</p>
      )}
      {!selectedSprint && !loading && sprints.length > 0 && (
        <div className="sprint-card-grid">
          {sprints.map((sprint) => (
            <article className="sprint-card" key={sprint.id}>
              <div className="sprint-card-top">
                <span className="sprint-card-icon">◷</span>
                <span className={`status ${statusClass(sprint.status)}`}>
                  {sprint.status}
                </span>
                {canManage && (
                  <div className="sprint-card-actions">
                    <button
                      className="sprint-card-action"
                      type="button"
                      onClick={() => {
                        setEditingSprint(sprint);
                        setShowSprintForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="sprint-card-action delete-sprint-action"
                      type="button"
                      disabled={deletingSprintId === sprint.id}
                      onClick={() => void removeSprint(sprint)}
                    >
                      {deletingSprintId === sprint.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
              <button
                className="sprint-card-main"
                type="button"
                onClick={() => selectSprint(sprint)}
              >
                <h3>{sprint.name}</h3>
                <p>{sprint.goal}</p>
                <footer>
                  <span>
                    {formatProjectDate(sprint.startDate)} -{" "}
                    {formatProjectDate(sprint.endDate)}
                  </span>
                  <span>{formatProjectDate(sprint.updatedAt)}</span>
                </footer>
              </button>
            </article>
          ))}
        </div>
      )}
      {selectedSprint && (
        <>
          <button
            className="back-projects-button sprint-back-button"
            type="button"
            onClick={() => {
              setSelectedSprint(null);
              setSelectedTask(null);
            }}
          >
            ← Back to sprints
          </button>
          {tasksLoading && (
            <p className="detail-loading">Loading sprint tasks...</p>
          )}
          {!tasksLoading && !visibleTasks.length && (
            <p className="detail-empty-state">
              {taskFilter === "mine"
                ? "No tasks assigned to you in this sprint."
                : "No tasks found for this sprint."}
            </p>
          )}
          {!tasksLoading && visibleTasks.length > 0 && (
            <div className="task-board">
              {statusColumns.map((column) => (
                <section
                  className="task-status-column"
                  key={column.value}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedTaskId)
                      void moveTask(draggedTaskId, column.value);
                    setDraggedTaskId(null);
                  }}
                >
                  <header>
                    <h3>{column.label}</h3>
                    <span>
                      {
                        visibleTasks.filter(
                          (task) =>
                            normalizedStatus(task.status) === column.value,
                        ).length
                      }
                    </span>
                  </header>
                  <div className="task-status-items">
                    {visibleTasks
                      .filter(
                        (task) =>
                          normalizedStatus(task.status) === column.value,
                      )
                      .map((task) => (
                        <article
                          className={`task-item task-board-item ${selectedTask?.id === task.id ? "selected" : ""} ${updatingTaskId === task.id ? "updating" : ""}`}
                          draggable={updatingTaskId !== task.id}
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open comments for ${task.title}`}
                          onClick={() => setSelectedTask(task)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTask(task);
                            }
                          }}
                          onDragStart={() => setDraggedTaskId(task.id)}
                        >
                          <div>
                            <strong>{task.title}</strong>
                            <p>{task.description}</p>
                          </div>
                          <div className="task-meta">
                            <span
                              className={`status ${statusClass(task.status)}`}
                            >
                              {task.status}
                            </span>
                            <small>Assigned to: {task.assignedTo}</small>
                            <small>{task.estimatedHours}h estimated</small>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {selectedTask && (
            <section
              className="task-comments-panel"
              aria-labelledby="task-comments-title"
            >
              <div className="detail-card-heading">
                <div>
                  <h3 id="task-comments-title">
                    Comments: {selectedTask.title}
                  </h3>
                  <p>{selectedTask.description}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close task comments"
                  onClick={() => setSelectedTask(null)}
                >
                  ×
                </button>
              </div>
              <form className="task-comment-form" onSubmit={submitComment}>
                <label htmlFor="task-comment-content">Add a comment</label>
                <textarea
                  id="task-comment-content"
                  required
                  maxLength={4000}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                />
                <button
                  className="project-form-submit"
                  type="submit"
                  disabled={commentSaving || !commentText.trim()}
                >
                  {commentSaving ? "Adding..." : "Add Comment"}
                </button>
              </form>
              {commentError && (
                <p className="dashboard-error" role="alert">
                  {commentError}
                </p>
              )}
              {commentsLoading ? (
                <p className="detail-loading">Loading comments...</p>
              ) : !comments.length ? (
                <p className="detail-empty-state">No comments yet.</p>
              ) : (
                <div className="task-comments-list">
                  {comments.map((comment) => (
                    <article className="task-comment" key={comment.id}>
                      <div>
                        <p>{comment.content}</p>
                        <small>
                          {comment.userName && `${comment.userName} · `}
                          {formatProjectDate(comment.createdAt)}
                        </small>
                      </div>
                      <div className="task-comment-actions">
                        {profileUserName && comment.userName === profileUserName && (
                          <button
                            className="task-comment-attachment-button"
                            type="button"
                            onClick={() => setAttachmentPanel({ comment, mode: "add" })}
                          >
                            Add Attachment
                          </button>
                        )}
                        <button
                          className="task-comment-attachment-button"
                          type="button"
                          onClick={() => setAttachmentPanel({ comment, mode: "show" })}
                        >
                          Show Attachments
                        </button>
                        {profileUserName && comment.userName === profileUserName && (
                        <button
                          className="task-comment-delete"
                          type="button"
                          disabled={deletingCommentId === comment.id}
                          onClick={() => void removeComment(comment)}
                        >
                          {deletingCommentId === comment.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {attachmentPanel && selectedTask && (
                <CommentAttachmentPanel
                  key={`${attachmentPanel.comment.id}-${attachmentPanel.mode}`}
                  taskId={selectedTask.id}
                  comment={attachmentPanel.comment}
                  mode={attachmentPanel.mode}
                  onClose={() => setAttachmentPanel(null)}
                  onCreated={() => setAttachmentPanel({ ...attachmentPanel, mode: "show" })}
                />
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function Dashboard({ pathname, onNavigate, onLogout }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const activeView =
    pathname === "/dashboard/projects"
      ? "projects"
      : pathname === "/dashboard/epics"
        ? "epics"
        : pathname === "/dashboard/sprints"
          ? "sprints"
          : pathname === "/dashboard/members"
            ? "members"
            : pathname === "/dashboard/settings"
              ? "settings"
              : "dashboard";
  const [selectedProject, setSelectedProject] = useState("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [projectResults, setProjectResults] = useState<
    DashboardProject[] | null
  >(null);
  const [projectSearchError, setProjectSearchError] = useState("");
  const [openedProjectId, setOpenedProjectId] = useState<
    string | number | null
  >(null);
  const [editingProjectId, setEditingProjectId] = useState<
    string | number | null
  >(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dashboard data.",
        );
      });
  }, []);

  const refreshProjects = async () => {
    const refreshedData = await refreshDashboardData();
    setData(refreshedData);
    setProjectSearch("");
    setProjectStatus("");
    setProjectResults(null);
    setProjectSearchError("");
  };

  const setActiveView = (view: "dashboard" | "members") => {
    onNavigate(view === "dashboard" ? "/dashboard" : "/dashboard/members");
  };

  useEffect(() => {
    if (!projectSearch.trim() && !projectStatus) {
      setProjectResults(null);
      setProjectSearchError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const request = projectSearch.trim()
        ? getProjectsByName(projectSearch.trim())
        : getProjectsByStatus(projectStatus);
      request
        .then((result) => {
          if (!cancelled) {
            setProjectResults(result);
            setProjectSearchError("");
          }
        })
        .catch((loadError) => {
          if (!cancelled) {
            setProjectResults([]);
            setProjectSearchError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to search projects.",
            );
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [projectSearch, projectStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (activeView === "settings") {
    return (
      <main className="dashboard-page">
        <section className="dashboard-content">
          <header className="dashboard-header">
            <div>
              <h1>Settings</h1>
              <p>Workspace and account details.</p>
            </div>
            <button type="button" onClick={() => onNavigate("/dashboard")}>
              ← Dashboard
            </button>
          </header>
          <section className="project-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon">⚙</span>
                <div>
                  <h2>Account</h2>
                  <p>Signed in as {data?.profile.userName ?? "User"}.</p>
                </div>
              </div>
            </div>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{data?.profile.role ?? "Loading profile..."}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{data?.profile.userName ?? "Loading profile..."}</dd>
              </div>
            </dl>
          </section>
        </section>
      </main>
    );
  }

  const projects = data?.projects ?? [];
  const listedProjects = projectResults ?? projects;
  const profile = data?.profile;
  const timeMessage = getTimeBasedMessage(currentTime);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(currentTime);
  const visibleProjects =
    selectedProject === "all"
      ? projects
      : projects.filter((project) => String(project.id) === selectedProject);
  const openedProject = listedProjects.find(
    (project) => project.id === openedProjectId,
  );
  const canManageProjects = ["project manager", "admin"].includes(
    profile?.role.trim().toLowerCase() ?? "",
  );

  const logout = () => {
    clearAccessToken();
    onLogout();
  };

  const closeProject = () => setOpenedProjectId(null);

  const removeProject = async () => {
    if (!openedProject) return;

    try {
      const result = await deleteProject(openedProject.id);
      window.alert(result.message);
      setOpenedProjectId(null);
      await refreshProjects();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete project.",
      );
    }
  };

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark">◢</span>
            <div>
              <strong>Agile Bot</strong>
              <small>Plan. Track. Collaborate.</small>
            </div>
          </div>
          <nav className="dashboard-nav" aria-label="Main navigation">
            {menuItems.map(([icon, label, path]) => (
              <div className="dashboard-nav-item" key={label}>
                <button
                  className={
                    activeView === path.slice("/dashboard/".length) ||
                    (path === "/dashboard" && activeView === "dashboard")
                      ? "active"
                      : ""
                  }
                  type="button"
                  onClick={() => {
                    setOpenedProjectId(null);
                    onNavigate(path);
                  }}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              </div>
            ))}
          </nav>
          <label className="project-picker">
            <span>Project</span>
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              aria-label="Select a project"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="sidebar-message">
          <div className="mountain-art">⚑</div>
          <strong>
            Build Better
            <br />
            Products Together
          </strong>
          <span>
            Small Steps.
            <br />
            Big Achievements.
          </span>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>
              {timeMessage.greeting}, {profile?.userName ?? "User"}!
            </h1>
            <p>Here's an overview of your projects and team's progress.</p>
          </div>
          <div className="header-actions">
            <button
              className="notification-button"
              type="button"
              aria-label="Notifications"
            >
              ♧<b>3</b>
            </button>
            <div className="profile">
              <span>{profile ? profileInitials(profile.userName) : "U"}</span>
              <div>
                <strong>{profile?.userName ?? "User"}</strong>
                <small>{profile?.role ?? "Loading profile..."}</small>
              </div>
              <button type="button" onClick={logout} aria-label="Log out">
                ⌄
              </button>
            </div>
          </div>
        </header>
        <div className="date-note">
          <strong>{formattedDate}</strong>
          <span>{timeMessage.wish}</span>
        </div>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}
        {activeView === "projects" && !openedProject && canManageProjects && (
          <section className="project-form-panel">
            <div className="projects-page-create">
              <div>
                <strong>Create Project</strong>
                <span>Add a new project to your workspace.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateProject(!showCreateProject)}
              >
                {showCreateProject ? "Close Create Form" : "＋ Create Project"}
              </button>
            </div>
            {showCreateProject && (
              <ProjectForm mode="create" onSaved={refreshProjects} />
            )}
          </section>
        )}
        {activeView === "dashboard" && (
          <section className="stat-grid" aria-label="Project summary">
            {statItems.map(([icon, label, key, suffix]) => (
              <article className="stat-card" key={label}>
                <span className={`stat-icon ${key}`}>{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <b>{data?.totals[key] ?? "—"}</b>
                  <small>
                    <i>↗</i> +
                    {data
                      ? Math.max(1, Math.round((data.totals[key] || 1) * 0.18))
                      : "—"}{" "}
                    {suffix}
                  </small>
                </div>
              </article>
            ))}
          </section>
        )}

        {activeView === "sprints" ? (
          selectedProject === "all" ? (
            <section className="epics-page">
              <div className="empty-epics-selection">
                <h2>Select a project</h2>
                <p>Choose a project from the sidebar to view its sprints.</p>
              </div>
            </section>
          ) : (
            <SprintSection projectId={selectedProject} canManage={canManageProjects} />
          )
        ) : activeView === "epics" ? (
          selectedProject === "all" ? (
            <section className="epics-page">
              <div className="empty-epics-selection">
                <h2>Select a project</h2>
                <p>Choose a project from the sidebar to view its epics.</p>
              </div>
            </section>
          ) : (
            <EpicSection
              projectId={selectedProject}
              canManage={canManageProjects}
            />
          )
        ) : activeView === "members" ? (
          selectedProject === "all" ? (
            <section className="epics-page">
              <div className="empty-epics-selection">
                <h2>Select a project</h2>
                <p>Choose a project from the sidebar to view its members.</p>
              </div>
            </section>
          ) : (
            <ProjectMembersSection projectId={selectedProject} />
          )
        ) : openedProject ? (
          <section className="project-detail-page">
            <button
              className="back-projects-button"
              type="button"
              onClick={closeProject}
            >
              ← Back to Projects
            </button>
            <article className="project-detail-hero">
              <div className="project-detail-title">
                <span className="project-detail-avatar">
                  {projectInitials(openedProject.name)}
                </span>
                <div>
                  <h2>{openedProject.name}</h2>
                  <p>{openedProject.description}</p>
                  <div className="project-tags">
                    <span>{openedProject.goal}</span>
                    <span>
                      {openedProject.completedTasks}/{openedProject.tasks} tasks
                      complete
                    </span>
                  </div>
                </div>
              </div>
              <div className="project-detail-actions">
                <span className={`status ${statusClass(openedProject.status)}`}>
                  {openedProject.status}
                </span>
                {canManageProjects && (
                  <button
                    className="delete-project-button"
                    type="button"
                    onClick={removeProject}
                  >
                    Delete Project
                  </button>
                )}
              </div>
            </article>
            <nav className="project-detail-tabs" aria-label="Project sections">
              <button
                className="active"
                type="button"
                onClick={() => onNavigate("/dashboard/projects")}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(String(openedProject.id));
                  onNavigate("/dashboard/epics");
                }}
              >
                Epics
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(String(openedProject.id));
                  onNavigate("/dashboard/sprints");
                }}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProject(String(openedProject.id));
                  setOpenedProjectId(null);
                  setActiveView("members");
                }}
              >
                Project Members
              </button>
              <button
                type="button"
                onClick={() => onNavigate("/dashboard/settings")}
              >
                Settings
              </button>
            </nav>
            <div className="project-detail-stats">
              <article>
                <span>▰</span>
                <div>
                  <small>Total Epics</small>
                  <strong>{openedProject.epics}</strong>
                </div>
              </article>
              <article>
                <span>☑</span>
                <div>
                  <small>Total Tasks</small>
                  <strong>{openedProject.tasks}</strong>
                </div>
              </article>
              <article>
                <span className="detail-progress-ring">
                  {Math.round(openedProject.progress)}%
                </span>
                <div>
                  <small>Progress</small>
                  <strong>{openedProject.completedTasks} completed</strong>
                </div>
              </article>
            </div>
            <div className="project-detail-columns">
              <article className="detail-card">
                <div className="detail-card-heading">
                  <h3>Project Details</h3>
                  {canManageProjects && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProjectId(
                          editingProjectId === openedProject.id
                            ? null
                            : openedProject.id,
                        )
                      }
                    >
                      {editingProjectId === openedProject.id
                        ? "Cancel"
                        : "✎ Edit"}
                    </button>
                  )}
                </div>
                {editingProjectId === openedProject.id && canManageProjects ? (
                  <ProjectForm
                    mode="update"
                    project={openedProject}
                    onSaved={refreshProjects}
                  />
                ) : (
                  <dl>
                    <div>
                      <dt>Project ID</dt>
                      <dd>{openedProject.id}</dd>
                    </div>
                    <div>
                      <dt>Start Date</dt>
                      <dd>{formatProjectDate(openedProject.startDate)}</dd>
                    </div>
                    <div>
                      <dt>End Date</dt>
                      <dd>{formatProjectDate(openedProject.endDate)}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{openedProject.ownerName}</dd>
                    </div>
                    <div>
                      <dt>Created</dt>
                      <dd>{formatProjectDate(openedProject.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatProjectDate(openedProject.updatedOn)}</dd>
                    </div>
                    <div className="detail-description">
                      <dt>Goal</dt>
                      <dd>{openedProject.goal}</dd>
                    </div>
                  </dl>
                )}
              </article>
              <article className="detail-card detail-activity">
                <div className="detail-card-heading">
                  <h3>Project Progress</h3>
                  <strong>{Math.round(openedProject.progress)}%</strong>
                </div>
                <div className="detail-progress-bar">
                  <i style={{ width: `${openedProject.progress}%` }} />
                </div>
                <p>
                  {openedProject.completedTasks} of {openedProject.tasks} tasks
                  completed
                </p>
                <div className="detail-empty-state">
                  Project activity and task updates will appear here.
                </div>
              </article>
            </div>
          </section>
        ) : activeView === "projects" ? (
          <section className="projects-page">
            <div className="projects-page-heading">
              <div>
                <h2>Projects</h2>
                <p>Manage and track all your projects in one place.</p>
              </div>
              <button type="button" onClick={() => setActiveView("dashboard")}>
                ← Dashboard
              </button>
            </div>
            <div className="project-controls">
              <label className="project-search">
                <span>⌕</span>
                <input
                  value={projectSearch}
                  onChange={(event) => {
                    setProjectSearch(event.target.value);
                    setProjectStatus("");
                  }}
                  placeholder="Search projects..."
                  aria-label="Search projects by name"
                />
              </label>
              <select
                value={projectStatus}
                onChange={(event) => {
                  setProjectStatus(event.target.value);
                  setProjectSearch("");
                }}
                aria-label="Filter projects by status"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">InActive</option>
                <option value="planning">Planning</option>
              </select>
            </div>
            {projectSearchError && (
              <p className="dashboard-error" role="alert">
                {projectSearchError}
              </p>
            )}
            <div className="project-card-grid">
              {listedProjects.map((project) => (
                <button
                  className="project-card"
                  type="button"
                  key={project.id}
                  onClick={() => setOpenedProjectId(project.id)}
                >
                  <div className="project-card-top">
                    <span className="project-card-avatar">
                      {projectInitials(project.name)}
                    </span>
                    <span className={`status ${statusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="project-card-tags">
                    <span>{project.goal}</span>
                  </div>
                  <div className="project-card-progress">
                    <span>
                      <i style={{ width: `${project.progress}%` }} />
                    </span>
                    <small>{Math.round(project.progress)}%</small>
                  </div>
                  <footer>
                    <span>▰ {project.epics} Epics</span>
                    <span>☑ {project.tasks} Tasks</span>
                  </footer>
                </button>
              ))}
            </div>
            {data && !listedProjects.length && (
              <p className="empty-projects">No projects found.</p>
            )}
          </section>
        ) : (
          <section className="project-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-icon">▥</span>
                <div>
                  <h2>All Projects Progress</h2>
                  <p>Track the progress of all your projects in one place.</p>
                </div>
              </div>
              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="project-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Progress</th>
                    <th>Epics</th>
                    <th>Sprints</th>
                    <th>Tasks</th>
                    <th>Status</th>
                    <th>Updated On</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleProjects.map((project: DashboardProject) => (
                    <tr
                      className="project-row"
                      key={project.id}
                      onClick={() => setOpenedProjectId(project.id)}
                    >
                      <td>
                        <div className="project-name">
                          <span className="project-avatar">
                            {projectInitials(project.name)}
                          </span>
                          <div>
                            <strong>{project.name}</strong>
                            <small>{project.description}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="progress-cell">
                          <span>
                            <i style={{ width: `${project.progress}%` }} />
                          </span>
                          <small>{project.progress}%</small>
                        </div>
                      </td>
                      <td>{project.epics}</td>
                      <td>{project.sprints}</td>
                      <td>{project.tasks}</td>
                      <td>
                        <span
                          className={`status ${statusClass(project.status)}`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td>{project.updatedOn}</td>
                      <td>
                        <button
                          className="more-button"
                          type="button"
                          aria-label={`More options for ${project.name}`}
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data && !visibleProjects.length && (
                <p className="empty-projects">No projects found.</p>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default Dashboard