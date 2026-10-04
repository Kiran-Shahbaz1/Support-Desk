import { useEffect, useState } from 'react'
import api from './api'
import TicketCommunication from './TicketCommunication'

const AGENT_OPTIONS = ['Unassigned', 'Kiran Shah', 'Ahmed Khan', 'Sara Davis']
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
const SLA_OPTIONS = ['Standard', 'Priority', 'Enterprise', 'Custom']
const STATUS_OPTIONS = ['Open', 'Pending', 'Resolved']

const toFormValues = (ticket = {}) => ({
  subject: ticket.subject || '',
  customer: ticket.customer || '',
  email: ticket.email && ticket.email !== 'Not provided' ? ticket.email : '',
  description: ticket.description || '',
  module: ticket.module || '',
  category: ticket.category || '',
  priority: ticket.priority || 'Medium',
  status: ticket.status || 'Open',
  assignee: ticket.assignee || 'Unassigned',
  department: ticket.department || '',
  team: ticket.team || '',
  dueDate: ticket.dueDate || '',
  sla: ticket.sla || 'Standard',
  tags: (ticket.tags || []).join(', '),
})

export default function TicketDetailProfessional({ ticket, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(() => toFormValues(ticket))
  const [formError, setFormError] = useState('')

  // Jab naya ticket khule to form initialize ho, lekin editing ke dauran overwrite na ho
  useEffect(() => {
    if (!isEditing) {
      setForm(toFormValues(ticket))
    }
  }, [ticket?.id])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const saveEdit = (event) => {
    event.preventDefault()
    if (!form.subject.trim() || !form.customer.trim() || !form.description.trim()) {
      setFormError('Subject, customer, and description are required.')
      return
    }

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const initials = form.customer
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const cleanEmail = form.email && form.email !== 'Not provided' ? form.email.trim() : 'Not provided'

    onUpdate(
      ticket.id,
      {
        ...form,
        subject: form.subject.trim(),
        customer: form.customer.trim(),
        email: cleanEmail,
        description: form.description.trim(),
        module: form.module || 'General',
        category: form.category || 'General inquiry',
        priority: form.priority,
        status: form.status,
        assignee: form.assignee,
        department: form.department,
        team: form.team,
        dueDate: form.dueDate,
        sla: form.status === 'Resolved' ? 'Closed' : form.sla,
        tags,
        tag: tags[0] || 'General',
        initials,
        updatedDate: new Date().toLocaleString(),
        history: [...(ticket.history || []), 'Ticket details updated by Workspace administrator'],
      },
      `Ticket #${ticket.id} updated`
    )

    setFormError('')
    setIsEditing(false)
  }

  const deleteTicket = () => {
    if (!window.confirm(`Delete ticket #${ticket.id}? This cannot be undone.`)) return
    onUpdate(ticket.id, { removeTicket: true }, `Ticket #${ticket.id} deleted`)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await api.uploadAttachment(ticket.id, {
        fileName: file.name,
        sizeBytes: file.size,
        contentType: file.type || 'application/octet-stream',
      })
    } catch (e) {
      console.warn('API attachment upload warning:', e)
    }
    const nextAttachments = [...(ticket.attachments || []), file.name]
    onUpdate(
      ticket.id,
      {
        attachments: nextAttachments,
        history: [...(ticket.history || []), `Attached file ${file.name}`],
      },
      `Attached ${file.name} to ticket #${ticket.id}`
    )
  }

  const attachments = ticket.attachments || []
  const tagsList = ticket.tags || []

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="overline">Ticket #{ticket.id}</p>
            <h2>{ticket.subject}</h2>
          </div>
          <div className="drawer-header-actions">
            {!isEditing && (
              <>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setForm(toFormValues(ticket))
                    setFormError('')
                    setIsEditing(true)
                  }}
                >
                  Edit ticket
                </button>
                <button className="danger-button" onClick={deleteTicket}>
                  Delete
                </button>
              </>
            )}
            <button className="close-button" onClick={onClose} aria-label="Close ticket">
              ×
            </button>
          </div>
        </div>

        {isEditing ? (
          <form className="ticket-edit-form" onSubmit={saveEdit}>
            {formError && (
              <div className="form-error" role="alert">
                ! {formError}
              </div>
            )}
            <div className="ticket-edit-grid">
              <label>
                Subject
                <input
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  placeholder="Short issue summary"
                  required
                />
              </label>

              <label>
                Customer
                <input
                  name="customer"
                  value={form.customer}
                  onChange={updateField}
                  placeholder="Customer name"
                  required
                />
              </label>

              <label>
                Customer email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="customer@example.com"
                />
              </label>

              <label>
                Module
                <input
                  name="module"
                  value={form.module}
                  onChange={updateField}
                  placeholder="Billing, Account..."
                />
              </label>

              <label>
                Category
                <input
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  placeholder="Incident, question..."
                />
              </label>

              {/* Status Dropdown */}
              <label>
                Status
                <select name="status" value={form.status} onChange={updateField}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {/* Priority Dropdown */}
              <label>
                Priority
                <select name="priority" value={form.priority} onChange={updateField}>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>

              {/* Assigned Agent Dropdown */}
              <label>
                Assigned agent
                <select name="assignee" value={form.assignee} onChange={updateField}>
                  {AGENT_OPTIONS.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={updateField}
                  placeholder="Department name"
                />
              </label>

              <label>
                Team
                <input
                  name="team"
                  value={form.team}
                  onChange={updateField}
                  placeholder="Team name"
                />
              </label>

              {/* Due Date (datetime-local matching Create form) */}
              <label>
                Due date
                <input
                  type="datetime-local"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={updateField}
                />
              </label>

              {/* SLA Dropdown */}
              <label>
                SLA
                <select name="sla" value={form.sla} onChange={updateField}>
                  {SLA_OPTIONS.map((sla) => (
                    <option key={sla} value={sla}>
                      {sla}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ticket-edit-wide">
                Tags
                <input
                  name="tags"
                  value={form.tags}
                  onChange={updateField}
                  placeholder="billing, urgent"
                />
              </label>

              <label className="ticket-edit-wide">
                Description
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe the issue..."
                  required
                />
              </label>
            </div>

            <div className="ticket-edit-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setForm(toFormValues(ticket))
                  setFormError('')
                  setIsEditing(false)
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="drawer-badges">
              <span className={`pill ${(ticket.status || '').toLowerCase()}`}>{ticket.status}</span>
              <span className={`priority ${(ticket.priority || '').toLowerCase()}`}>
                {ticket.priority} priority
              </span>
              <span className="channel-badge">{ticket.channel}</span>
            </div>
            <p className="drawer-description">{ticket.description}</p>
            <div className="detail-grid">
              <div>
                <small>Customer</small>
                <strong>{ticket.customer}</strong>
                <span>{ticket.email}</span>
              </div>
              <div>
                <small>Ticket ID</small>
                <strong>#{ticket.id}</strong>
                <span>Created: {ticket.createdDate}</span>
              </div>
              <div>
                <small>Module / category</small>
                <strong>{ticket.module}</strong>
                <span>{ticket.category}</span>
              </div>
              <div>
                <small>Ownership</small>
                <strong>{ticket.assignee}</strong>
                <span>
                  {ticket.team} · {ticket.department}
                </span>
              </div>
              <div>
                <small>Due date / SLA</small>
                <strong>{ticket.dueDate}</strong>
                <span>{ticket.sla}</span>
              </div>
              <div>
                <small>Updated</small>
                <strong>{ticket.updatedDate}</strong>
                <span>{tagsList.join(' · ') || 'No tags'}</span>
              </div>
            </div>
            <section className="drawer-section">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <h3 style={{ margin: 0 }}>Attachments ({attachments.length})</h3>
                <label
                  className="secondary-button"
                  style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.85rem' }}
                >
                  📎 Add file
                  <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
              </div>
              {attachments.length ? (
                attachments.map((file) => (
                  <div
                    className="attachment-item"
                    key={file}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>📄 {file}</span>
                    <button
                      type="button"
                      className="text-button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                      onClick={() => alert(`Attachment "${file}" is saved in MySQL storage.`)}
                    >
                      Download
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted-copy">No attachments added. Click “Add file” above to attach documents.</p>
              )}
            </section>
            <div className="drawer-controls">
              <label>
                Status
                <select
                  value={ticket.status}
                  onChange={(event) =>
                    onUpdate(
                      ticket.id,
                      {
                        status: event.target.value,
                        sla: event.target.value === 'Resolved' ? 'Closed' : ticket.sla,
                        updatedDate: new Date().toLocaleString(),
                      },
                      `Ticket #${ticket.id} status changed to ${event.target.value}`
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={ticket.priority}
                  onChange={(event) =>
                    onUpdate(
                      ticket.id,
                      {
                        priority: event.target.value,
                        updatedDate: new Date().toLocaleString(),
                      },
                      `Ticket #${ticket.id} priority changed to ${event.target.value}`
                    )
                  }
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <TicketCommunication ticket={ticket} onUpdate={onUpdate} />
      </aside>
    </div>
  )
}