import { useMemo, useState } from 'react'

const CURRENT_AUTHOR = 'Workspace administrator'

function mentionList(body) {
  return [...new Set(body.match(/@[a-z0-9_.-]+/gi) || [])]
}

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString() : 'Unknown time'
}

export default function TicketCommunication({ ticket, onUpdate }) {
  const [activeTab, setActiveTab] = useState('public')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const records = activeTab === 'public' ? ticket.comments : ticket.internalNotes

  const saveRecords = (nextRecords, message) => {
    onUpdate(ticket.id, { [activeTab === 'public' ? 'comments' : 'internalNotes']: nextRecords, updatedDate: new Date().toLocaleString() }, message)
  }

  const addRecord = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    const record = { id: crypto.randomUUID(), body: trimmed, author: CURRENT_AUTHOR, createdAt: now, updatedAt: now, edited: false, mentions: mentionList(trimmed), visibility: activeTab }
    saveRecords([...records, record], `${activeTab === 'public' ? 'Public comment' : 'Internal note'} added to ticket #${ticket.id}`)
    setBody('')
  }

  const editRecord = (record) => {
    const trimmed = editBody.trim()
    if (!trimmed) return
    const nextRecords = records.map((item) => item.id === record.id ? { ...item, body: trimmed, mentions: mentionList(trimmed), updatedAt: new Date().toISOString(), edited: true } : item)
    saveRecords(nextRecords, `${activeTab === 'public' ? 'Public comment' : 'Internal note'} edited on ticket #${ticket.id}`)
    setEditingId(null)
    setEditBody('')
  }

  const canManage = (record) => record.author === CURRENT_AUTHOR || CURRENT_AUTHOR === 'Workspace administrator'
  const visibleRecords = useMemo(() => [...records].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [records])

  return <section className="communication-panel"><div className="communication-tabs"><button className={activeTab === 'public' ? 'selected' : ''} onClick={() => setActiveTab('public')}>Public comments <span>{ticket.comments.length}</span></button><button className={activeTab === 'internal' ? 'selected internal' : ''} onClick={() => setActiveTab('internal')}>Internal notes <span>{ticket.internalNotes.length}</span></button></div><div className={`visibility-banner ${activeTab}`}><strong>{activeTab === 'public' ? 'Customer-visible' : 'Private to support staff'}</strong><span>{activeTab === 'public' ? 'This message can be seen by the customer.' : 'This note is never shown to the customer.'}</span></div><div className="communication-list">{visibleRecords.length ? visibleRecords.map((record) => <article className={`communication-record ${record.visibility}`} key={record.id}><div className="communication-record-header"><span className="avatar small">{record.author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><strong>{record.author}</strong><small>{formatTimestamp(record.createdAt)} {record.edited && <em>(edited)</em>}</small></div>{canManage(record) && <div className="communication-actions"><button onClick={() => { setEditingId(record.id); setEditBody(record.body) }}>Edit</button><button onClick={() => saveRecords(records.filter((item) => item.id !== record.id), `${activeTab === 'public' ? 'Public comment' : 'Internal note'} deleted from ticket #${ticket.id}`)}>Delete</button></div>}</div>{editingId === record.id ? <div className="communication-edit"><textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} /><button className="primary-button" onClick={() => editRecord(record)}>Save edit</button></div> : <><p>{record.body}</p>{record.mentions.length > 0 && <div className="mention-list">{record.mentions.map((mention) => <span key={mention}>{mention}</span>)}</div>}</>}</article>) : <div className="dashboard-empty">No {activeTab === 'public' ? 'public comments' : 'internal notes'} yet.</div>}</div><div className="communication-composer"><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={activeTab === 'public' ? 'Write a customer-visible reply. Use @name to mention someone.' : 'Write an internal note for the support team. Use @name to mention someone.'} /><div className="communication-composer-footer"><small>{activeTab === 'public' ? 'Public reply' : 'Internal note'} · Mentions supported</small><button className="primary-button" onClick={addRecord} disabled={!body.trim()}>{activeTab === 'public' ? 'Add public comment' : 'Add internal note'}</button></div></div></section>
}
