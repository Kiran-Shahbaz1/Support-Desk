import { useMemo, useState } from 'react'

const initialTickets = [
  { id: 1042, subject: 'Invoice export returns a blank PDF', customer: 'Maya Chen', initials: 'MC', email: 'maya.chen@acme.co', description: 'The finance team receives a blank PDF when exporting the monthly invoice report.', module: 'Billing', department: 'Finance support', channel: 'Email', priority: 'Critical', status: 'Open', assignee: 'Kiran Shah', sla: '00:42 left', created: '12 min ago', dueDate: 'Today, 9:30 PM', tag: 'SLA risk', tags: ['SLA risk', 'Invoice'], comments: [], history: ['Ticket created via email', 'Priority raised to Critical'] },
  { id: 1041, subject: 'Cannot invite a new workspace member', customer: 'Theo Martin', initials: 'TM', email: 'theo.martin@northwind.io', description: 'The invite button spins indefinitely for a new workspace member.', module: 'Workspace', department: 'Core support', channel: 'Chat', priority: 'High', status: 'Pending', assignee: 'Ahmed Khan', sla: '02:18 left', created: '38 min ago', dueDate: 'Today, 11:00 PM', tag: 'Waiting on customer', tags: ['Invite', 'Workspace'], comments: ['Requested a screen recording from the customer.'], history: ['Ticket created via chat', 'Assigned to Ahmed Khan'] },
  { id: 1040, subject: 'SSO setup questions for the finance team', customer: 'Priya Nair', initials: 'PN', email: 'priya.nair@contoso.com', description: 'Customer needs guidance for configuring SAML metadata and role mapping.', module: 'Security', department: 'Enterprise', channel: 'Email', priority: 'Medium', status: 'Open', assignee: 'Sara Davis', sla: '05:40 left', created: '1 hr ago', dueDate: 'Tomorrow, 10:00 AM', tag: 'Enterprise', tags: ['SSO', 'Enterprise'], comments: [], history: ['Ticket created via email'] },
  { id: 1039, subject: 'Dashboard data is delayed by one hour', customer: 'Jon Bell', initials: 'JB', email: 'jon.bell@globex.com', description: 'Analytics dashboard is showing data from the previous hour.', module: 'Analytics', department: 'Data support', channel: 'API', priority: 'High', status: 'Open', assignee: 'Kiran Shah', sla: '03:11 left', created: '2 hrs ago', dueDate: 'Today, 10:15 PM', tag: 'Data', tags: ['Analytics', 'Incident'], comments: [], history: ['Ticket created via API', 'Tagged as Incident'] },
  { id: 1038, subject: 'How do I change my notification digest?', customer: 'Owen Wilson', initials: 'OW', email: 'owen.wilson@example.com', description: 'Customer asked where notification digest preferences can be changed.', module: 'Account', department: 'Core support', channel: 'Web form', priority: 'Low', status: 'Resolved', assignee: 'Ahmed Khan', sla: 'Closed', created: 'Yesterday', dueDate: 'Closed', tag: 'How-to', tags: ['How-to'], comments: ['Shared the notification preferences article.'], history: ['Ticket created via web form', 'Resolved by Ahmed Khan'] },
]

const enrichTicket = (ticket) => ({
  email: 'customer@example.com', description: 'No description provided.', department: 'Core support', channel: 'Web form', dueDate: 'Not scheduled', tags: ticket.tag ? [ticket.tag] : [], comments: [], history: [], ...ticket,
})

const navItems = [
  { label: 'Overview', icon: '◒' },
  { label: 'Tickets', icon: '□' },
  { label: 'Automation', icon: '⌁' },
  { label: 'People', icon: '♙' },
  { label: 'Reports', icon: '▥' },
]

function App() {
  const [activeView, setActiveView] = useState('Overview')
  const [tickets, setTickets] = useState(() => {
    const storedTickets = localStorage.getItem('relay:tickets')
    return storedTickets ? JSON.parse(storedTickets).map(enrichTicket) : initialTickets.map(enrichTicket)
  })
  const [, setActivityLog] = useState(() => {
    const storedActivity = localStorage.getItem('relay:activity')
    return storedActivity ? JSON.parse(storedActivity) : []
  })
  const [query, setQuery] = useState('')
  const [command, setCommand] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [assigneeFilter, setAssigneeFilter] = useState('All')
  const [selectedTicketId, setSelectedTicketId] = useState(null)

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesQuery = `${ticket.subject} ${ticket.customer} ${ticket.module} ${ticket.priority} ${ticket.assignee} ${ticket.tag} ${ticket.status} ${ticket.id}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (filter === 'All' || ticket.status === filter) && (priorityFilter === 'All' || ticket.priority === priorityFilter) && (assigneeFilter === 'All' || ticket.assignee === assigneeFilter)
  }), [tickets, query, filter, priorityFilter, assigneeFilter])

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId)

  const recordActivity = (action) => {
    const entry = { id: crypto.randomUUID(), action, actor: 'Workspace administrator', createdAt: new Date().toISOString() }
    setActivityLog((current) => {
      const nextLog = [entry, ...current]
      localStorage.setItem('relay:activity', JSON.stringify(nextLog))
      return nextLog
    })
  }

  const saveTickets = (nextTickets) => {
    const enrichedTickets = nextTickets.map(enrichTicket)
    setTickets(enrichedTickets)
    localStorage.setItem('relay:tickets', JSON.stringify(enrichedTickets))
  }

  const updateTicket = (ticketId, changes, message) => {
    saveTickets(tickets.map((ticket) => ticket.id === ticketId ? { ...ticket, ...changes } : ticket))
    recordActivity(message)
    setNotice(message)
  }

  const runCommand = () => {
    const normalized = command.trim().toLowerCase()
    const priorityText = ['critical', 'high', 'medium', 'low'].find((value) => normalized.includes(value))
    const genericCustomer = normalized.match(/\bfor\s+([a-z]+(?:\s+[a-z]+)?)/i)
    const genericSubject = normalized.match(/\b(?:regarding|about|concerning|issue|problem)\s+(.+?)(?:\s+(?:and\s+)?(?:assign|owner|agent)\b|$)/i)
    const genericAssignee = normalized.match(/\b(?:assign|assigned|owner|agent)\b.*?\bto\s+([a-z]+(?:\s+[a-z]+)?)/i)
    const exactCreateMatch = normalized.match(/create (?:a )?(?:(critical|high|medium|low)[ -]?priority )?ticket for ([^ ]+(?: [^ ]+)?) regarding (.+?)(?: and assign it to| assign to) (.+)$/i)
    const createMatch = exactCreateMatch || (/\b(create|new|open|log|raise|make)\b/.test(normalized) && /\btickets?\b/.test(normalized) ? [null, priorityText, genericCustomer?.[1] || 'Unknown customer', genericSubject?.[1] || 'Customer request', genericAssignee?.[1] || 'Unassigned'] : null)
    const assignMatch = normalized.match(/(?:assign|give|send|move)\s+(?:the\s+)?ticket\s+#?(\d+).*?\bto\s+(.+)$/i)
    const resolveMatch = normalized.match(/(?:change|set|mark|update)\s+(?:the\s+)?ticket\s+#?(\d+).*?\b(?:status|state)\s+(?:to|as)\s+(resolved|open|pending)$/i)

    if (createMatch) {
      const [, priorityText, customerText, subjectText, assigneeText] = createMatch
      const nextId = Math.max(...tickets.map((ticket) => ticket.id), 0) + 1
      const customer = customerText.replace(/\s+$/, '').replace(/\b\w/g, (letter) => letter.toUpperCase())
      const assignee = assigneeText.replace(/\s+$/, '').replace(/\b\w/g, (letter) => letter.toUpperCase())
      const priority = priorityText ? priorityText.charAt(0).toUpperCase() + priorityText.slice(1).toLowerCase() : 'Medium'
      const newTicket = { id: nextId, subject: subjectText.trim(), customer, initials: customer.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), module: normalized.includes('login') ? 'Authentication' : 'General', priority, status: 'Open', assignee, sla: '04:00 left', created: 'Just now', tag: 'AI created' }
      saveTickets([newTicket, ...tickets])
      recordActivity(`Created ticket #${nextId}, set priority to ${priority}, assigned it to ${assignee}`)
      setActiveView('Tickets')
      setFilter('All')
      setQuery(String(nextId))
      setNotice(`Ticket #${nextId} created: ${priority} priority for ${customer}, assigned to ${assignee}. Activity logged.`)
    } else if (assignMatch) {
      const ticketId = Number(assignMatch[1])
      const assignee = assignMatch[2].replace(/\s+$/, '').replace(/\b\w/g, (letter) => letter.toUpperCase())
      const ticket = tickets.find((item) => item.id === ticketId)
      if (!ticket) {
        setNotice(`I could not find ticket #${ticketId}.`)
      } else {
        saveTickets(tickets.map((item) => item.id === ticketId ? { ...item, assignee } : item))
        recordActivity(`Assigned ticket #${ticketId} to ${assignee}`)
        setActiveView('Tickets')
        setQuery(String(ticketId))
        setNotice(`Ticket #${ticketId} assigned to ${assignee}. Activity logged.`)
      }
    } else if (resolveMatch) {
      const ticketId = Number(resolveMatch[1])
      const status = resolveMatch[2].charAt(0).toUpperCase() + resolveMatch[2].slice(1).toLowerCase()
      const ticket = tickets.find((item) => item.id === ticketId)
      if (!ticket) {
        setNotice(`I could not find ticket #${ticketId}.`)
      } else {
        saveTickets(tickets.map((item) => item.id === ticketId ? { ...item, status, sla: status === 'Resolved' ? 'Closed' : item.sla } : item))
        recordActivity(`Changed ticket #${ticketId} status from ${ticket.status} to ${status}`)
        setActiveView('Tickets')
        setQuery(String(ticketId))
        setNotice(`Ticket #${ticketId} status changed to ${status}. Activity logged.`)
      }
    } else if (normalized.includes('critical') && normalized.includes('ticket')) {
      setActiveView('Tickets')
      setFilter('All')
      setQuery('Critical')
      setNotice('Showing all critical-priority tickets.')
    } else if (normalized.includes('unresolved') && normalized.includes('high-priority')) {
      setActiveView('Tickets')
      setFilter('All')
      setQuery('High')
      setNotice('Showing unresolved high-priority tickets. Resolved tickets are excluded.')
    } else if (normalized.includes('summary') || normalized.includes('report')) {
      setActiveView('Tickets')
      setActiveView('Reports')
      recordActivity('Opened this month\'s ticket summary report')
      setNotice('This month\'s ticket summary is ready. Activity logged.')
    } else {
      setNotice('Try: “Create a high-priority ticket for Ali regarding login issue and assign it to Kiran.”')
    }
    setCommand('')
  }

  const createTicket = () => {
    const nextId = Math.max(...tickets.map((ticket) => ticket.id)) + 1
    saveTickets([{ id: nextId, subject: 'New customer request', customer: 'Ali Raza', initials: 'AR', module: 'General', priority: 'High', status: 'Open', assignee: 'Unassigned', sla: '04:00 left', created: 'Just now', tag: 'New' }, ...tickets])
    recordActivity(`Created ticket #${nextId} from the ticket intake form`)
    setShowCreate(false)
    setActiveView('Tickets')
    setNotice(`Ticket #${nextId} created and added to the triage queue.`)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">T</span><span>Ticket<span className="brand-dot"> Desk</span></span></div>
        <div className="workspace-switcher"><span className="workspace-avatar">T</span><span><strong>Ticket Management</strong><small>Support workspace</small></span><span className="chevron">⌄</span></div>
        <p className="eyebrow">Workspace</p>
        <nav>{navItems.map((item) => <button className={`nav-item ${activeView === item.label ? 'active' : ''}`} onClick={() => setActiveView(item.label)} key={item.label}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === 'Tickets' && <span className="nav-count">{tickets.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><span className="spark">✦</span><strong>Unlock command mode</strong><p>Automate triage and resolve tickets faster.</p><button onClick={() => setNotice('Command mode is already enabled in this demo.')}>Explore AI tools <span>→</span></button></div>
          <button className="nav-item"><span className="nav-icon">⚙</span>Settings</button>
          <div className="profile"><span className="profile-avatar">WA</span><span><strong>Workspace administrator</strong><small>Administrator</small></span><span className="more">•••</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeView}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => setNotice('You are all caught up.')}>♧<span className="notification-dot" /></button><button className="help-button">?</button><button className="new-button" onClick={() => setShowCreate(true)}><span>+</span> New ticket</button></div></header>
        <section className="content-wrap">
          <div className="heading-row"><div><p className="overline">Wednesday, September 30, 2026</p><h1>{activeView === 'Overview' ? 'Support operations overview' : activeView}</h1><p className="subheading">{activeView === 'Overview' ? 'Monitor service health, team workload, and customer requests from one workspace.' : `Manage your ${activeView.toLowerCase()} from one calm, focused workspace.`}</p></div><div className="date-pill">Last 30 days <span>⌄</span></div></div>
          {notice && <div className="notice"><span>✓</span>{notice}<button onClick={() => setNotice('')}>×</button></div>}
          {activeView === 'Overview' && <Overview tickets={tickets} onOpenTickets={() => setActiveView('Tickets')} />}
          {activeView === 'Tickets' && <TicketView tickets={filteredTickets} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter} onSelect={setSelectedTicketId} onCreate={() => setShowCreate(true)} />}
          {activeView === 'Automation' && <Automation onNotice={setNotice} />}
          {activeView === 'People' && <People />}
          {activeView === 'Reports' && <Reports />}
        </section>
      </main>
      <div className="command-bar"><div className="command-label"><span className="command-symbol">✦</span><strong>AI Command Box</strong><small>Natural language actions</small></div><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runCommand()} placeholder="Create a high-priority ticket for Ali regarding login issue and assign it to Kiran..." /><kbd>Enter</kbd><button onClick={runCommand}>Run command <span>↗</span></button></div>
      {selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicketId(null)} onUpdate={updateTicket} />}
      {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="overline">Ticket intake</p><h2>Create a new ticket</h2></div><button className="close-button" onClick={() => setShowCreate(false)}>×</button></div><label>Subject<input defaultValue="New customer request" /></label><label>Customer<input defaultValue="Ali Raza" /></label><div className="form-row"><label>Priority<select defaultValue="High"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label>Assign to<select defaultValue="Unassigned"><option>Unassigned</option><option>Kiran Shah</option><option>Ahmed Khan</option><option>Sara Davis</option></select></label></div><label>Description<textarea placeholder="Describe the issue..." /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary-button" onClick={createTicket}>Create ticket <span>→</span></button></div></div></div>}
    </div>
  )
}

function Overview({ tickets, onOpenTickets }) {
  const total = tickets.length
  const open = tickets.filter((ticket) => ticket.status === 'Open').length
  const pending = tickets.filter((ticket) => ticket.status === 'Pending').length
  const resolved = tickets.filter((ticket) => ticket.status === 'Resolved').length
  const critical = tickets.filter((ticket) => ticket.priority === 'Critical').length
  const percentage = (value) => total ? `${Math.round((value / total) * 100)}%` : '0%'
  return <>
    <div className="metrics-grid"><Metric label="Total tickets" value={String(tickets.length)} trend="Live" tone="green" detail="in workspace" /><Metric label="Open tickets" value={String(open)} trend="Live" tone="green" detail="awaiting action" /><Metric label="Pending tickets" value={String(pending)} trend="Live" tone="green" detail="waiting on response" /><Metric label="Critical tickets" value={String(critical)} trend={critical ? 'Priority' : 'Clear'} tone={critical ? 'red' : 'green'} detail={critical ? 'needs attention' : 'no critical queue'} /></div>
    <div className="dashboard-grid"><section className="panel volume-panel"><div className="panel-heading"><div><h2>Ticket volume</h2><p>New tickets across all channels</p></div><div className="legend"><span><i className="legend-dot dark" />Created</span><span><i className="legend-dot light" />Resolved</span></div></div><div className="chart-area"><div className="y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-label="Ticket volume chart"><path className="area" d="M0,160 C40,146 55,105 94,126 S130,93 160,112 S208,100 241,122 S277,70 310,98 S355,48 390,78 S435,61 470,93 S510,38 544,68 S590,51 620,73 S666,23 700,44 L700,210 L0,210Z" /><path className="line" d="M0,160 C40,146 55,105 94,126 S130,93 160,112 S208,100 241,122 S277,70 310,98 S355,48 390,78 S435,61 470,93 S510,38 544,68 S590,51 620,73 S666,23 700,44" /></svg><div className="x-axis"><span>Sep 01</span><span>Sep 08</span><span>Sep 15</span><span>Sep 22</span><span>Sep 30</span></div></div></div></section><section className="panel status-panel"><div className="panel-heading"><div><h2>Ticket status</h2><p>Current queue breakdown</p></div><button className="more-button">•••</button></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#e7884f 0 ${percentage(open)}, #81afd0 ${percentage(open)} ${percentage(open + pending)}, #71ba91 ${percentage(open + pending)} 100%)` }}><div><strong>{total}</strong><small>Total</small></div></div><div className="status-list"><StatusLine label="Open" value={String(open)} percent={percentage(open)} color="orange" /><StatusLine label="Pending" value={String(pending)} percent={percentage(pending)} color="blue" /><StatusLine label="Resolved" value={String(resolved)} percent={percentage(resolved)} color="green" /></div></div><button className="text-link" onClick={onOpenTickets}>View all tickets <span>→</span></button></section></div>
    <div className="lower-grid"><section className="panel queue-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Tickets closest to their SLA limit</p></div><button className="text-link" onClick={onOpenTickets}>View queue <span>→</span></button></div>{tickets.slice(0, 3).map((ticket) => <TicketRow ticket={ticket} key={ticket.id} />)}</section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Team activity</h2><p>Recent actions from your team</p></div><button className="more-button">•••</button></div><Activity icon="✓" title="Ticket #1038 was resolved" person="Ahmed Khan" time="8 min ago" tone="green" /><Activity icon="↗" title="Ticket #1041 was assigned" person="Kiran Shah" time="24 min ago" tone="blue" /><Activity icon="+" title="New ticket #1042 was created" person="Maya Chen" time="38 min ago" tone="orange" /></section></div>
  </>
}

function Metric({ label, value, trend, tone, detail }) { return <div className="metric-card"><div className="metric-label">{label}<span className="metric-icon">↗</span></div><div className="metric-value">{value}</div><div className={`metric-trend ${tone}`}>{tone === 'green' ? '↑' : '!' } {trend} <span>{detail}</span></div></div> }
function StatusLine({ label, value, percent, color }) { return <div className="status-line"><span><i className={`legend-dot ${color}`} />{label}</span><strong>{value}</strong><small>{percent}</small></div> }
function TicketRow({ ticket }) { return <div className="ticket-row"><span className={`priority-bar ${ticket.priority.toLowerCase()}`} /><span className="row-id">#{ticket.id}</span><span className="row-subject"><strong>{ticket.subject}</strong><small>{ticket.customer} · {ticket.module}</small></span><span className="sla-warning">{ticket.sla}</span><span className="avatar small">{ticket.initials}</span></div> }
function Activity({ icon, title, person, time, tone }) { return <div className="activity"><span className={`activity-icon ${tone}`}>{icon}</span><span><strong>{title}</strong><small>{person} · {time}</small></span></div> }

function TicketView({ tickets, query, setQuery, filter, setFilter, priorityFilter, setPriorityFilter, assigneeFilter, setAssigneeFilter, onSelect, onCreate }) { return <section className="panel ticket-list-panel"><div className="ticket-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets, customers, tags..." /></div><div className="segmented">{['All', 'Open', 'Pending', 'Resolved'].map((item) => <button className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><select className="filter-select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="All">All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><select className="filter-select" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="All">All assignees</option>{['Kiran Shah', 'Ahmed Khan', 'Sara Davis', 'Unassigned'].map((name) => <option key={name}>{name}</option>)}</select><button className="primary-button" onClick={onCreate}>+ New ticket</button></div><div className="table-header"><span>Ticket</span><span>Priority</span><span>Status</span><span>Assignee</span><span>Created</span></div>{tickets.map((ticket) => <button className="table-row table-row-button" key={ticket.id} onClick={() => onSelect(ticket.id)}><div className="ticket-cell"><span className="avatar">{ticket.initials}</span><span><strong>#{ticket.id} {ticket.subject}</strong><small>{ticket.customer} · {ticket.module} · {ticket.channel}</small></span></div><span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span><span className={`pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span><span className="assignee">{ticket.assignee}</span><span className="created">{ticket.created}<small>{ticket.sla}</small></span></button>)}{tickets.length === 0 && <div className="empty-state">No tickets match this view.</div>}</section> }

function TicketDetail({ ticket, onClose, onUpdate }) { const [comment, setComment] = useState(''); const addComment = () => { if (!comment.trim()) return; onUpdate(ticket.id, { comments: [...ticket.comments, comment.trim()], history: [...ticket.history, 'Comment added by Workspace administrator'] }, `Comment added to ticket #${ticket.id}`); setComment('') }; return <div className="drawer-backdrop" onClick={onClose}><aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><p className="overline">Ticket #{ticket.id}</p><h2>{ticket.subject}</h2></div><button className="close-button" onClick={onClose}>×</button></div><div className="drawer-badges"><span className={`pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span><span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority} priority</span><span className="channel-badge">{ticket.channel}</span></div><p className="drawer-description">{ticket.description}</p><div className="detail-grid"><div><small>Customer</small><strong>{ticket.customer}</strong><span>{ticket.email}</span></div><div><small>Assignee</small><strong>{ticket.assignee}</strong><span>{ticket.department}</span></div><div><small>SLA due</small><strong>{ticket.sla}</strong><span>{ticket.dueDate}</span></div><div><small>Module</small><strong>{ticket.module}</strong><span>{ticket.tags.join(' · ')}</span></div></div><div className="drawer-controls"><label>Status<select value={ticket.status} onChange={(event) => onUpdate(ticket.id, { status: event.target.value, sla: event.target.value === 'Resolved' ? 'Closed' : ticket.sla }, `Ticket #${ticket.id} status changed to ${event.target.value}`)}><option>Open</option><option>Pending</option><option>Resolved</option></select></label><label>Priority<select value={ticket.priority} onChange={(event) => onUpdate(ticket.id, { priority: event.target.value }, `Ticket #${ticket.id} priority changed to ${event.target.value}`)}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label></div><section className="drawer-section"><h3>Activity history</h3>{ticket.history.length ? ticket.history.map((item, index) => <div className="history-item" key={`${item}-${index}`}><span>•</span>{item}</div>) : <p className="muted-copy">No activity recorded yet.</p>}</section><section className="drawer-section"><h3>Comments</h3>{ticket.comments.map((item, index) => <div className="comment-item" key={`${item}-${index}`}>{item}<small>Workspace administrator</small></div>)}<div className="comment-box"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add an internal note or customer reply..." /><button className="primary-button" onClick={addComment}>Add comment</button></div></section></aside></div> }
function Automation({ onNotice }) { const rules = [{ name: 'Escalate critical tickets', trigger: 'Priority is Critical', action: 'Assign to Support Manager + notify', status: 'Active', runs: '18 runs' }, { name: 'SLA risk alert', trigger: 'Less than 60 minutes remaining', action: 'Notify assignee + manager', status: 'Active', runs: '42 runs' }, { name: 'Close resolved tickets', trigger: 'Status is Resolved for 7 days', action: 'Archive ticket', status: 'Paused', runs: '8 runs' }]; return <div className="automation-layout"><div className="automation-intro"><p className="overline">Operations engine</p><h2>Rules that keep work moving.</h2><p>Build trigger, condition, and action flows that handle the repetitive work before it reaches your team.</p><button className="primary-button" onClick={() => onNotice('Rule builder opened. Connect a trigger to begin.')}>+ Create automation</button></div><div className="rule-list">{rules.map((rule) => <div className="rule-card" key={rule.name}><div className="rule-top"><span className={`rule-status ${rule.status.toLowerCase()}`} /> <strong>{rule.name}</strong><button className="more-button">•••</button></div><div className="rule-flow"><span><small>WHEN</small>{rule.trigger}</span><b>→</b><span><small>THEN</small>{rule.action}</span></div><div className="rule-footer"><span className={`pill ${rule.status.toLowerCase()}`}>{rule.status}</span><small>{rule.runs} this month</small></div></div>)}</div></div> }
function People() { const people = [{ name: 'Kiran Shah', role: 'Administrator', team: 'Leadership', load: '8 tickets', initials: 'KS' }, { name: 'Ahmed Khan', role: 'Support agent', team: 'Core support', load: '12 tickets', initials: 'AK' }, { name: 'Sara Davis', role: 'Support agent', team: 'Enterprise', load: '7 tickets', initials: 'SD' }, { name: 'Maya Patel', role: 'Manager', team: 'Leadership', load: '4 tickets', initials: 'MP' }]; return <section className="panel people-panel"><div className="panel-heading"><div><h2>People & permissions</h2><p>Manage access, teams, and workload across the workspace.</p></div><button className="primary-button">+ Invite member</button></div><div className="people-grid">{people.map((person) => <div className="person-card" key={person.name}><span className="avatar large">{person.initials}</span><strong>{person.name}</strong><span>{person.role}</span><small>{person.team} · {person.load}</small><button>Manage access <span>→</span></button></div>)}</div></section> }
function Reports() { return <div className="reports-layout"><section className="panel report-feature"><p className="overline">Monthly service report</p><h2>September was your fastest month yet.</h2><p>Resolution time fell by 16% while customer satisfaction held steady at <strong>4.8/5</strong>.</p><div className="report-bars"><span style={{ height: '42%' }} /><span style={{ height: '58%' }} /><span style={{ height: '50%' }} /><span style={{ height: '72%' }} /><span style={{ height: '66%' }} /><span style={{ height: '90%' }} /><span style={{ height: '82%' }} /></div><div className="bar-labels"><span>W1</span><span>W2</span><span>W3</span><span>W4</span></div></section><div className="report-side"><Metric label="CSAT score" value="4.8/5" trend="4.1%" tone="green" detail="above target" /><Metric label="Tickets resolved" value="186" trend="16.8%" tone="green" detail="vs. previous period" /><button className="export-button">↓ Export full report <span>PDF · CSV · XLSX</span></button></div></div> }

export default App
