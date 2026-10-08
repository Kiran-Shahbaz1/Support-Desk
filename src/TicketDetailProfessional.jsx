import { useEffect, useState } from 'react'
import api from './api'
import TicketCommunication from './TicketCommunication'

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

export default function TicketDetailProfessional({ 
  ticket, 
  onClose, 
  onUpdate, 
  onToggleArchive,
  customers = [],
  agents = [],
  teams = [],
  departments = []
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(() => toFormValues(ticket))
  const [formError, setFormError] = useState('')

  // LIVE DROPDOWNS: Direct mapping from live state (agar delete hua toh list se remove ho jayega)
  const customerList = customers.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
  const agentList = ['Unassigned', ...agents.map(a => typeof a === 'string' ? a : a.name).filter(Boolean)]
  const departmentList = departments.map(d => typeof d === 'string' ? d : d.name).filter(Boolean)
  const teamList = teams.map(t => typeof t === 'string' ? t : t.name).filter(Boolean)

  useEffect(() => {
    if (!isEditing) {
      setForm(toFormValues(ticket))
    }
  }, [ticket?.id, isEditing])

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
    onUpdate(ticket.id, null, `Ticket #${ticket.id} deleted`)
    onClose()
  }

  return (
    <div className="ticket-detail-overlay" onClick={onClose}>
      <div className="ticket-detail-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="ticket-detail-header">
          <div className="ticket-detail-title-row">
            <span className="ticket-badge-id">#{ticket.id}</span>
            <span className={`status-pill status-${(ticket.status || 'open').toLowerCase()}`}>
              {ticket.status}
            </span>
            <span className={`priority-pill priority-${(ticket.priority || 'medium').toLowerCase()}`}>
              {ticket.priority}
            </span>
            {ticket.archived && <span className="archived-tag">Archived</span>}
          </div>
          <div className="ticket-detail-actions">
            {onToggleArchive && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onToggleArchive(ticket.id)}
              >
                {ticket.archived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={deleteTicket}>
              Delete
            </button>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="ticket-detail-body">
          {formError && <div className="form-error-banner">{formError}</div>}

          {isEditing ? (
            /* EDIT FORM WITH STRICT LIVE DROPDOWNS */
            <form onSubmit={saveEdit} className="ticket-edit-form">
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer * (Live)</label>
                  <select name="customer" value={form.customer} onChange={updateField} required>
                    <option value="">Select customer</option>
                    {customerList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {/* Fallback only if ticket already had a customer not in list */}
                    {form.customer && !customerList.includes(form.customer) && (
                      <option value={form.customer}>{form.customer}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Customer Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="customer@domain.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assignee (Live)</label>
                  <select name="assignee" value={form.assignee} onChange={updateField}>
                    {agentList.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    {form.assignee && !agentList.includes(form.assignee) && (
                      <option value={form.assignee}>{form.assignee}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department (Live)</label>
                  <select name="department" value={form.department} onChange={updateField}>
                    <option value="">Select department</option>
                    {departmentList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    {form.department && !departmentList.includes(form.department) && (
                      <option value={form.department}>{form.department}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Team (Live)</label>
                  <select name="team" value={form.team} onChange={updateField}>
                    <option value="">Select team</option>
                    {teamList.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {form.team && !teamList.includes(form.team) && (
                      <option value={form.team}>{form.team}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select name="priority" value={form.priority} onChange={updateField}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={updateField}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>SLA Tier</label>
                  <select name="sla" value={form.sla} onChange={updateField}>
                    {SLA_OPTIONS.map((sla) => (
                      <option key={sla} value={sla}>{sla}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={updateField}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Module / Area</label>
                  <input
                    type="text"
                    name="module"
                    value={form.module}
                    onChange={updateField}
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="text"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={updateField}
                    placeholder="e.g. Tomorrow, 5:00 PM"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={updateField}
                  placeholder="Billing, Urgent, UI"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* VIEW DETAILS MODE */
            <div className="ticket-view-details">
              <h2 className="ticket-view-subject">{ticket.subject}</h2>
              <p className="ticket-view-desc">{ticket.description}</p>

              <div className="ticket-metadata-grid">
                <div className="meta-card">
                  <div className="meta-label">Customer</div>
                  <div className="meta-val">{ticket.customer}</div>
                  <div className="meta-sub">{ticket.email || 'No email'}</div>
                </div>
                <div className="meta-card">
                  <div className="meta-label">Assignee</div>
                  <div className="meta-val">{ticket.assignee || 'Unassigned'}</div>
                </div>
                <div className="meta-card">
                  <div className="meta-label">Department</div>
                  <div className="meta-val">{ticket.department || 'General'}</div>
                </div>
                <div className="meta-card">
                  <div className="meta-label">Team</div>
                  <div className="meta-val">{ticket.team || 'Support'}</div>
                </div>
                <div className="meta-card">
                  <div className="meta-label">Module</div>
                  <div className="meta-val">{ticket.module || 'Core'}</div>
                </div>
                <div className="meta-card">
                  <div className="meta-label">SLA</div>
                  <div className="meta-val">{ticket.sla || 'Standard'}</div>
                </div>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div className="ticket-tags-section">
                  <span className="tags-label">Tags:</span>
                  {ticket.tags.map((t, idx) => (
                    <span key={idx} className="tag-chip">{t}</span>
                  ))}
                </div>
              )}

              {/* Communication / Comments component */}
              <TicketCommunication 
                ticket={ticket} 
                onAddComment={(newComment) => {
                  const updatedComments = [...(ticket.comments || []), newComment]
                  onUpdate(ticket.id, { comments: updatedComments }, 'Added comment')
                }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}