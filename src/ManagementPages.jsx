import { useEffect, useState } from 'react'
import api from './api'
import useLocalStorageState from './useLocalStorageState'
import { initialAgents, initialArticles, initialDepartments, initialTeams } from './workspaceData'
import { answerWorkspaceQuestion } from './workspaceAssistant'

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => {
    const safeValue = String(value ?? '').replace(/^[=+@]/, "'")
    return `"${safeValue.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function PanelHeader({ title, description, action }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>
}

function RecordEditor({ title, nameLabel, detailLabel, record, onSave, onClose }) {
  const [name, setName] = useState(record?.name || '')
  const [detail, setDetail] = useState(record?.detail || record?.role || '')
  const save = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ ...record, id: record?.id || crypto.randomUUID(), name: name.trim(), detail: detail.trim() })
  }
  return <div className="modal-backdrop" onClick={onClose}>
    <form className="modal entity-dialog" onClick={(event) => event.stopPropagation()} onSubmit={save}>
      <div className="modal-header"><div><p className="overline">Workspace directory</p><h2>{title}</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div>
      <label>{nameLabel}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter name" required /></label>
      <label>{detailLabel}<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Enter description/role" /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Save</button></div>
    </form>
  </div>
}

function EntityPage({ kind, records, setRecords, tickets, onOpenTickets, onActivity, initialEditing, onClearCreateRequest }) {
  const [editing, setEditing] = useState(null)
  const config = {
    Agents: { label: 'agent', description: 'Manage support agents, ownership, and workload.', create: 'Invite agent', detailLabel: 'Role' },
    Teams: { label: 'team', description: 'Manage support teams and their ticket queues.', create: 'Create team', detailLabel: 'Description' },
    Departments: { label: 'department', description: 'Manage routing departments and active queues.', create: 'Add department', detailLabel: 'Description' },
  }[kind]

  // 👈 Jab command box se create trigger ho to form open karein
  useEffect(() => {
    if (initialEditing) {
      setEditing({ name: initialEditing.name || '', detail: initialEditing.role || initialEditing.detail || '' })
    }
  }, [initialEditing])

  const handleClose = () => {
    setEditing(null)
    if (onClearCreateRequest) onClearCreateRequest()
  }

  const save = async (record) => {
    const exists = records.some((item) => item.id === record.id)
    setRecords(exists ? records.map((item) => item.id === record.id ? record : item) : [...records, record])
    onActivity(`${exists ? 'Updated' : 'Created'} ${config.label} ${record.name}`)
    handleClose()

    try {
      if (kind === 'Agents') {
        if (exists) await api.updateAgent(record.id, record)
        else await api.createAgent(record)
      } else if (kind === 'Teams') {
        if (exists) await api.updateTeam(record.id, record)
        else await api.createTeam(record)
      } else if (kind === 'Departments') {
        if (exists) await api.updateDepartment(record.id, record)
        else await api.createDepartment(record)
      }
    } catch (e) {
      console.warn(`[API] Failed to persist ${config.label}:`, e.message)
    }
  }

  const remove = async (record) => {
    if (!window.confirm(`Delete ${config.label} “${record.name}”?`)) return
    setRecords(records.filter((item) => item.id !== record.id))
    onActivity(`Deleted ${config.label} ${record.name}`)

    try {
      if (kind === 'Agents') await api.deleteAgent(record.id)
      else if (kind === 'Teams') await api.deleteTeam(record.id)
      else if (kind === 'Departments') await api.deleteDepartment(record.id)
    } catch (e) {
      console.warn(`[API] Failed to delete ${config.label}:`, e.message)
    }
  }

  return <>
    <section className="panel people-panel">
      <PanelHeader title={kind} description={config.description} action={<button className="primary-button" onClick={() => setEditing({})}>+ {config.create}</button>} />
      <div className="people-grid">
        {records.map((record) => {
          const assigned = tickets.filter((ticket) => kind === 'Agents' ? ticket.assignee === record.name : ticket.team === record.name || ticket.department === record.name)
          const detail = kind === 'Agents' ? `${assigned.length} assigned · ${assigned.filter((ticket) => ticket.status === 'Resolved').length} resolved` : `${assigned.length} tickets · ${assigned.filter((ticket) => ticket.status !== 'Resolved').length} active`
          const field = kind === 'Agents' ? 'assigned' : kind === 'Teams' ? 'team' : 'department'
          return <article className="person-card" key={record.id}>
            <span className="avatar large">{record.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <strong>{record.name}</strong><span>{record.detail || config.label}</span><small>{detail}</small>
            <div className="record-actions"><button onClick={() => onOpenTickets(`${field}:"${record.name}"`)}>View tickets</button><button onClick={() => setEditing(record)}>Edit</button><button className="record-delete" onClick={() => remove(record)}>Delete</button></div>
          </article>
        })}
      </div>
      {!records.length && <div className="dashboard-empty">No {kind.toLowerCase()} yet.</div>}
    </section>
    {editing && <RecordEditor title={`${editing.id ? 'Edit' : 'Create'} ${config.label}`} nameLabel={`${kind.slice(0, -1)} name`} detailLabel={config.detailLabel} record={editing} onSave={save} onClose={handleClose} />}
  </>
}

function CustomersPage({ tickets, customers, setCustomers, onOpenTickets, onActivity, initialEditing, onClearCreateRequest }) {
  const [remoteCustomers, setRemoteCustomers] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    api.getCustomers().then(setRemoteCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    if (initialEditing) {
      setEditing({ name: initialEditing.name || '', detail: initialEditing.email || '' })
    }
  }, [initialEditing])

  const handleClose = () => {
    setEditing(null)
    if (onClearCreateRequest) onClearCreateRequest()
  }

  const saveCustomer = (record) => {
    const newCust = { id: record.id || crypto.randomUUID(), name: record.name, email: record.detail }
    setCustomers([newCust, ...(customers || [])])
    if (onActivity) onActivity(`Created customer ${record.name}`)
    handleClose()
  }

  const customerMap = new Map(tickets.map((ticket) => [ticket.customer, { id: ticket.customer, name: ticket.customer, email: ticket.email, department: ticket.department, initials: ticket.initials }]))
  ;(customers || []).forEach((customer) => customerMap.set(customer.name, { ...customerMap.get(customer.name), ...customer }))
  remoteCustomers.forEach((customer) => customerMap.set(customer.name, { ...customerMap.get(customer.name), ...customer }))
  const customerRecords = [...customerMap.values()]

  return <>
    <section className="panel people-panel">
      <PanelHeader title="Customers" description="Customer accounts and their active support history." action={<button className="primary-button" onClick={() => setEditing({})}>+ Add customer</button>} />
      <div className="people-grid">{customerRecords.map((customer) => <article className="person-card" key={customer.id}>
        <span className="avatar large">{customer.initials || customer.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><strong>{customer.name}</strong><span>{customer.email || 'No email provided'}</span>
        <small>{customer.company || customer.department || 'Customer record'} · {tickets.filter((item) => item.customer === customer.name).length} tickets</small>
        <button onClick={() => onOpenTickets(`customer:"${customer.name}"`)}>Open support history <span>→</span></button>
      </article>)}</div>
      {!customerRecords.length && <div className="dashboard-empty">No customer records yet.</div>}
    </section>
    {editing && <RecordEditor title="Create customer" nameLabel="Customer name" detailLabel="Customer email" record={editing} onSave={saveCustomer} onClose={handleClose} />}
  </>
}

function KnowledgeBasePage({ onActivity }) {
  const [articles, setArticles] = useLocalStorageState('relay:articles', initialArticles)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getArticles().then((items) => {
      if (items?.length) setArticles(items)
    }).catch(() => {})
  }, [setArticles])

  const visibleArticles = articles.filter((article) => `${article.title} ${article.category} ${article.body}`.toLowerCase().includes(query.toLowerCase()))

  const save = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const isExisting = Boolean(editing?.id)
    const article = { id: editing?.id || crypto.randomUUID(), title: formData.get('title').trim(), category: formData.get('category').trim(), body: formData.get('body').trim(), reads: editing?.reads || 0 }
    setArticles(isExisting ? articles.map((item) => item.id === editing.id ? article : item) : [article, ...articles])
    onActivity(`${isExisting ? 'Updated' : 'Created'} knowledge article: ${article.title}`)
    setEditing(null)

    try {
      if (isExisting) await api.updateArticle(editing.id, article)
      else await api.createArticle(article)
    } catch (e) {
      console.warn('[API] Article save failed:', e.message)
    }
  }

  const remove = async (article) => {
    if (!window.confirm(`Delete article “${article.title}”?`)) return
    setArticles(articles.filter((item) => item.id !== article.id))
    if (selected?.id === article.id) setSelected(null)
    onActivity(`Deleted knowledge article: ${article.title}`)
    try {
      await api.deleteArticle(article.id)
    } catch (e) {
      console.warn('[API] Article delete failed:', e.message)
    }
  }

  const openArticle = (article) => {
    const next = { ...article, reads: (article.reads || 0) + 1 }
    setArticles(articles.map((item) => item.id === article.id ? next : item))
    setSelected(next)
    api.recordArticleRead(article.id).catch(() => {})
  }

  return <>
    <section className="panel ticket-list-panel">
      <div className="ticket-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search knowledge base..." /></div><button className="primary-button" onClick={() => setEditing({})}>+ New article</button></div>
      <div className="knowledge-list">{visibleArticles.map((article) => <div className="knowledge-row" key={article.id}>
        <button className="knowledge-open" onClick={() => openArticle(article)}><span className="avatar">KB</span><span><strong>{article.title}</strong><small>{article.category} · {article.reads} reads</small></span><span>→</span></button>
        <div className="record-actions"><button onClick={() => setEditing(article)}>Edit</button><button className="record-delete" onClick={() => remove(article)}>Delete</button></div>
      </div>)}{!visibleArticles.length && <div className="dashboard-empty">No knowledge articles match this search.</div>}</div>
    </section>
    {editing && <div className="modal-backdrop" onClick={() => setEditing(null)}><form className="modal entity-dialog" onClick={(event) => event.stopPropagation()} onSubmit={save}>
      <div className="modal-header"><div><p className="overline">Knowledge base</p><h2>{editing.id ? 'Edit article' : 'New article'}</h2></div><button type="button" className="close-button" onClick={() => setEditing(null)} aria-label="Close">×</button></div>
      <label>Title<input name="title" defaultValue={editing.title || ''} required /></label><label>Category<input name="category" defaultValue={editing.category || ''} required /></label><label>Article<textarea name="body" defaultValue={editing.body || ''} required /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="primary-button">Save article</button></div>
    </form></div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><article className="modal article-preview" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="overline">{selected.category}</p><h2>{selected.title}</h2></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Close">×</button></div><p>{selected.body}</p></article></div>}
  </>
}

function NotificationsPage({ activityLog }) {
  const [dismissedIds, setDismissedIds] = useLocalStorageState('relay:dismissed-notifications', [])
  const [remoteNotifications, setRemoteNotifications] = useState([])

  useEffect(() => {
    api.getNotifications().then((data) => {
      if (data?.length) setRemoteNotifications(data)
    }).catch(() => {})
  }, [])

  const combined = [...remoteNotifications, ...activityLog]
  const notifications = combined.filter((item) => !dismissedIds.includes(item.id))
  const dismissAll = () => setDismissedIds([...new Set([...dismissedIds, ...combined.map((item) => item.id)])])

  return <section className="panel activity-panel">
    <PanelHeader title="Notifications" description="Recent assignments, comments, and workspace events." action={<button className="secondary-button" onClick={dismissAll} disabled={!notifications.length}>Mark all read</button>} />
    <div className="notification-list">{notifications.slice(0, 30).map((notification) => <div className="activity" key={notification.id}>
      <span className="activity-icon blue">♧</span><span><strong>{notification.action}</strong><small>{notification.actor} · {new Date(notification.createdAt).toLocaleString()}</small></span>
      <button className="more-button" aria-label={`Dismiss ${notification.action}`} onClick={() => setDismissedIds([...dismissedIds, notification.id])}>×</button>
    </div>)}{!notifications.length && <div className="dashboard-empty">You are all caught up.</div>}</div>
  </section>
}

function AiAssistantPage({ tickets, onNotice }) {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useLocalStorageState('relay:assistant:last-response', { question: '', answer: '' })
  const ask = () => {
    const trimmed = question.trim()
    if (!trimmed) return
    setResponse({ question: trimmed, answer: answerWorkspaceQuestion(trimmed, tickets) })
    onNotice('Workspace answer generated from current ticket data.')
  }
  return <section className="panel assistant-panel"><p className="overline">Workspace intelligence</p><h2>AI Assistant</h2><p className="assistant-copy">Ask about tickets, SLA risk, customers, or team workload.</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), ask())} placeholder="Why is ticket #1042 still open?" /><button className="primary-button" onClick={ask} disabled={!question.trim()}>Ask assistant <span>→</span></button>{response.answer && <div className="assistant-answer"><strong>{response.question}</strong><p>{response.answer}</p></div>}</section>
}

function SettingsPage({ onNotice }) {
  const [settings, setSettings] = useLocalStorageState('relay:settings', { email: true, realtime: true, sla: true })

  useEffect(() => {
    api.getSettings().then((remote) => {
      if (remote) setSettings(remote)
    }).catch(() => {})
  }, [setSettings])

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try {
      await api.updateSettings(next)
    } catch (e) {
      console.warn('[API] Settings update failed:', e.message)
    }
  }

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings)
      onNotice('Settings saved directly to MySQL database.')
    } catch {
      onNotice('Settings saved locally.')
    }
  }

  return <section className="panel settings-panel">
    <PanelHeader title="Settings" description="Workspace preferences and notification controls." action={<button className="primary-button" onClick={saveSettings}>Save settings</button>} />
    <div className="settings-list">{[['email', 'Email notifications', 'Receive ticket and assignment updates.'], ['realtime', 'Realtime updates', 'Show live changes in the workspace.'], ['sla', 'SLA alerts', 'Notify the team when tickets approach their SLA.']].map(([key, title, description]) => <label className="setting-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggle(key)} /></label>)}</div>
  </section>
}

function AdminPage({ tickets, activityLog, onActivity }) {
  const unresolved = tickets.filter((ticket) => ticket.status !== 'Resolved').length
  return <section className="panel people-panel">
    <PanelHeader title="Admin" description="Workspace health, access, and audit visibility." action={<button className="primary-button" onClick={() => exportCsv('workspace-audit.csv', [['Action', 'Actor', 'Created at'], ...activityLog.map((event) => [event.action, event.actor, event.createdAt])])}>Export audit CSV</button>} />
    <div className="metrics-grid">
      <div className="metric-card"><span className="metric-label">Audit events</span><strong className="metric-value">{activityLog.length}</strong></div>
      <div className="metric-card"><span className="metric-label">Active tickets</span><strong className="metric-value">{unresolved}</strong></div>
      <div className="metric-card"><span className="metric-label">Database</span><strong className="metric-value" style={{ color: '#10b981' }}>MySQL 8.4</strong></div>
      <div className="metric-card"><span className="metric-label">Status</span><strong className="metric-value" style={{ color: '#10b981' }}>Live</strong></div>
    </div>
    <div className="drawer-section"><div className="panel-heading"><div><h2>Audit log</h2><p>Latest workspace changes.</p></div><button className="secondary-button" onClick={() => { exportCsv('workspace-tickets.csv', [['ID', 'Subject', 'Customer', 'Status', 'Priority', 'Assignee'], ...tickets.map((ticket) => [ticket.id, ticket.subject, ticket.customer, ticket.status, ticket.priority, ticket.assignee])]); onActivity('Exported workspace ticket data') }}>Export tickets</button></div>{activityLog.length ? activityLog.slice(0, 10).map((event) => <div className="history-item" key={event.id}><span>•</span>{event.action} · {event.actor} · {new Date(event.createdAt).toLocaleString()}</div>) : <p className="muted-copy">No audit events recorded yet.</p>}</div>
  </section>
}

export default function ManagementPages({ view, tickets, activityLog, onNotice, onActivity, onOpenTickets, entityCreateRequest, onClearEntityCreateRequest }) {
  const [customers, setCustomers] = useLocalStorageState('relay:customers', [])
  const [agents, setAgents] = useLocalStorageState('relay:agents', initialAgents)
  const [teams, setTeams] = useLocalStorageState('relay:teams', initialTeams)
  const [departments, setDepartments] = useLocalStorageState('relay:departments', initialDepartments)

  useEffect(() => {
    api.getAgents().then((items) => { if (items?.length) setAgents(items) }).catch(() => {})
    api.getTeams().then((items) => { if (items?.length) setTeams(items) }).catch(() => {})
    api.getDepartments().then((items) => { if (items?.length) setDepartments(items) }).catch(() => {})
  }, [setAgents, setTeams, setDepartments])

  const initialEditing = entityCreateRequest?.kind === view ? entityCreateRequest.fields : null

  const componentProps = { tickets, onOpenTickets, onActivity, initialEditing, onClearCreateRequest: onClearEntityCreateRequest }
  if (view === 'Customers') return <CustomersPage {...componentProps} customers={customers} setCustomers={setCustomers} />
  if (view === 'Agents') return <EntityPage kind={view} records={agents} setRecords={setAgents} {...componentProps} />
  if (view === 'Teams') return <EntityPage kind={view} records={teams} setRecords={setTeams} {...componentProps} />
  if (view === 'Departments') return <EntityPage kind={view} records={departments} setRecords={setDepartments} {...componentProps} />
  if (view === 'Knowledge Base') return <KnowledgeBasePage onActivity={onActivity} />
  if (view === 'Notifications') return <NotificationsPage activityLog={activityLog} />
  if (view === 'AI Assistant') return <AiAssistantPage tickets={tickets} onNotice={onNotice} />
  if (view === 'Settings') return <SettingsPage onNotice={onNotice} />
  if (view === 'Admin') return <AdminPage tickets={tickets} activityLog={activityLog} onActivity={onActivity} />
  return null
}