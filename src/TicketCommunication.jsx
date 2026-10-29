import { useEffect, useState } from 'react'

function generateSafeId() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

function mentionList(body) {
  return [...new Set(body.match(/@[a-z0-9_.-]+/gi) || [])]
}

function formatTimestamp(value) {
  if (!value) return 'Just now'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function getApiUrl(endpoint) {
  if (typeof window !== 'undefined' && window.location.port !== '4000') {
    return `http://localhost:4000${endpoint}`
  }
  return endpoint
}

export default function TicketCommunication({ ticket, onUpdate, userRole }) {
  const currentRole = userRole || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('relay:current-user') || '{}')
      return u?.role || 'Customer'
    } catch {
      return 'Customer'
    }
  })()

  const isCustomer = currentRole === 'Customer'
  const isStaff = currentRole === 'Administrator' || currentRole === 'Support agent'

  const [activeTab, setActiveTab] = useState('public')
  const [body, setBody] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editBody, setEditBody] = useState('')

  const [comments, setComments] = useState([])
  const [notes, setNotes] = useState(() => (Array.isArray(ticket?.internalNotes) ? ticket.internalNotes : []))

  // ⚡ Load Comments directly (No Re-injecting deleted items)
  useEffect(() => {
    if (!ticket?.id) return

    setNotes(Array.isArray(ticket?.internalNotes) ? ticket.internalNotes : [])

    fetch(getApiUrl(`/api/tickets/${ticket.id}/comments`))
      .then((res) => res.json())
      .then((data) => {
        if (data?.comments && Array.isArray(data.comments)) {
          setComments(data.comments)
        } else {
          setComments(Array.isArray(ticket?.comments) ? ticket.comments : [])
        }
      })
      .catch(() => {
        setComments(Array.isArray(ticket?.comments) ? ticket.comments : [])
      })
  }, [ticket?.id])

  const currentTab = isCustomer ? 'public' : activeTab
  const records = currentTab === 'public' ? comments : notes

  const syncUpdate = (nextComments, nextNotes, message) => {
    if (currentTab === 'public') {
      setComments(nextComments)
    } else {
      setNotes(nextNotes)
    }

    try {
      const relayStored = localStorage.getItem('relay:tickets')
      if (relayStored) {
        const parsed = JSON.parse(relayStored)
        const updated = parsed.map((t) =>
          Number(t.id) === Number(ticket.id)
            ? { ...t, comments: nextComments, internalNotes: nextNotes, updatedDate: new Date().toLocaleString() }
            : t
        )
        localStorage.setItem('relay:tickets', JSON.stringify(updated))
      }
    } catch (_) {}

    if (typeof onUpdate === 'function') {
      onUpdate(
        ticket.id,
        {
          comments: nextComments,
          internalNotes: nextNotes,
          updatedDate: new Date().toLocaleString()
        },
        message
      )
    }
  }

  const handleQuickStatusChange = async (newStatus) => {
    if (!isStaff) return
    const statusLabel = newStatus === 'Pending' ? 'In Progress' : newStatus
    if (!window.confirm(`Change ticket #${ticket.id} status to "${statusLabel}"?`)) return

    if (typeof onUpdate === 'function') {
      onUpdate(
        ticket.id,
        { status: newStatus, updatedDate: new Date().toLocaleString() },
        `Status updated to ${statusLabel} by ${currentRole}`
      )
    }

    if (ticket.email && ticket.email !== 'customer@example.com') {
      try {
        await fetch(getApiUrl('/api/notify-ticket'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket: { ...ticket, status: newStatus },
            ruleName: `Status changed to ${statusLabel}`,
            recipient: ticket.email
          })
        })
      } catch (_) {}
    }
  }

  const addRecord = async () => {
    const trimmed = body.trim()
    if (!trimmed) return

    const now = new Date().toISOString()
    const authorName = isCustomer 
      ? (ticket.customer || 'Customer') 
      : (currentRole === 'Administrator' ? 'Workspace administrator' : 'Support agent')

    const newRecord = {
      id: generateSafeId(),
      body: trimmed,
      author: authorName,
      createdAt: now,
      updatedAt: now,
      edited: false,
      mentions: mentionList(trimmed),
      visibility: currentTab
    }

    if (currentTab === 'public') {
      const updated = [...comments, newRecord]
      syncUpdate(updated, notes, `Public comment added to ticket #${ticket.id}`)

      fetch(getApiUrl(`/api/tickets/${ticket.id}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newRecord,
          ticket: ticket,
          agentName: authorName,
          isCustomer
        })
      }).catch(() => {})

    } else {
      const updated = [...notes, newRecord]
      syncUpdate(comments, updated, `Internal note added to ticket #${ticket.id}`)
    }

    setBody('')
  }

  const startEdit = (record, idx) => {
    setEditingIndex(idx)
    setEditBody(typeof record === 'string' ? record : record.body || '')
  }

  const saveEdit = (targetIndex) => {
    const trimmed = editBody.trim()
    if (!trimmed) return

    const authorName = isCustomer 
      ? (ticket.customer || 'Customer') 
      : (currentRole === 'Administrator' ? 'Workspace administrator' : 'Support agent')

    if (currentTab === 'public') {
      const updated = comments.map((item, idx) => {
        if (idx === targetIndex) {
          return {
            ...(typeof item === 'object' ? item : { id: generateSafeId(), author: authorName, createdAt: new Date().toISOString() }),
            body: trimmed,
            mentions: mentionList(trimmed),
            updatedAt: new Date().toISOString(),
            edited: true
          }
        }
        return item
      })
      syncUpdate(updated, notes, `Public comment edited on ticket #${ticket.id}`)
    } else {
      const updated = notes.map((item, idx) => {
        if (idx === targetIndex) {
          return {
            ...(typeof item === 'object' ? item : { id: generateSafeId(), author: authorName, createdAt: new Date().toISOString() }),
            body: trimmed,
            mentions: mentionList(trimmed),
            updatedAt: new Date().toISOString(),
            edited: true
          }
        }
        return item
      })
      syncUpdate(comments, updated, `Internal note edited on ticket #${ticket.id}`)
    }

    setEditingIndex(null)
    setEditBody('')
  }

  // 🗑️ GUARANTEED DELETE FUNCTION
  const deleteRecord = async (targetItem, targetIndex) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    const targetId = typeof targetItem === 'object' ? targetItem.id : null
    const targetBody = typeof targetItem === 'object' ? (targetItem.body || targetItem.text) : targetItem

    if (currentTab === 'public') {
      // 1. Remove from React screen immediately
      const updated = comments.filter((_, idx) => idx !== targetIndex)
      setComments(updated)

      // 2. Sync to local storage
      syncUpdate(updated, notes, `Comment deleted from ticket #${ticket.id}`)

      // 3. Send JSON command to permanently delete from backend file
      try {
        await fetch(getApiUrl(`/api/tickets/${ticket.id}/delete-comment`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index: targetIndex,
            commentId: targetId,
            text: targetBody
          })
        })
      } catch (err) {
        console.error('Delete API Error:', err)
      }
    } else {
      const updated = notes.filter((_, idx) => idx !== targetIndex)
      setNotes(updated)
      syncUpdate(comments, updated, `Note deleted from ticket #${ticket.id}`)
    }
  }

  return (
    <section className="communication-panel">
      {/* STATUS CHANGER */}
      {isStaff && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>⚡</span>
            <strong style={{ fontSize: '12px', color: '#334155' }}>Update Ticket Status:</strong>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { val: 'Open', label: 'Open' },
              { val: 'Pending', label: 'In Progress' },
              { val: 'Resolved', label: 'Resolved' }
            ].map((st) => (
              <button
                key={st.val}
                type="button"
                onClick={() => handleQuickStatusChange(st.val)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: '1px solid',
                  background: ticket.status === st.val ? '#2563eb' : '#ffffff',
                  color: ticket.status === st.val ? '#ffffff' : '#475569',
                  borderColor: ticket.status === st.val ? '#2563eb' : '#cbd5e1',
                  transition: 'all 0.2s'
                }}
              >
                ● {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="communication-tabs">
        <button
          type="button"
          className={currentTab === 'public' ? 'selected' : ''}
          onClick={() => { setActiveTab('public'); setEditingIndex(null) }}
        >
          {isCustomer ? 'Conversation' : 'Public comments'} <span>{comments.length}</span>
        </button>

        {!isCustomer && (
          <button
            type="button"
            className={currentTab === 'internal' ? 'selected internal' : ''}
            onClick={() => { setActiveTab('internal'); setEditingIndex(null) }}
          >
            Internal notes <span>{notes.length}</span>
          </button>
        )}
      </div>

      {/* VISIBILITY BANNER */}
      <div className={`visibility-banner ${currentTab}`}>
        <strong>
          {isCustomer 
            ? 'Support Conversation' 
            : currentTab === 'public' 
            ? 'Customer-visible' 
            : 'Private to support staff'}
        </strong>
        <span>
          {isCustomer
            ? 'Messages here are visible to you and your support agents.'
            : currentTab === 'public'
            ? 'This message can be seen by the customer.'
            : 'This note is never shown to the customer.'}
        </span>
      </div>

      {/* RECORD LIST */}
      <div className="communication-list">
        {records.length > 0 ? (
          records.map((item, index) => {
            const isObj = typeof item === 'object' && item !== null
            const author = isObj ? item.author || 'User' : 'User'
            const text = isObj ? (item.body || item.text) : String(item)
            const dateStr = isObj ? item.createdAt : null
            const isEdited = isObj ? item.edited : false
            const isEditing = editingIndex === index

            return (
              <article className={`communication-record ${currentTab}`} key={index}>
                <div className="communication-record-header">
                  <span className="avatar small">{author.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{author}</strong>
                    <small style={{ marginLeft: '8px', color: '#6b7280' }}>
                      {formatTimestamp(dateStr)} {isEdited && <em>(edited)</em>}
                    </small>
                  </div>
                  <div className="communication-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          className="link-button"
                          style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none' }}
                          onClick={() => startEdit(item, index)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="link-button"
                          style={{ color: '#dc2626', cursor: 'pointer', background: 'none', border: 'none' }}
                          onClick={() => deleteRecord(item, index)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ marginTop: '10px' }}>
                    <textarea
                      rows={3}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                    <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        onClick={() => saveEdit(index)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        style={{ padding: '4px 12px', background: '#94a3b8', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        onClick={() => { setEditingIndex(null); setEditBody('') }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{text}</p>
                )}
              </article>
            )
          })
        ) : (
          <div className="communication-empty">
            {isCustomer 
              ? 'No messages yet. Send a reply below if you have any questions.'
              : currentTab === 'public' 
              ? 'No public comments yet.' 
              : 'No internal notes recorded yet.'}
          </div>
        )}
      </div>

      {/* COMPOSER */}
      <div className="communication-composer" style={{ marginTop: '16px' }}>
        <textarea
          rows={3}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          placeholder={
            isCustomer
              ? 'Write a message to your support team...'
              : currentTab === 'public'
              ? 'Write a public reply to the customer...'
              : 'Add a private note visible only to support staff...'
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="cta-button primary"
            style={{ padding: '8px 18px', cursor: 'pointer', fontWeight: '600' }}
            onClick={addRecord}
          >
            {isCustomer ? 'Send Reply' : currentTab === 'public' ? 'Post Comment' : 'Save Note'}
          </button>
        </div>
      </div>
    </section>
  )
}