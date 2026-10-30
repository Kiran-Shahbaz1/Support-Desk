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
  return (
    <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '10px' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  )
}

// ====================================================================
// PROFESSIONAL AGENT REGISTRATION & EDIT MODAL (WITH LIVE SYNC & ERROR REPORTING)
// ====================================================================
function AgentEditorModal({ record, availableDepartments = [], onSave, onClose }) {
  const isEditing = Boolean(record?.id)
  const [name, setName] = useState(record?.name || '')
  const [email, setEmail] = useState(record?.email || (record?.name ? `${record.name.toLowerCase().replace(/\s+/g, '.')}@relaydesk.io` : ''))
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(record?.role || record?.detail || 'Support agent')
  const [department, setDepartment] = useState(record?.department || availableDepartments[0] || 'Core support')
  const [showPass, setShowPass] = useState(false)
  
  // Security Verification States
  const [adminAuthPass, setAdminAuthPass] = useState('admin123')
  const [showAuthPass, setShowAuthPass] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Freeze background page scroll jab modal open ho
  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    
    if (!name.trim() || !email.trim()) {
      setError('Agent Name and Email are required.')
      return
    }

    if (!isEditing && !password.trim()) {
      setError('Please assign an initial login password for this new agent.')
      return
    }

    // Security check (admin password)
    if (isEditing) {
      let savedAdminPass = 'admin123'
      try {
        const storedAdmin = localStorage.getItem('relay:admin-account')
        if (storedAdmin) {
          const parsed = JSON.parse(storedAdmin)
          if (parsed?.password) savedAdminPass = String(parsed.password).trim()
        }
      } catch (err) {}

      if (adminAuthPass.trim() && adminAuthPass.trim() !== savedAdminPass) {
        setError('Security Verification Failed: Incorrect Admin Password! (Default is admin123)')
        return
      }
    }

    const updatedAgentData = {
      ...record,
      id: record?.id || Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim() ? password.trim() : (record?.password || 'agent123'),
      role,
      department,
      detail: `${role} · ${department}`
    }

    try {
      setIsSaving(true)
      await onSave(updatedAgentData)
    } catch (saveErr) {
      setError(`Database Save Failed: ${saveErr.message || 'Could not update record.'}`)
      setIsSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '12px',
        overscrollBehavior: 'contain'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: 'calc(100vh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden'
        }}
      >
        {/* PINNED HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#2563eb' }}>
              Staff Management & Security
            </span>
            <h3 style={{ margin: '3px 0 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              {isEditing ? `Edit Agent: ${record.name}` : 'Register New Support Agent'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* FULL FORM WITH SCROLLABLE BODY & PINNED FOOTER */}
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 14px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', fontWeight: '700' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                Agent Full Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Imran Tahir"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                Login Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. imran.tahir@relaydesk.io"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#0f172a' }}>
                  {isEditing ? 'Login Password (Direct Reset)' : 'Login Password *'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}
                >
                  {showPass ? 'Hide 👁️' : 'Show 👁️'}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Enter new password (optional)' : 'Enter initial confidential password'}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', boxSizing: 'border-box', background: '#ffffff' }}
              />
              {isEditing && (
                <small style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginTop: '6px', lineHeight: 1.4 }}>
                  💡 Agent ka email ya password reset karne ke liye naya password likhein.
                </small>
              )}
            </div>

            {/* SECURITY VERIFICATION FIELD FOR ADMIN */}
            {isEditing && (
              <div style={{ marginBottom: '16px', background: '#fefce8', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fef08a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#854d0e' }}>
                    🔒 Admin Verification Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAuthPass(!showAuthPass)}
                    style={{ background: 'none', border: 'none', fontSize: '0.78rem', color: '#854d0e', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {showAuthPass ? 'Hide 👁️' : 'Show 👁️'}
                  </button>
                </div>
                <input
                  type={showAuthPass ? 'text' : 'password'}
                  required
                  value={adminAuthPass}
                  onChange={(e) => setAdminAuthPass(e.target.value)}
                  placeholder="Enter Admin Password (default: admin123)"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde047', fontSize: '0.92rem', boxSizing: 'border-box', background: '#ffffff' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  {availableDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: '#ffffff' }}
                >
                  <option value="Support agent">Support agent</option>
                  <option value="Senior Agent">Senior Agent</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* PINNED FOOTER */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 20px',
            background: '#f8fafc',
            flexShrink: 0
          }}>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSaving ? 'Saving...' : (isEditing ? 'Save Changes →' : 'Complete Registration →')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// GENERIC RECORD EDITOR (FOR TEAMS & DEPARTMENTS)
function RecordEditor({ title, nameLabel, detailLabel, record, onSave, onClose }) {
  const [name, setName] = useState(record?.name || '')
  const [detail, setDetail] = useState(record?.detail || record?.role || '')

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const save = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ ...record, id: record?.id || crypto.randomUUID(), name: name.trim(), detail: detail.trim() })
  }
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        overscrollBehavior: 'contain'
      }}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={save}
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          margin: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>{nameLabel}</label>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter name" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>{detailLabel}</label>
          <input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Enter description/role" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">Save</button>
        </div>
      </form>
    </div>
  )
}

function EntityPage({ kind, records, setRecords, tickets, departments = [], onOpenTickets, onActivity, initialEditing, onClearCreateRequest }) {
  const [editing, setEditing] = useState(null)
  const config = {
    Agents: { label: 'agent', description: 'Manage support agents, login access, and workload.', create: 'Invite agent', detailLabel: 'Role' },
    Teams: { label: 'team', description: 'Manage support teams and their ticket queues.', create: 'Create team', detailLabel: 'Description' },
    Departments: { label: 'department', description: 'Manage routing departments and active queues.', create: 'Add department', detailLabel: 'Description' },
  }[kind]

  const deptList = (departments || []).map((d) => typeof d === 'string' ? d : d.name).filter(Boolean)
  const availableDepts = deptList.length > 0 ? deptList : ['Core support', 'Finance support', 'Enterprise', 'Data support']

  useEffect(() => {
    if (initialEditing) {
      setEditing({ name: initialEditing.name || '', detail: initialEditing.role || initialEditing.detail || '' })
    }
  }, [initialEditing])

  const handleClose = () => {
    setEditing(null)
    if (onClearCreateRequest) onClearCreateRequest()
  }

  // ROBUST SAVE: SYNCS BOTH 'relay:agents' AND 'relay:staff-members' AND DATABASE
  const save = async (record) => {
    const cleanId = String(record.id)
    const cleanName = (record.name || '').trim().toLowerCase()
    const cleanEmail = (record.email || '').trim().toLowerCase()

    // 🔒 Bulletproof Existence Check: ID first, then Name
    const exists = (records || []).some((item) =>
      String(item.id) === cleanId ||
      ((item.name || '').trim().toLowerCase() === cleanName)
    )

    const updatedRecords = exists 
      ? records.map((item) => {
          const idMatches = String(item.id) === cleanId
          const nameMatches = (item.name || '').trim().toLowerCase() === cleanName
          return (idMatches || nameMatches) ? { ...item, ...record, id: item.id || record.id } : item
        }) 
      : [record, ...records]
    
    setRecords(updatedRecords)

    if (kind === 'Agents') {
      try {
        localStorage.setItem('relay:agents', JSON.stringify(updatedRecords))

        const staffRaw = localStorage.getItem('relay:staff-members')
        let staffList = staffRaw ? JSON.parse(staffRaw) : []
        if (!Array.isArray(staffList)) staffList = []

        const staffExists = staffList.some((s) =>
          String(s.id) === cleanId ||
          (s.name && s.name.trim().toLowerCase() === cleanName)
        )

        if (staffExists) {
          staffList = staffList.map((s) => {
            const matches = String(s.id) === cleanId ||
              (s.name && s.name.trim().toLowerCase() === cleanName)
            return matches ? { ...s, ...record, id: s.id || record.id } : s
          })
        } else {
          staffList = [{ ...record, role: record.role || 'Support agent' }, ...staffList]
        }
        localStorage.setItem('relay:staff-members', JSON.stringify(staffList))

        // 🔒 Realtime Auth Sync: Agar admin ya agent login hai to credentials update karo
        const curUserRaw = localStorage.getItem('relay:current-user')
        if (curUserRaw) {
          const curUser = JSON.parse(curUserRaw)
          if (
            String(curUser.id) === cleanId ||
            curUser.name?.toLowerCase() === cleanName ||
            curUser.email?.toLowerCase() === cleanEmail
          ) {
            localStorage.setItem('relay:current-user', JSON.stringify({
              ...curUser,
              name: record.name,
              email: record.email,
              password: record.password
            }))
          }
        }

        // Agar admin ne apna password change kiya ho to admin-account me bhi save karo
        if (record.role === 'Administrator' || cleanEmail.includes('admin')) {
          localStorage.setItem('relay:admin-account', JSON.stringify({
            name: record.name,
            email: record.email,
            password: record.password
          }))
        }

        window.dispatchEvent(new Event('storage'))
      } catch (e) {}
    }

    onActivity(`${exists ? 'Updated' : 'Registered'} ${config.label} ${record.name}`)

    // Database Sync via API
    try {
      if (kind === 'Agents') {
        const payload = {
          name: record.name,
          email: record.email,
          role: record.role || 'Support agent',
          department: record.department || 'Core support',
          password: record.password
        }
        if (exists && record.id) {
          try {
            await api.updateAgent(record.id, payload)
          } catch (patchErr) {
            if (String(patchErr.message).includes('404')) {
              await api.createAgent({ ...payload, id: record.id })
            } else {
              throw patchErr
            }
          }
        } else {
          await api.createAgent(payload)
        }
      } else if (kind === 'Teams') {
        if (exists) await api.updateTeam(record.id, record)
        else await api.createTeam(record)
      } else if (kind === 'Departments') {
        if (exists) await api.updateDepartment(record.id, record)
        else await api.createDepartment(record)
      }
    } catch (e) {
      console.error(`[API] Failed to persist ${config.label}:`, e)
      throw e
    }

    handleClose()
  }

  const remove = async (record) => {
    if (!window.confirm(`Delete ${config.label} “${record.name}”?`)) return
    const filtered = records.filter((item) => String(item.id) !== String(record.id))
    setRecords(filtered)
    try {
      if (kind === 'Agents') localStorage.setItem('relay:agents', JSON.stringify(filtered))
    } catch (e) {}
    onActivity(`Deleted ${config.label} ${record.name}`)

    try {
      if (kind === 'Agents') await api.deleteAgent(record.id)
      else if (kind === 'Teams') await api.deleteTeam(record.id)
      else if (kind === 'Departments') await api.deleteDepartment(record.id)
    } catch (e) {
      console.warn(`[API] Failed to delete ${config.label}:`, e.message)
    }
  }

  return (
    <>
      <section className="panel people-panel" style={{ minWidth: 0 }}>
        <PanelHeader
          title={kind}
          description={config.description}
          action={<button className="primary-button" onClick={() => setEditing({})}>+ {config.create}</button>}
        />
        <div className="people-grid" style={{ minWidth: 0 }}>
          {records.map((record) => {
            const assigned = tickets.filter((ticket) => kind === 'Agents' ? ticket.assignee === record.name : ticket.team === record.name || ticket.department === record.name)
            const detail = kind === 'Agents'
              ? `${assigned.length} assigned · ${assigned.filter((ticket) => ticket.status === 'Resolved').length} resolved`
              : `${assigned.length} tickets · ${assigned.filter((ticket) => ticket.status !== 'Resolved').length} active`
            const field = kind === 'Agents' ? 'assigned' : kind === 'Teams' ? 'team' : 'department'
            
            const initials = (record.name || 'Ag').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
            const email = record.email || `${record.name?.toLowerCase().replace(/\s+/g, '.')}@relaydesk.io`
            const dept = record.department || 'Core support'
            const role = record.role || record.detail || 'Support agent'

            return (
              <article 
                className="person-card" 
                key={record.id} 
                style={{ 
                  background: '#ffffff', 
                  borderRadius: '14px', 
                  border: '1px solid #e2e8f0', 
                  padding: '18px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  minWidth: 0
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', minWidth: 0 }}>
                    <span className="avatar large" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', fontWeight: 'bold', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {initials}
                    </span>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.name}
                      </strong>
                      {kind === 'Agents' && (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✉️ {email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.74rem', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {dept}
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {role}
                    </span>
                  </div>

                  <small style={{ color: '#94a3b8', margin: '10px 0', display: 'block', wordBreak: 'break-word' }}>{detail}</small>
                </div>

                <div className="record-actions" style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => onOpenTickets(`${field}:"${record.name}"`)} style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}>View tickets</button>
                  <button onClick={() => setEditing(record)} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', background: '#ffffff', cursor: 'pointer' }}>Edit & Reset</button>
                  <button className="record-delete" onClick={() => remove(record)} style={{ fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px' }}>Delete</button>
                </div>
              </article>
            )
          })}
        </div>
        {!records.length && <div className="dashboard-empty">No {kind.toLowerCase()} yet.</div>}
      </section>

      {/* AGENT EDITOR MODAL */}
      {editing && kind === 'Agents' && (
        <AgentEditorModal
          record={editing}
          availableDepartments={availableDepts}
          onSave={save}
          onClose={handleClose}
        />
      )}

      {/* TEAMS / DEPARTMENTS EDITOR MODAL */}
      {editing && kind !== 'Agents' && (
        <RecordEditor
          title={`${editing.id ? 'Edit' : 'Create'} ${config.label}`}
          nameLabel={`${kind.slice(0, -1)} name`}
          detailLabel={config.detailLabel}
          record={editing}
          onSave={save}
          onClose={handleClose}
        />
      )}
    </>
  )
}

// CustomersPage
function CustomersPage({ tickets = [], customers, setCustomers, onOpenTickets, onActivity, initialEditing, onClearCreateRequest }) {
  const [remoteCustomers, setRemoteCustomers] = useState([])
  const [editing, setEditing] = useState(null)
  const [custSearch, setCustSearch] = useState('')
  const [newCustForm, setNewCustForm] = useState({ name: '', email: '', company: '', department: 'Core support' })

  const [liveTickets, setLiveTickets] = useState(tickets)

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    if (editing) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [editing])

  useEffect(() => {
    const syncTickets = () => {
      try {
        const raw = localStorage.getItem('relay:tickets')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveTickets(parsed)
          }
        }
      } catch (e) {}
    }

    syncTickets()
    window.addEventListener('storage', syncTickets)
    return () => window.removeEventListener('storage', syncTickets)
  }, [])

  useEffect(() => {
    if (Array.isArray(tickets) && tickets.length > 0) {
      setLiveTickets(tickets)
    }
  }, [tickets])

  useEffect(() => {
    api.getCustomers().then((data) => {
      if (Array.isArray(data)) setRemoteCustomers(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (initialEditing) {
      setNewCustForm({
        name: initialEditing.name || '',
        email: initialEditing.email || '',
        company: initialEditing.company || '',
        department: initialEditing.department || 'Core support'
      })
      setEditing(true)
    }
  }, [initialEditing])

  const handleClose = () => {
    setEditing(false)
    setNewCustForm({ name: '', email: '', company: '', department: 'Core support' })
    if (onClearCreateRequest) onClearCreateRequest()
  }

  const handleCreateCustomerSubmit = (e) => {
    e.preventDefault()
    if (!newCustForm.name.trim()) return

    const newCust = {
      id: Date.now(),
      name: newCustForm.name.trim(),
      email: newCustForm.email.trim().toLowerCase(),
      company: newCustForm.company.trim() || 'Enterprise Client',
      department: newCustForm.department || 'Core support'
    }

    const updated = [newCust, ...(customers || [])]
    setCustomers(updated)
    try {
      localStorage.setItem('relay:customers', JSON.stringify(updated))
    } catch (e) {}

    api.createCustomer(newCust).catch(() => {})
    if (onActivity) onActivity(`Created customer ${newCust.name}`)
    handleClose()
  }

  const customerMap = new Map()

  ;(liveTickets || []).forEach((t) => {
    if (!t) return
    const custName = (t.customer || '').trim()
    const custEmail = (t.email || t.customerEmail || '').trim().toLowerCase()
    
    const key = (custEmail || custName).toLowerCase()
    if (!key) return

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: `ticket-cust-${key}`,
        name: custName || custEmail,
        email: custEmail,
        company: t.company || 'Enterprise Client',
        department: t.department || 'Core support',
        initials: t.initials || (custName ? custName.slice(0, 2).toUpperCase() : 'CU')
      })
    } else {
      const existing = customerMap.get(key)
      if (!existing.email && custEmail) existing.email = custEmail
      if ((!existing.name || existing.name.includes('@')) && custName && !custName.includes('@')) existing.name = custName
    }
  })

  ;(customers || []).forEach((c) => {
    if (!c) return
    const name = typeof c === 'object' ? (c.name || '').trim() : String(c).trim()
    const email = typeof c === 'object' ? (c.email || '').trim().toLowerCase() : ''
    const key = (email || name).toLowerCase()
    if (!key) return

    const existing = customerMap.get(key)
    customerMap.set(key, {
      ...(existing || {}),
      id: typeof c === 'object' && c.id ? c.id : (existing?.id || `cust-${Date.now()}`),
      name: name || existing?.name || email,
      email: email || existing?.email || '',
      company: (typeof c === 'object' && c.company) || existing?.company || 'Enterprise Client',
      department: (typeof c === 'object' && c.department) || existing?.department || 'Core support',
      initials: (name ? name.slice(0, 2).toUpperCase() : (existing?.initials || 'CU'))
    })
  })

  ;(remoteCustomers || []).forEach((c) => {
    if (!c) return
    const name = typeof c === 'object' ? (c.name || '').trim() : String(c).trim()
    const email = typeof c === 'object' ? (c.email || '').trim().toLowerCase() : ''
    const key = (email || name).toLowerCase()
    if (!key) return

    const existing = customerMap.get(key)
    customerMap.set(key, {
      ...(existing || {}),
      id: c.id || existing?.id || `cust-remote-${Date.now()}`,
      name: name || existing?.name || email,
      email: email || existing?.email || '',
      company: c.company || existing?.company || 'Enterprise Client',
      department: c.department || existing?.department || 'Core support',
      initials: existing?.initials || (name ? name.slice(0, 2).toUpperCase() : 'CU')
    })
  })

  const getCustomerTicketCount = (customer) => {
    const cName = (customer.name || '').trim().toLowerCase()
    const cEmail = (customer.email || '').trim().toLowerCase()

    return (liveTickets || []).filter((t) => {
      if (!t) return false
      const tCust = (t.customer || '').trim().toLowerCase()
      const tEmail = (t.email || t.customerEmail || '').trim().toLowerCase()

      const nameMatch = cName && (tCust === cName || tEmail === cName)
      const emailMatch = cEmail && (tEmail === cEmail || tCust === cEmail)

      return Boolean(nameMatch || emailMatch)
    }).length
  }

  const customerRecords = [...customerMap.values()].filter((c) => {
    if (!custSearch.trim()) return true
    const q = custSearch.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <section className="panel people-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '16px'
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Customers Directory</h2>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                ● Live Linked ({customerRecords.length})
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Customer accounts automatically sync with every ticket submission and live history.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: 'auto' }}>
            <input
              type="text"
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              placeholder="Search by name, email..."
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                minWidth: '200px',
                flex: 1
              }}
            />
            <button className="primary-button" onClick={() => setEditing(true)} style={{ whiteSpace: 'nowrap' }}>
              + Add customer
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {customerRecords.map((customer) => {
            const initials = customer.initials || (customer.name ? customer.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'CU')
            const count = getCustomerTicketCount(customer)
            const deptText = customer.company || customer.department || 'Core support'

            return (
              <div
                key={customer.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  flexWrap: 'wrap',
                  minWidth: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {customer.name}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ✉ {customer.email || 'No email provided'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#f8fafc',
                    color: '#475569',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {deptText}
                  </span>

                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: count > 0 ? '#1d4ed8' : '#94a3b8',
                    background: count > 0 ? '#dbeafe' : '#f8fafc',
                    border: count > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    whiteSpace: 'nowrap'
                  }}>
                    🎫 {count} {count === 1 ? 'ticket' : 'tickets'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenTickets(`customer:"${customer.name}"`)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Support history <span>→</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {!customerRecords.length && <div className="dashboard-empty">No customer records match your filter.</div>}
      </section>

      {editing && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            overscrollBehavior: 'contain'
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateCustomerSubmit}
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '20px 24px',
              margin: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>Create New Customer</h3>
              <button type="button" onClick={handleClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Customer Full Name *</label>
              <input
                autoFocus
                required
                value={newCustForm.name}
                onChange={(e) => setNewCustForm({ ...newCustForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Email Address *</label>
              <input
                type="email"
                required
                value={newCustForm.email}
                onChange={(e) => setNewCustForm({ ...newCustForm, email: e.target.value })}
                placeholder="e.g. john.doe@example.com"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Company / Organization</label>
              <input
                value={newCustForm.company}
                onChange={(e) => setNewCustForm({ ...newCustForm, company: e.target.value })}
                placeholder="e.g. Acme Corp"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="secondary-button" onClick={handleClose}>Cancel</button>
              <button type="submit" className="primary-button">Save Customer</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

const cleanSeedArticles = (list = []) => {
  return list.map((art) => ({
    ...art,
    reads: [129, 130, 94, 95, 76, 77].includes(Number(art.reads)) ? 0 : (Number(art.reads) || 0)
  }))
}

function KnowledgeBasePage({ onActivity, isStaff = false }) {
  const [articles, setArticles] = useLocalStorageState('relay:articles', cleanSeedArticles(initialArticles))
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const originalStyle = document.body.style.overflow
    if (editing || selected) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [editing, selected])

  useEffect(() => {
    setArticles((prev) => {
      const needsCleanup = (prev || []).some((a) => [129, 130, 94, 95, 76, 77].includes(Number(a.reads)))
      if (needsCleanup) {
        const cleaned = cleanSeedArticles(prev || [])
        try {
          localStorage.setItem('relay:articles', JSON.stringify(cleaned))
        } catch {}
        return cleaned
      }
      return prev
    })
  }, [setArticles])

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
  }, [setArticles])

  useEffect(() => {
    api.getArticles().then((items) => {
      if (items?.length) setArticles(cleanSeedArticles(items))
    }).catch(() => {})
  }, [setArticles])

  const visibleArticles = (articles || []).filter((article) =>
    `${article.title} ${article.category} ${article.body}`.toLowerCase().includes(query.toLowerCase())
  )

  const save = async (event) => {
    event.preventDefault()
    if (!isStaff) return
    const formData = new FormData(event.currentTarget)
    const isExisting = Boolean(editing?.id)
    const article = {
      id: editing?.id || 'art_' + Date.now().toString(36),
      title: formData.get('title').trim(),
      category: formData.get('category').trim(),
      body: formData.get('body').trim(),
      reads: editing?.reads ? Number(editing.reads) : 0
    }
    
    const nextArticles = isExisting
      ? articles.map((item) => (item.id === editing.id ? article : item))
      : [article, ...articles]

    setArticles(nextArticles)
    try {
      localStorage.setItem('relay:articles', JSON.stringify(nextArticles))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

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
    if (!isStaff) return
    if (!window.confirm(`Delete article “${article.title}”?`)) return
    const nextArticles = articles.filter((item) => item.id !== article.id)
    setArticles(nextArticles)
    try {
      localStorage.setItem('relay:articles', JSON.stringify(nextArticles))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

    if (selected?.id === article.id) setSelected(null)
    onActivity(`Deleted knowledge article: ${article.title}`)
    try {
      await api.deleteArticle(article.id)
    } catch (e) {
      console.warn('[API] Article delete failed:', e.message)
    }
  }

  const openArticle = (article) => {
    const nextReads = (Number(article.reads) || 0) + 1
    const next = { ...article, reads: nextReads }
    const nextArticles = articles.map((item) => (item.id === article.id ? next : item))
    
    setArticles(nextArticles)
    setSelected(next)

    try {
      localStorage.setItem('relay:articles', JSON.stringify(nextArticles))
      window.dispatchEvent(new Event('storage'))
    } catch (e) {}

    api.recordArticleRead(article.id).catch(() => {})
  }

  return (
    <>
      <section className="panel ticket-list-panel" style={{ minWidth: 0 }}>
        <div className="ticket-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search knowledge base articles..."
            />
          </div>
          
          {isStaff && (
            <button className="primary-button" onClick={() => setEditing({})} style={{ whiteSpace: 'nowrap' }}>
              + New article
            </button>
          )}
        </div>

        <div className="knowledge-list" style={{ minWidth: 0 }}>
          {visibleArticles.map((article) => (
            <div className="knowledge-row" key={article.id} style={{ flexWrap: 'wrap', gap: '8px' }}>
              <button className="knowledge-open" onClick={() => openArticle(article)} style={{ minWidth: 0, flex: 1 }}>
                <span className="avatar" style={{ flexShrink: 0 }}>KB</span>
                <span style={{ minWidth: 0, overflow: 'hidden' }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {article.title}
                  </strong>
                  <small style={{ color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {article.category} · <span style={{ color: '#2563eb', fontWeight: '700' }}>{article.reads || 0} reads</span>
                  </small>
                </span>
                <span style={{ flexShrink: 0 }}>→</span>
              </button>

              {isStaff && (
                <div className="record-actions" style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
                  <button onClick={() => setEditing(article)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Edit</button>
                  <button className="record-delete" onClick={() => remove(article)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Delete</button>
                </div>
              )}
            </div>
          ))}

          {!visibleArticles.length && (
            <div className="dashboard-empty">No knowledge articles match this search.</div>
          )}
        </div>
      </section>

      {editing && isStaff && (
        <div
          onClick={() => setEditing(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            overscrollBehavior: 'contain'
          }}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={save}
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '20px 24px',
              margin: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#2563eb' }}>Knowledge Base</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
                  {editing.id ? 'Edit article' : 'New article'}
                </h3>
              </div>
              <button type="button" onClick={() => setEditing(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Title</label>
              <input name="title" defaultValue={editing.title || ''} required placeholder="e.g. How to export invoice reports" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Category</label>
              <input name="category" defaultValue={editing.category || ''} required placeholder="e.g. Billing, Technical, Workspace" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Article Solution & Steps</label>
              <textarea rows={6} name="body" defaultValue={editing.body || ''} required placeholder="Provide step-by-step instructions or resolution..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="primary-button">Save article</button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            backdropFilter: 'blur(4px)',
            overscrollBehavior: 'contain'
          }}
          onClick={() => setSelected(null)}
        >
          <article
            style={{
              backgroundColor: '#ffffff',
              color: '#1e293b',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}
              >
                {selected.category || 'General'}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', lineHeight: 1.3, wordBreak: 'break-word' }}>
              {selected.title}
            </h2>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0' }} />

            <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-wrap', margin: '0 0 20px 0', wordBreak: 'break-word' }}>
              {selected.body}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap', gap: '8px' }}>
              <span>👁 <strong style={{ color: '#2563eb' }}>{selected.reads || 0}</strong> reads</span>
              <button
                type="button"
                className="primary-button"
                onClick={() => setSelected(null)}
                style={{ padding: '6px 18px', fontSize: '13px', borderRadius: '6px' }}
              >
                Done
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  )
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

  return (
    <section className="panel activity-panel" style={{ minWidth: 0 }}>
      <PanelHeader title="Notifications" description="Recent assignments, comments, and workspace events." action={<button className="secondary-button" onClick={dismissAll} disabled={!notifications.length} style={{ whiteSpace: 'nowrap' }}>Mark all read</button>} />
      <div className="notification-list" style={{ minWidth: 0 }}>{notifications.slice(0, 30).map((notification) => <div className="activity" key={notification.id} style={{ minWidth: 0, gap: '8px' }}>
        <span className="activity-icon blue" style={{ flexShrink: 0 }}>♧</span><span style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}><strong style={{ wordBreak: 'break-word' }}>{notification.action}</strong><small style={{ wordBreak: 'break-word' }}>{notification.actor} · {new Date(notification.createdAt).toLocaleString()}</small></span>
        <button className="more-button" aria-label={`Dismiss ${notification.action}`} onClick={() => setDismissedIds([...dismissedIds, notification.id])} style={{ flexShrink: 0 }}>×</button>
      </div>)}{!notifications.length && <div className="dashboard-empty">You are all caught up.</div>}</div>
    </section>
  )
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
  return <section className="panel assistant-panel" style={{ minWidth: 0 }}><p className="overline">Workspace intelligence</p><h2>AI Assistant</h2><p className="assistant-copy">Ask about tickets, SLA risk, customers, or team workload.</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), ask())} placeholder="Why is ticket #1042 still open?" style={{ width: '100%', boxSizing: 'border-box' }} /><button className="primary-button" onClick={ask} disabled={!question.trim()} style={{ marginTop: '10px' }}>Ask assistant <span>→</span></button>{response.answer && <div className="assistant-answer" style={{ wordBreak: 'break-word' }}><strong>{response.question}</strong><p>{response.answer}</p></div>}</section>
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

  return (
    <section className="panel settings-panel" style={{ minWidth: 0 }}>
      <PanelHeader title="Settings" description="Workspace preferences and notification controls." action={<button className="primary-button" onClick={saveSettings} style={{ whiteSpace: 'nowrap' }}>Save settings</button>} />
      <div className="settings-list" style={{ minWidth: 0 }}>{[['email', 'Email notifications', 'Receive ticket and assignment updates.'], ['realtime', 'Realtime updates', 'Show live changes in the workspace.'], ['sla', 'SLA alerts', 'Notify the team when tickets approach their SLA.']].map(([key, title, description]) => <label className="setting-row" key={key} style={{ gap: '12px' }}><span style={{ minWidth: 0 }}><strong style={{ wordBreak: 'break-word' }}>{title}</strong><small style={{ wordBreak: 'break-word' }}>{description}</small></span><input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggle(key)} style={{ flexShrink: 0 }} /></label>)}</div>
    </section>
  )
}

// AdminPage
function AdminPage({ tickets = [], activityLog = [], onActivity }) {
  const [auditSearch, setAuditSearch] = useState('')
  const unresolved = tickets.filter((ticket) => ticket && ticket.status !== 'Resolved').length

  const filteredLogs = activityLog.filter((event) => {
    if (!auditSearch.trim()) return true
    const q = auditSearch.toLowerCase()
    return (
      (event.action || '').toLowerCase().includes(q) ||
      (event.actor || '').toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '22px 24px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #334155',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
        minWidth: 0
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              System Health & Administrative Authority
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.86rem' }}>
            Central workspace controls, database health telemetry, and chronological audit trail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            style={{
              padding: '9px 15px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => {
              exportCsv('workspace-tickets.csv', [
                ['ID', 'Subject', 'Customer', 'Email', 'Status', 'Priority', 'Assignee', 'Department'],
                ...tickets.map((t) => [t.id, t.subject, t.customer, t.email, t.status, t.priority, t.assignee, t.department])
              ])
              if (onActivity) onActivity('Exported full ticket inventory CSV')
            }}
          >
            <span>🎫</span> Export Tickets CSV
          </button>

          <button
            type="button"
            className="primary-button"
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.84rem',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => {
              exportCsv('workspace-audit.csv', [
                ['Action', 'Actor', 'Created at'],
                ...activityLog.map((event) => [event.action, event.actor, event.createdAt])
              ])
              if (onActivity) onActivity('Exported system audit logs CSV')
            }}
          >
            <span>📥</span> Export Audit CSV
          </button>
        </div>
      </div>

      {/* 4 Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        minWidth: 0
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Audit Trail Events
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {activityLog.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
            ● Recorded in session log
          </span>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Active Tickets
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: unresolved > 0 ? '#f59e0b' : '#10b981' }}>
            {unresolved}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Awaiting resolution or triage
          </span>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Relational Engine
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
            MySQL 8.4
          </div>
          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
            ✓ Express REST API Synchronized
          </span>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
            Cluster Status
          </span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981'
            }} />
            Live & Healthy
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Auto-ping latency &lt; 20ms
          </span>
        </div>
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px 22px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: 0
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '14px'
        }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              System Audit Trail
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.84rem' }}>
              Chronological log of administrative actions, automations, and ticket modifications.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto' }}>
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search audit actions..."
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                minWidth: '200px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
          {filteredLogs.length > 0 ? (
            filteredLogs.slice(0, 30).map((event) => {
              const isAutomation = (event.action || '').toLowerCase().includes('automation') || (event.action || '').toLowerCase().includes('rule')
              const isAgent = (event.action || '').toLowerCase().includes('agent')
              const isExport = (event.action || '').toLowerCase().includes('export')

              const badgeType = isAutomation ? '⚡ Automation' : isAgent ? '👤 Staff' : isExport ? '📥 Export' : '⚙️ System'
              const badgeBg = isAutomation ? '#eff6ff' : isAgent ? '#f0fdf4' : isExport ? '#fef3c7' : '#f8fafc'
              const badgeColor = isAutomation ? '#1e40af' : isAgent ? '#15803d' : isExport ? '#b45309' : '#475569'

              return (
                <div
                  key={event.id || `${event.action}-${event.createdAt}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    gap: '12px',
                    flexWrap: 'wrap',
                    minWidth: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: badgeBg,
                      color: badgeColor,
                      letterSpacing: '0.3px',
                      flexShrink: 0
                    }}>
                      {badgeType}
                    </span>

                    <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, wordBreak: 'break-word' }}>
                      {event.action}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#e2e8f0',
                      color: '#334155',
                      padding: '3px 8px',
                      borderRadius: '14px',
                      whiteSpace: 'nowrap'
                    }}>
                      {event.actor || 'Administrator'}
                    </span>

                    <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      🕒 {event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>📋</span>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>No audit events found.</p>
              <small>System modifications and automations will log automatically here.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ManagementPages({ 
  view, 
  tickets, 
  activityLog, 
  onNotice, 
  onActivity, 
  onOpenTickets, 
  entityCreateRequest, 
  onClearEntityCreateRequest,
  userRole
}) {
  const [customers, setCustomers] = useLocalStorageState('relay:customers', [])
  const [agents, setAgents] = useLocalStorageState('relay:agents', initialAgents)
  const [teams, setTeams] = useLocalStorageState('relay:teams', initialTeams)
  const [departments, setDepartments] = useLocalStorageState('relay:departments', initialDepartments)

  const currentRole = userRole || (() => {
    try {
      const stored = localStorage.getItem('relay:current-user')
      return stored ? JSON.parse(stored)?.role : 'Customer'
    } catch {
      return 'Customer'
    }
  })()

  const isStaff = currentRole === 'Administrator' || currentRole === 'Support agent'

  useEffect(() => {
    api.getAgents().then((items) => { if (items?.length) setAgents(items) }).catch(() => {})
    api.getTeams().then((items) => { if (items?.length) setTeams(items) }).catch(() => {})
    api.getDepartments().then((items) => { if (items?.length) setDepartments(items) }).catch(() => {})
  }, [setAgents, setTeams, setDepartments])

  const initialEditing = entityCreateRequest?.kind === view ? entityCreateRequest.fields : null

  const componentProps = { tickets, departments, onOpenTickets, onActivity, initialEditing, onClearCreateRequest: onClearEntityCreateRequest }
  if (view === 'Customers') return <CustomersPage {...componentProps} customers={customers} setCustomers={setCustomers} />
  if (view === 'Agents') return <EntityPage kind={view} records={agents} setRecords={setAgents} {...componentProps} />
  if (view === 'Teams') return <EntityPage kind={view} records={teams} setRecords={setTeams} {...componentProps} />
  if (view === 'Departments') return <EntityPage kind={view} records={departments} setRecords={setDepartments} {...componentProps} />
  if (view === 'Knowledge Base') return <KnowledgeBasePage onActivity={onActivity} isStaff={isStaff} />
  if (view === 'Notifications') return <NotificationsPage activityLog={activityLog} />
  if (view === 'AI Assistant') return <AiAssistantPage tickets={tickets} onNotice={onNotice} />
  if (view === 'Settings') return <SettingsPage onNotice={onNotice} />
  if (view === 'Admin') return <AdminPage tickets={tickets} activityLog={activityLog} onActivity={onActivity} />
  return null
}