import { useEffect, useMemo, useRef, useState } from 'react'
import api from './api'
import TicketCommunication from './TicketCommunication'
import { initialArticles } from './workspaceData'

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
  dueDate: ticket.dueDate || '',
  sla: ticket.sla || 'Standard',
})

// 🎯 STRICT PROBLEM MATCHING: Aik aam word par nahi, sirf tab recommend karega jab problem match ho
function findMatchingArticle(ticket, articles = []) {
  if (!articles || !articles.length || !ticket) return null

  const subject = (ticket.subject || '').toLowerCase()
  const desc = (ticket.description || '').toLowerCase()
  const ticketFullText = `${subject} ${desc}`

  // Common aam alfaz jin par match nahi hona chahiye
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'your', 'this', 'that', 'have',
    'what', 'please', 'some', 'there', 'about', 'need', 'when', 'into',
    'which', 'their', 'then', 'them', 'they', 'will', 'just', 'more',
    'very', 'help', 'issue', 'ticket', 'problem', 'support', 'error',
    'general', 'test', 'demo', 'user', 'page', 'open', 'close'
  ])

  // Extract meaningful problem keywords (minimum 4 characters)
  const ticketKeywords = ticketFullText
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w))

  if (ticketKeywords.length === 0) return null

  let bestMatch = null
  let highestScore = 0

  for (const article of articles) {
    let score = 0
    let matchedKeywordsCount = 0

    const artTitle = (article.title || '').toLowerCase()
    const artBody = (article.body || article.content || '').toLowerCase()
    const artTags = Array.isArray(article.tags) ? article.tags.join(' ').toLowerCase() : ''

    // 1. Agar subject ka main phrase match ho
    if (subject.length > 6 && (artTitle.includes(subject) || artBody.includes(subject))) {
      score += 20
      matchedKeywordsCount += 2
    }

    // 2. Specific keywords overlap scoring
    ticketKeywords.forEach((word) => {
      let wordMatched = false
      if (artTitle.includes(word)) {
        score += 8
        wordMatched = true
      }
      if (artTags.includes(word)) {
        score += 6
        wordMatched = true
      }
      if (artBody.includes(word)) {
        score += 2
        wordMatched = true
      }
      if (wordMatched) matchedKeywordsCount += 1
    })

    // Strict condition: Kam az kam 2 specific problem keywords match hone chahiye aur score >= 10
    if (score >= 10 && matchedKeywordsCount >= 2) {
      if (score > highestScore) {
        highestScore = score
        bestMatch = article
      }
    }
  }

  // Sirf tab return karega agar problem waqai match ho, warna strictly null
  return bestMatch
}

export default function TicketDetailProfessional({ 
  ticket, 
  onClose, 
  onUpdate, 
  onDelete,
  onToggleArchive,
  customers = [],
  agents = [],
  departments = [],
  userRole = 'Administrator'
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(() => toFormValues(ticket))
  const [formError, setFormError] = useState('')

  // 🔒 Prevent reset/blink on background sync
  const prevTicketIdRef = useRef(ticket?.id)
  useEffect(() => {
    if (ticket && ticket.id !== prevTicketIdRef.current) {
      prevTicketIdRef.current = ticket.id
      setForm(toFormValues(ticket))
      setIsEditing(false)
      setFormError('')
    }
  }, [ticket?.id])

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowWidth <= 640
  const isSmallPhone = windowWidth <= 420

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const [articles, setArticles] = useState(() => {
    try {
      const stored = localStorage.getItem('relay:articles')
      return stored ? JSON.parse(stored) : (initialArticles || [])
    } catch {
      return initialArticles || []
    }
  })

  const [viewingArticle, setViewingArticle] = useState(null)

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'relay:articles' && e.newValue) {
        try {
          setArticles(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const isAdministrator = userRole === 'Administrator'
  const isSupportAgent = userRole === 'Support agent'
  const canChangeStatus = isAdministrator || isSupportAgent
  const canChangeDepartment = isAdministrator

  const customerList = customers.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
  const agentList = ['Unassigned', ...agents.map(a => typeof a === 'string' ? a : a.name).filter(Boolean)]
  const departmentList = departments.map(d => typeof d === 'string' ? d : d.name).filter(Boolean)

  const suggestedArticle = useMemo(() => {
    return findMatchingArticle(ticket, articles)
  }, [ticket, articles])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const saveEdit = async () => {
    if (!form.subject.trim()) {
      setFormError('Subject is required.')
      return
    }

    const updatedData = {
      ...ticket,
      subject: form.subject.trim(),
      customer: isAdministrator && form.customer ? form.customer.trim() : ticket.customer,
      email: isAdministrator && form.email ? form.email.trim() : ticket.email,
      description: form.description.trim(),
      module: form.module.trim(),
      category: form.category.trim() || 'General Inquiry',
      priority: form.priority,
      status: canChangeStatus ? form.status : ticket.status,
      assignee: isAdministrator ? form.assignee : ticket.assignee,
      department: canChangeDepartment ? form.department : ticket.department,
      dueDate: form.dueDate,
      sla: form.sla,
      updatedAt: new Date().toISOString()
    }

    try {
      Object.assign(ticket, updatedData)

      const storageKeys = ['relay:tickets', 'tickets', 'tickets_data']
      storageKeys.forEach(key => {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              const idx = list.findIndex(t => String(t.id) === String(ticket.id))
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...updatedData }
                localStorage.setItem(key, JSON.stringify(list))
              }
            }
          }
        } catch (err) {}
      })

      if (onUpdate) {
        onUpdate(ticket.id, updatedData, `Ticket #${ticket.id} updated`)
      }

      setIsEditing(false)
      setFormError('')
      api.updateTicket(ticket.id, updatedData).catch(() => {})
    } catch (err) {
      console.error('Save failed:', err)
      setFormError('Failed to save ticket changes.')
    }
  }

  // 🗑 DELETE TICKET ACTION
  const handleDeleteTicket = () => {
    const ok = window.confirm(`Kya aap waqai Ticket #${ticket.id} (${ticket.subject}) ko delete karna chahte hain? Yeh wapis nahi aayega.`)
    if (!ok) return

    try {
      const storageKeys = ['relay:tickets', 'tickets', 'tickets_data']
      storageKeys.forEach(key => {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              localStorage.setItem(key, JSON.stringify(list.filter(t => String(t.id) !== String(ticket.id))))
            }
          }
        } catch (err) {}
      })

      if (onDelete) {
        onDelete(ticket.id, { removeTicket: true }, `Ticket #${ticket.id} deleted.`)
      } else if (onUpdate) {
        onUpdate(ticket.id, { removeTicket: true }, `Ticket #${ticket.id} deleted.`)
      }

      api.deleteTicket(ticket.id).catch(() => {})
      onClose()
    } catch (err) {
      console.error('Delete ticket failed:', err)
      alert('Ticket delete karne me masla aaya.')
    }
  }

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out',
    },
    drawer: {
      width: isMobile ? '100vw' : '880px',
      maxWidth: '100vw',
      height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-8px 0 28px rgba(0,0,0,0.2)',
      animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden',
    },
    header: {
      padding: isSmallPhone ? '12px 14px' : isMobile ? '14px 18px' : '18px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f8fafc',
    },
    headerTitleContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: 0,
      flex: 1,
    },
    ticketIdBadge: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#475569',
      backgroundColor: '#e2e8f0',
      padding: '4px 8px',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
    },
    headerTitle: {
      fontSize: isSmallPhone ? '15px' : isMobile ? '16px' : '18px',
      fontWeight: 700,
      color: '#0f172a',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    closeButton: {
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#64748b',
      padding: '6px 10px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionsBar: {
      padding: isSmallPhone ? '8px 12px' : '10px 24px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      flexWrap: 'wrap',
    },
    statusBadge: (status) => ({
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: status === 'Resolved' ? '#dcfce7' : status === 'Pending' ? '#fef9c3' : '#e0f2fe',
      color: status === 'Resolved' ? '#166534' : status === 'Pending' ? '#854d0e' : '#0369a1',
    }),
    priorityBadge: (priority) => ({
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: priority === 'Critical' ? '#fee2e2' : priority === 'High' ? '#ffedd5' : '#f1f5f9',
      color: priority === 'Critical' ? '#991b1b' : priority === 'High' ? '#9a3412' : '#475569',
    }),
    body: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      flex: 1,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    },
    mainContent: {
      flex: 1,
      padding: isSmallPhone ? '14px 12px' : isMobile ? '16px' : '24px',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
    },
    sidePanel: {
      width: isMobile ? '100%' : '300px',
      backgroundColor: '#f8fafc',
      padding: isSmallPhone ? '14px 12px' : '18px',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      borderTop: isMobile ? '1px solid #e2e8f0' : 'none',
    },
    formGroup: {
      marginBottom: '14px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '12px',
      marginBottom: '14px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: 700,
      color: '#475569',
      marginBottom: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      fontSize: '14px',
      color: '#0f172a',
      outline: 'none',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      fontSize: '14px',
      color: '#0f172a',
      outline: 'none',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      fontSize: '14px',
      color: '#0f172a',
      minHeight: '110px',
      outline: 'none',
      resize: 'vertical',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
    btnPrimary: {
      backgroundColor: '#0284c7',
      color: '#ffffff',
      border: 'none',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    btnSecondary: {
      backgroundColor: '#ffffff',
      color: '#334155',
      border: '1px solid #cbd5e1',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    btnDanger: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    detailsCard: {
      backgroundColor: '#f8fafc',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      marginBottom: '20px',
    },
    metaGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '12px 18px',
      fontSize: '13px',
    },
    metaItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    metaLabel: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    },
    metaValue: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#1e293b',
    },
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerTitleContainer}>
            <span style={styles.ticketIdBadge}>#{ticket.id}</span>
            <h2 style={styles.headerTitle} title={ticket.subject}>
              {ticket.subject}
            </h2>
          </div>
          <button 
            style={styles.closeButton} 
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ACTION BAR: EDIT KE BILKUL SATH DELETE TICKET BUTTON */}
        <div style={styles.actionsBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={styles.statusBadge(ticket.status)}>
              ● {ticket.status}
            </span>
            <span style={styles.priorityBadge(ticket.priority)}>
              {ticket.priority} Priority
            </span>
            {ticket.sla && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                SLA: {ticket.sla}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isEditing ? (
              <>
                <button style={styles.btnSecondary} onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button style={styles.btnPrimary} onClick={saveEdit}>
                  Save Changes
                </button>
                <button 
                  type="button"
                  style={styles.btnDanger} 
                  onClick={handleDeleteTicket}
                  title="Delete ticket permanently"
                >
                  🗑 Delete Ticket
                </button>
              </>
            ) : (
              <>
                {/* 1. EDIT BUTTON */}
                <button style={styles.btnSecondary} onClick={() => setIsEditing(true)}>
                  Edit Ticket
                </button>
                
                {/* 2. DELETE BUTTON (BILKUL SATH) */}
                <button 
                  type="button"
                  style={styles.btnDanger} 
                  onClick={handleDeleteTicket}
                  title="Delete ticket permanently"
                >
                  🗑 Delete Ticket
                </button>

                {/* 3. ARCHIVE BUTTON */}
                {onToggleArchive && (
                  <button 
                    style={styles.btnSecondary} 
                    onClick={() => onToggleArchive(ticket.id)}
                  >
                    {ticket.archived ? 'Unarchive' : 'Archive'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ERROR NOTICE */}
        {formError && (
          <div style={{ padding: '8px 24px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '13px', borderBottom: '1px solid #fee2e2' }}>
            {formError}
          </div>
        )}

        {/* BODY */}
        <div style={styles.body}>
          <div style={styles.mainContent}>

            {isEditing ? (
              /* ================== EDIT FORM ================== */
              <div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Subject</label>
                  <input
                    type="text"
                    name="subject"
                    style={styles.input}
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Ticket subject..."
                  />
                </div>

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Priority</label>
                    <select
                      name="priority"
                      style={styles.select}
                      value={form.priority}
                      onChange={handleChange}
                    >
                      {PRIORITY_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* STATUS RESTRICTION: Admin & Agent only */}
                  <div>
                    <label style={styles.label}>
                      Status {!canChangeStatus && '(Locked)'}
                    </label>
                    {canChangeStatus ? (
                      <select
                        name="status"
                        style={styles.select}
                        value={form.status}
                        onChange={handleChange}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={form.status}
                        style={{ ...styles.input, backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                      />
                    )}
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      style={styles.input}
                      value={form.dueDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>SLA Tier</label>
                    <select
                      name="sla"
                      style={styles.select}
                      value={form.sla}
                      onChange={handleChange}
                    >
                      {SLA_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isAdministrator && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Customer Name (Admin)</label>
                    <input
                      type="text"
                      name="customer"
                      style={styles.input}
                      value={form.customer}
                      onChange={handleChange}
                      placeholder="Customer name..."
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Module</label>
                  <input
                    type="text"
                    name="module"
                    style={styles.input}
                    value={form.module}
                    onChange={handleChange}
                    placeholder="e.g. Authentication, Billing, Dashboard..."
                  />
                </div>

                {/* DEPARTMENT: ONLY ADMIN CAN CHANGE */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isAdministrator && !isMobile ? '1fr 1fr' : '1fr',
                  gap: '12px',
                  marginBottom: '14px',
                }}>
                  <div>
                    <label style={styles.label}>
                      Department {!canChangeDepartment && '(Admin Only)'}
                    </label>
                    {canChangeDepartment ? (
                      <select
                        name="department"
                        style={styles.select}
                        value={form.department}
                        onChange={handleChange}
                      >
                        <option value="">Select Department</option>
                        {departmentList.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={form.department || 'Core support'}
                        style={{ ...styles.input, backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                      />
                    )}
                  </div>

                  {isAdministrator && (
                    <div>
                      <label style={styles.label}>Assignee (Admin)</label>
                      <select
                        name="assignee"
                        style={styles.select}
                        value={form.assignee}
                        onChange={handleChange}
                      >
                        {agentList.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    name="description"
                    style={styles.textarea}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide full ticket details..."
                  />
                </div>
              </div>
            ) : (
              /* ================== VIEW DETAILS ================== */
              <div>
                <div style={styles.detailsCard}>
                  <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Customer</span>
                      <span style={styles.metaValue}>
                        {ticket.customer || 'Guest User'}
                        {ticket.email && ticket.email !== 'Not provided' && (
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                            {ticket.email}
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Assignee</span>
                      <span style={styles.metaValue}>
                        {ticket.assignee || 'Unassigned'}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Department</span>
                      <span style={styles.metaValue}>
                        {ticket.department || 'General'}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Module</span>
                      <span style={styles.metaValue}>
                        {ticket.module || 'Core'}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Priority</span>
                      <span style={styles.metaValue}>
                        {ticket.priority || 'Medium'}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>SLA Tier</span>
                      <span style={styles.metaValue}>
                        {ticket.sla || 'Standard'}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Created</span>
                      <span style={styles.metaValue}>
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : (ticket.createdDate || 'Just now')}
                      </span>
                    </div>

                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Due Date</span>
                      <span style={styles.metaValue}>
                        {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'None'}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={styles.metaLabel}>Description</span>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {ticket.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* COMMUNICATION TAB */}
                <div style={{ marginTop: '20px' }}>
                  <TicketCommunication ticket={ticket} userRole={userRole} />
                </div>
              </div>
            )}
          </div>

          {/* ================== RIGHT SIDE SUGGESTED ARTICLES ================== */}
          <div style={styles.sidePanel}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>
              Suggested Solution
            </h4>

            {suggestedArticle ? (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Knowledge Base Match
                </span>
                <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '6px 0 8px' }}>
                  {suggestedArticle.title}
                </h5>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {(suggestedArticle.body || suggestedArticle.content || '').slice(0, 110)}...
                </p>
                <button
                  onClick={() => setViewingArticle(suggestedArticle)}
                  style={{
                    marginTop: '10px',
                    padding: '6px 10px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View Full Article
                </button>
              </div>
            ) : (
              /* AGAR PROBLEM MATCH NA HO TO SAFI SE YE SHOW HOGA */
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <span style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>🔍</span>
                <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                  No matching knowledge base solution found for this specific issue.
                </p>
              </div>
            )}

            {viewingArticle && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }} onClick={() => setViewingArticle(null)}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  maxWidth: '550px',
                  width: '100%',
                  padding: '24px',
                  maxHeight: '80vh',
                  overflowY: 'auto'
                }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ margin: '0 0 10px', color: '#0f172a' }}>{viewingArticle.title}</h3>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {viewingArticle.body || viewingArticle.content}
                  </div>
                  <button
                    onClick={() => setViewingArticle(null)}
                    style={{
                      marginTop: '16px',
                      padding: '8px 16px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}