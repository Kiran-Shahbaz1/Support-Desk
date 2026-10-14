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

// Modern Badges Helper Functions
const getStatusBadge = (status) => {
  const s = (status || 'open').toLowerCase()
  if (s === 'open') return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10'
  if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10'
  return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10'
}

const getPriorityBadge = (priority) => {
  const p = (priority || 'medium').toLowerCase()
  if (p === 'critical' || p === 'high') return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/10'
  if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

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

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-50 overflow-hidden border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              #{ticket.id}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(ticket.priority)}`}>
              {ticket.priority}
            </span>
            {ticket.archived && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                Archived
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onToggleArchive && (
              <button 
                type="button" 
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                onClick={() => onToggleArchive(ticket.id)}
              >
                {ticket.archived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            <button 
              type="button" 
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </button>
            <button 
              type="button" 
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition"
              onClick={deleteTicket}
            >
              Delete
            </button>
            <button 
              type="button" 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xl ml-1"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {formError && (
            <div className="p-3 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          {isEditing ? (
            /* EDIT FORM */
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Customer *</label>
                  <select 
                    name="customer" 
                    value={form.customer} 
                    onChange={updateField} 
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Customer Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="customer@domain.com"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Assignee</label>
                  <select 
                    name="assignee" 
                    value={form.assignee} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {agentList.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    {form.assignee && !agentList.includes(form.assignee) && (
                      <option value={form.assignee}>{form.assignee}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Department</label>
                  <select 
                    name="department" 
                    value={form.department} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Team</label>
                  <select 
                    name="team" 
                    value={form.team} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                  <select 
                    name="priority" 
                    value={form.priority} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    name="status" 
                    value={form.status} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">SLA Tier</label>
                  <select 
                    name="sla" 
                    value={form.sla} 
                    onChange={updateField}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {SLA_OPTIONS.map((sla) => (
                      <option key={sla} value={sla}>{sla}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description *</label>
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={updateField}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Module</label>
                  <input
                    type="text"
                    name="module"
                    value={form.module}
                    onChange={updateField}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="text"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={updateField}
                    placeholder="e.g. Tomorrow, 5:00 PM"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={updateField}
                  placeholder="Billing, Urgent, UI"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            /* MODERN VIEW DETAILS MODE */
            <div className="space-y-6">
              {/* Subject & Description Card */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                  {ticket.subject}
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>

              {/* Modern 2-Column Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Customer</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.customer}</div>
                  <div className="text-xs text-slate-500 truncate">{ticket.email || 'No email'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assignee</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.assignee || 'Unassigned'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Department</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.department || 'General'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Team</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.team || 'Support'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Module</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.module || 'Core'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">SLA Tier</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{ticket.sla || 'Standard'}</div>
                </div>
              </div>

              {/* Tags Section */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs font-semibold text-slate-400">Tags:</span>
                  {ticket.tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Communication / Comments Section */}
              <div className="pt-4 border-t border-slate-100">
                <TicketCommunication 
                  ticket={ticket} 
                  onAddComment={(newComment) => {
                    const updatedComments = [...(ticket.comments || []), newComment]
                    onUpdate(ticket.id, { comments: updatedComments }, 'Added comment')
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}