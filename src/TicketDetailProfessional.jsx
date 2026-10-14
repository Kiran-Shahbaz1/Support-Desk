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

    const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    const initials = form.customer.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
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

  // Styles Object
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 99999,
    },
    drawer: {
      width: '100%',
      maxWidth: '580px',
      height: '100%',
      backgroundColor: '#ffffff',
      boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      zIndex: 100000,
    },
    header: {
      padding: '16px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
    },
    badgeId: {
      fontFamily: 'monospace',
      fontWeight: 'bold',
      fontSize: '12px',
      padding: '3px 8px',
      borderRadius: '6px',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      border: '1px solid #cbd5e1',
    },
    statusPill: {
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '20px',
      backgroundColor: '#dcfce7',
      color: '#15803d',
      border: '1px solid #bbf7d0',
      textTransform: 'capitalize',
    },
    priorityPill: {
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 10px',
      borderRadius: '20px',
      backgroundColor: ticket.priority === 'Critical' || ticket.priority === 'High' ? '#fee2e2' : '#fef3c7',
      color: ticket.priority === 'Critical' || ticket.priority === 'High' ? '#b91c1c' : '#b45309',
      border: `1px solid ${ticket.priority === 'Critical' || ticket.priority === 'High' ? '#fecaca' : '#fde68a'}`,
    },
    btnSecondary: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      color: '#475569',
      cursor: 'pointer',
    },
    btnDanger: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '6px',
      border: '1px solid #fecaca',
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      cursor: 'pointer',
    },
    btnClose: {
      background: 'none',
      border: 'none',
      fontSize: '22px',
      color: '#94a3b8',
      cursor: 'pointer',
      padding: '0 4px',
      lineHeight: '1',
    },
    body: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      backgroundColor: '#ffffff',
    },
    inputLabel: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#64748b',
      marginBottom: '6px',
    },
    inputField: {
      width: '100%',
      padding: '8px 12px',
      fontSize: '13px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
      outline: 'none',
      color: '#1e293b',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '14px',
    },
    metaGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
    },
    metaCard: {
      padding: '12px 14px',
      borderRadius: '8px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
    },
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={styles.badgeId}>#{ticket.id}</span>
            <span style={styles.statusPill}>{ticket.status}</span>
            <span style={styles.priorityPill}>{ticket.priority}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onToggleArchive && (
              <button 
                type="button" 
                style={styles.btnSecondary}
                onClick={() => onToggleArchive(ticket.id)}
              >
                {ticket.archived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            <button 
              type="button" 
              style={styles.btnSecondary} 
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </button>
            <button type="button" style={styles.btnDanger} onClick={deleteTicket}>
              Delete
            </button>
            <button type="button" style={styles.btnClose} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {formError && (
            <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '13px' }}>
              {formError}
            </div>
          )}

          {isEditing ? (
            /* EDIT FORM */
            <form onSubmit={saveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={styles.inputLabel}>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  required
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.inputLabel}>Customer *</label>
                  <select name="customer" value={form.customer} onChange={updateField} required style={styles.inputField}>
                    <option value="">Select customer</option>
                    {customerList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {form.customer && !customerList.includes(form.customer) && (
                      <option value={form.customer}>{form.customer}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={styles.inputLabel}>Customer Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="customer@domain.com"
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.inputLabel}>Assignee</label>
                  <select name="assignee" value={form.assignee} onChange={updateField} style={styles.inputField}>
                    {agentList.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    {form.assignee && !agentList.includes(form.assignee) && (
                      <option value={form.assignee}>{form.assignee}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={styles.inputLabel}>Department</label>
                  <select name="department" value={form.department} onChange={updateField} style={styles.inputField}>
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

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.inputLabel}>Team</label>
                  <select name="team" value={form.team} onChange={updateField} style={styles.inputField}>
                    <option value="">Select team</option>
                    {teamList.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {form.team && !teamList.includes(form.team) && (
                      <option value={form.team}>{form.team}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={styles.inputLabel}>Priority</label>
                  <select name="priority" value={form.priority} onChange={updateField} style={styles.inputField}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.inputLabel}>Status</label>
                  <select name="status" value={form.status} onChange={updateField} style={styles.inputField}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.inputLabel}>SLA Tier</label>
                  <select name="sla" value={form.sla} onChange={updateField} style={styles.inputField}>
                    {SLA_OPTIONS.map((sla) => (
                      <option key={sla} value={sla}>{sla}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={styles.inputLabel}>Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={updateField}
                  required
                  style={{ ...styles.inputField, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  style={styles.btnSecondary} 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ ...styles.btnSecondary, backgroundColor: '#059669', color: '#ffffff', borderColor: '#059669' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* VIEW DETAILS MODE */
            <>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px 0' }}>
                  {ticket.subject}
                </h2>
                <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </div>
              </div>

              <div style={styles.metaGrid}>
                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>Customer</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.customer}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{ticket.email || 'No email'}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>Assignee</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.assignee || 'Unassigned'}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>Department</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.department || 'General'}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>Team</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.team || 'Support'}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>Module</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.module || 'Core'}</div>
                </div>

                <div style={styles.metaCard}>
                  <div style={styles.inputLabel}>SLA Tier</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{ticket.sla || 'Standard'}</div>
                </div>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>Tags:</span>
                  {ticket.tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: '600' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <TicketCommunication 
                  ticket={ticket} 
                  onAddComment={(newComment) => {
                    const updatedComments = [...(ticket.comments || []), newComment]
                    onUpdate(ticket.id, { comments: updatedComments }, 'Added comment')
                  }} 
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}