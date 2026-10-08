import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './Dashboard'
import ManagementPages from './ManagementPages'
import { answerWorkspaceQuestion } from './workspaceAssistant'
import { AutomationPage, ReportsPage } from './OperationalPages'
import { initialAutomationRules, normalizeAutomationRule, runAutomationRules } from './automationEngine'
import { initialAgents, initialDepartments, initialTeams } from './workspaceData'
import TicketDetailProfessional from './TicketDetailProfessional'
import useLocalStorageState from './useLocalStorageState'
import api from './api'
import { commandHelp, parseWorkspaceCommand } from './workspaceCommand'
import { applyWorkspaceCommand } from './workspaceCommandActions'

const initialTickets = [
  { id: 1042, subject: 'Invoice export returns a blank PDF', customer: 'Maya Chen', initials: 'MC', email: 'maya.chen@acme.co', description: 'The finance team receives a blank PDF when exporting the monthly invoice report.', module: 'Billing', department: 'Finance support', team: 'Finance support', channel: 'Email', priority: 'Critical', status: 'Open', assignee: 'Kiran Shah', sla: '00:42 left', created: '12 min ago', dueDate: 'Today, 9:30 PM', tag: 'SLA risk', tags: ['SLA risk', 'Invoice'], comments: [], history: ['Ticket created via email', 'Priority raised to Critical'], archived: false },
  { id: 1041, subject: 'Cannot invite a new workspace member', customer: 'Theo Martin', initials: 'TM', email: 'theo.martin@northwind.io', description: 'The invite button spins indefinitely for a new workspace member.', module: 'Workspace', department: 'Core support', team: 'Core support', channel: 'Chat', priority: 'High', status: 'Pending', assignee: 'Ahmed Khan', sla: '02:18 left', created: '38 min ago', dueDate: 'Today, 11:00 PM', tag: 'Waiting on customer', tags: ['Invite', 'Workspace'], comments: ['Requested a screen recording from the customer.'], history: ['Ticket created via chat', 'Assigned to Ahmed Khan'], archived: false },
  { id: 1040, subject: 'SSO setup questions for the finance team', customer: 'Priya Nair', initials: 'PN', email: 'priya.nair@contoso.com', description: 'Customer needs guidance for configuring SAML metadata and role mapping.', module: 'Security', department: 'Enterprise', team: 'Enterprise', channel: 'Email', priority: 'Medium', status: 'Open', assignee: 'Sara Davis', sla: '05:40 left', created: '1 hr ago', dueDate: 'Tomorrow, 10:00 AM', tag: 'Enterprise', tags: ['SSO', 'Enterprise'], comments: [], history: ['Ticket created via email'], archived: false },
  { id: 1039, subject: 'Dashboard data is delayed by one hour', customer: 'Jon Bell', initials: 'JB', email: 'jon.bell@globex.com', description: 'Analytics dashboard is showing data from the previous hour.', module: 'Analytics', department: 'Data support', team: 'Data support', channel: 'API', priority: 'High', status: 'Open', assignee: 'Kiran Shah', sla: '03:11 left', created: '2 hrs ago', dueDate: 'Today, 10:15 PM', tag: 'Data', tags: ['Analytics', 'Incident'], comments: [], history: ['Ticket created via API', 'Tagged as Incident'], archived: false },
  { id: 1038, subject: 'How do I change my notification digest?', customer: 'Owen Wilson', initials: 'OW', email: 'owen.wilson@example.com', description: 'Customer asked how to switch daily summaries to weekly digests.', module: 'Settings', department: 'Core support', team: 'Core support', channel: 'Portal', priority: 'Low', status: 'Resolved', assignee: 'Ahmed Khan', sla: 'Closed', created: '3 hrs ago', dueDate: 'Yesterday', tag: 'Resolved', tags: ['How-to', 'Settings'], comments: [], history: ['Ticket marked resolved'], archived: false },
  { id: 1037, subject: 'Webhook signature verification fails intermittently', customer: 'Elena Rostova', initials: 'ER', email: 'elena.rostova@vertex.dev', description: 'Payload signatures fail verification during high-traffic spikes.', module: 'Integrations', department: 'Developer support', team: 'Developer support', channel: 'API', priority: 'Critical', status: 'Open', assignee: 'Sara Davis', sla: '00:15 left', created: '4 hrs ago', dueDate: 'Today, 8:00 PM', tag: 'SLA risk', tags: ['Webhooks', 'API'], comments: [], history: ['Escalated to engineering'], archived: false },
  { id: 1036, subject: 'Upgrade workspace to Enterprise tier', customer: 'Marcus Vance', initials: 'MV', email: 'marcus.vance@apex.corp', description: 'Requesting custom terms and invoice payment flow for Enterprise tier.', module: 'Billing', department: 'Enterprise', team: 'Enterprise', channel: 'Email', priority: 'High', status: 'Pending', assignee: 'Kiran Shah', sla: '01:05 left', created: '5 hrs ago', dueDate: 'Today, 11:30 PM', tag: 'Sales handoff', tags: ['Sales', 'Upgrade'], comments: [], history: ['Sales team notified'], archived: false },
]

const initialCustomersSeed = [
  { id: 1, name: 'Maya Chen', email: 'maya.chen@acme.co', company: 'Acme Corp', tier: 'Enterprise', openTickets: 1 },
  { id: 2, name: 'Theo Martin', email: 'theo.martin@northwind.io', company: 'Northwind', tier: 'Pro', openTickets: 1 },
  { id: 3, name: 'Priya Nair', email: 'priya.nair@contoso.com', company: 'Contoso', tier: 'Enterprise', openTickets: 1 },
  { id: 4, name: 'Jon Bell', email: 'jon.bell@globex.com', company: 'Globex', tier: 'Pro', openTickets: 1 },
  { id: 5, name: 'Owen Wilson', email: 'owen.wilson@example.com', company: 'Example Inc', tier: 'Standard', openTickets: 0 },
  { id: 6, name: 'Elena Rostova', email: 'elena.rostova@vertex.dev', company: 'Vertex Dev', tier: 'Enterprise', openTickets: 1 },
  { id: 7, name: 'Marcus Vance', email: 'marcus.vance@apex.corp', company: 'Apex Corp', tier: 'Enterprise', openTickets: 1 },
]

const routeViewMap = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/tickets': 'tickets',
  '/customers': 'customers',
  '/agents': 'agents',
  '/teams': 'teams',
  '/departments': 'departments',
  '/automation': 'automation',
  '/reports': 'reports',
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  // State Management with LocalStorage
  const [tickets, setTickets] = useLocalStorageState('app_tickets_v3', initialTickets)
  const [agents, setAgents] = useLocalStorageState('app_agents_v3', initialAgents)
  const [customers, setCustomers] = useLocalStorageState('app_customers_v3', initialCustomersSeed)
  const [teams, setTeams] = useLocalStorageState('app_teams_v3', initialTeams)
  const [departments, setDepartments] = useLocalStorageState('app_departments_v3', initialDepartments)
  const [automationRules, setAutomationRules] = useLocalStorageState('app_rules_v3', initialAutomationRules)

  // App UI State
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [ticketSearch, setTicketSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterAssignee, setFilterAssignee] = useState('All')
  const [showArchived, setShowArchived] = useState(false)
  const [dateRange, setDateRange] = useState('Today')
  const [bannerMessage, setBannerMessage] = useState('')
  const [assistantQuery, setAssistantQuery] = useState('')
  const [assistantLog, setAssistantLog] = useState([])
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Current View via URL Routing
  const currentView = routeViewMap[location.pathname] || 'dashboard'

  // Dynamic Header Date
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  // Auto-clear banner messages
  useEffect(() => {
    if (!bannerMessage) return
    const timer = setTimeout(() => setBannerMessage(''), 4500)
    return () => clearTimeout(timer)
  }, [bannerMessage])

  // Sync API on Initial Mount
  useEffect(() => {
    let isMounted = true
    const syncBackendData = async () => {
      try {
        const [ticketsRes, agentsRes, customersRes] = await Promise.allSettled([
          api.getTickets(),
          api.getAgents(),
          api.getCustomers()
        ])

        if (!isMounted) return

        if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value) && ticketsRes.value.length > 0) {
          setTickets(ticketsRes.value)
        }
        if (agentsRes.status === 'fulfilled' && Array.isArray(agentsRes.value) && agentsRes.value.length > 0) {
          setAgents(agentsRes.value)
        }
        if (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value) && customersRes.value.length > 0) {
          setCustomers(customersRes.value)
        }
      } catch (err) {
        console.warn('Backend sync skipped, using local reactive state.', err)
      }
    }
    syncBackendData()
    return () => { isMounted = false }
  }, [])

  // Live Clean Arrays for Dropdowns (Zero Hardcoding - strictly reflects live state)
  const liveCustomerNames = useMemo(() => {
    return (customers || []).map(c => typeof c === 'string' ? c : c?.name).filter(Boolean)
  }, [customers])

  const liveAgentNames = useMemo(() => {
    return (agents || []).map(a => typeof a === 'string' ? a : a?.name).filter(Boolean)
  }, [agents])

  const liveDepartmentNames = useMemo(() => {
    return (departments || []).map(d => typeof d === 'string' ? d : d?.name).filter(Boolean)
  }, [departments])

  const liveTeamNames = useMemo(() => {
    return (teams || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean)
  }, [teams])

  // Create Ticket Form State
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    customer: '',
    email: '',
    priority: 'Medium',
    status: 'Open',
    assignee: 'Unassigned',
    department: '',
    team: '',
    description: '',
    sla: 'Standard',
    module: 'Core',
    dueDate: 'Today, 9:00 PM',
    tags: '',
  })

  const handleCreateTicketChange = (e) => {
    const { name, value } = e.target
    setNewTicketForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'customer') {
        const found = (customers || []).find(c => (typeof c === 'object' ? c.name : c) === value)
        if (found && typeof found === 'object' && found.email) {
          next.email = found.email
        }
      }
      return next
    })
  }

  // Create Ticket Submit Action
  const handleCreateTicketSubmit = (e) => {
    e.preventDefault()
    if (!newTicketForm.subject.trim() || !newTicketForm.customer.trim() || !newTicketForm.description.trim()) {
      alert('Please fill Subject, Customer, and Description.')
      return
    }

    const nextId = tickets.length > 0 ? Math.max(...tickets.map(t => t.id || 0)) + 1 : 1001
    const tagsArr = newTicketForm.tags ? newTicketForm.tags.split(',').map(t => t.trim()).filter(Boolean) : ['New']
    const initials = newTicketForm.customer.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

    const newTicket = {
      id: nextId,
      subject: newTicketForm.subject.trim(),
      customer: newTicketForm.customer.trim(),
      initials,
      email: newTicketForm.email.trim() || 'customer@example.com',
      description: newTicketForm.description.trim(),
      module: newTicketForm.module || 'General',
      department: newTicketForm.department || 'Core support',
      team: newTicketForm.team || 'Core support',
      channel: 'Web',
      priority: newTicketForm.priority,
      status: newTicketForm.status,
      assignee: newTicketForm.assignee,
      sla: newTicketForm.status === 'Resolved' ? 'Closed' : newTicketForm.sla,
      created: 'Just now',
      dueDate: newTicketForm.dueDate || 'Today, 11:00 PM',
      tag: tagsArr[0] || 'General',
      tags: tagsArr,
      comments: [],
      history: ['Ticket created via Workspace Portal'],
      archived: false,
    }

    // Run Automations if any
    const { ticket: processedTicket, log } = runAutomationRules(newTicket, automationRules)
    const finalTicket = processedTicket || newTicket

    setTickets(prev => [finalTicket, ...prev])
    setBannerMessage(`Ticket #${nextId} created successfully! ${log ? `(${log.length} automations run)` : ''}`)
    setIsCreateModalOpen(false)
    setNewTicketForm({
      subject: '',
      customer: '',
      email: '',
      priority: 'Medium',
      status: 'Open',
      assignee: 'Unassigned',
      department: '',
      team: '',
      description: '',
      sla: 'Standard',
      module: 'Core',
      dueDate: 'Today, 9:00 PM',
      tags: '',
    })

    // Background Backend Post
    api.createTicket(finalTicket).catch(err => console.warn('Saved locally, API offline:', err))
  }

  // Update Ticket (or Delete if updatedData is null)
  const updateTicket = (ticketId, updatedData, bannerMsg) => {
    if (updatedData === null) {
      setTickets(prev => prev.filter(t => t.id !== ticketId))
      setBannerMessage(bannerMsg || `Ticket #${ticketId} deleted.`)
      api.deleteTicket(ticketId).catch(err => console.warn('Deleted locally:', err))
      return
    }

    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, ...updatedData } : t)))
    if (bannerMsg) setBannerMessage(bannerMsg)
    api.updateTicket(ticketId, updatedData).catch(err => console.warn('Updated locally:', err))
  }

  // Toggle Archive Action
  const toggleArchiveTicket = (ticketId) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const nextArchived = !t.archived
        const actionText = nextArchived ? 'archived' : 'unarchived'
        setBannerMessage(`Ticket #${ticketId} ${actionText}.`)
        return {
          ...t,
          archived: nextArchived,
          history: [...(t.history || []), `Ticket ${actionText} by Workspace administrator`]
        }
      }
      return t
    }))
  }

  // Counts & Filtering
  const archivedCount = useMemo(() => tickets.filter(t => t.archived).length, [tickets])
  const activeTicketsCount = useMemo(() => tickets.filter(t => !t.archived).length, [tickets])

  const visibleTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Archive Filter
      if (showArchived) {
        if (!ticket.archived) return false
      } else {
        if (ticket.archived) return false
      }

      // Priority Filter
      if (filterPriority !== 'All' && ticket.priority !== filterPriority) return false
      // Status Filter
      if (filterStatus !== 'All' && ticket.status !== filterStatus) return false
      // Department Filter
      if (filterDepartment !== 'All' && ticket.department !== filterDepartment) return false
      // Assignee Filter
      if (filterAssignee !== 'All' && ticket.assignee !== filterAssignee) return false

      // Search Filter
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase()
        const matchSub = (ticket.subject || '').toLowerCase().includes(q)
        const matchCust = (ticket.customer || '').toLowerCase().includes(q)
        const matchDesc = (ticket.description || '').toLowerCase().includes(q)
        const matchId = String(ticket.id).includes(q)
        if (!matchSub && !matchCust && !matchDesc && !matchId) return false
      }

      return true
    })
  }, [tickets, showArchived, filterPriority, filterStatus, filterDepartment, filterAssignee, ticketSearch])

  // Selected Ticket for Drawer
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null
  }, [tickets, selectedTicketId])

  // AI Assistant Command Runner
  const handleAssistantSubmit = (e) => {
    e.preventDefault()
    if (!assistantQuery.trim()) return

    const query = assistantQuery.trim()
    const parsedCmd = parseWorkspaceCommand(query)

    if (parsedCmd && parsedCmd.type !== 'UNKNOWN') {
      const result = applyWorkspaceCommand(parsedCmd, {
        tickets,
        setTickets,
        agents,
        setAgents,
        customers,
        setCustomers,
        departments,
        setDepartments,
        teams,
        setTeams,
      })
      setAssistantLog(prev => [{ q: query, a: result.message, timestamp: new Date().toLocaleTimeString() }, ...prev])
      setBannerMessage(result.message)
    } else {
      const answer = answerWorkspaceQuestion(query, { tickets, agents, customers, departments, teams })
      setAssistantLog(prev => [{ q: query, a: answer, timestamp: new Date().toLocaleTimeString() }, ...prev])
    }
    setAssistantQuery('')
  }

  return (
    <div className="app-shell">
      {/* Top Banner Notifications */}
      {bannerMessage && (
        <div className="app-alert-banner">
          <span>{bannerMessage}</span>
          <button type="button" onClick={() => setBannerMessage('')}>×</button>
        </div>
      )}

      {/* Main Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">T</div>
          <div>
            <h1 className="brand-title">Ticket Management System</h1>
            <p className="brand-subtitle">Enterprise Operations & Support Portal</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="date-indicator">
            <span className="live-dot" />
            <span>{formattedToday}</span>
          </div>

          <select 
            className="date-pill" 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="Today">Today (Live)</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="This Month">This Month</option>
          </select>

          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create Ticket
          </button>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          >
            💬 Copilot
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="app-body">
        {/* Navigation Sidebar */}
        <nav className="app-sidebar">
          <div className="nav-group-title">WORKSPACE</div>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'tickets' ? 'active' : ''}`}
            onClick={() => navigate('/tickets')}
          >
            🎫 Tickets <span className="nav-count">{activeTicketsCount}</span>
          </button>

          <div className="nav-group-title">RELATIONS & ORG</div>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'customers' ? 'active' : ''}`}
            onClick={() => navigate('/customers')}
          >
            👥 Customers <span className="nav-count">{customers.length}</span>
          </button>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'agents' ? 'active' : ''}`}
            onClick={() => navigate('/agents')}
          >
            🎧 Agents <span className="nav-count">{agents.length}</span>
          </button>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'teams' ? 'active' : ''}`}
            onClick={() => navigate('/teams')}
          >
            🛡️ Teams <span className="nav-count">{teams.length}</span>
          </button>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'departments' ? 'active' : ''}`}
            onClick={() => navigate('/departments')}
          >
            🏢 Departments <span className="nav-count">{departments.length}</span>
          </button>

          <div className="nav-group-title">OPERATIONS</div>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'automation' ? 'active' : ''}`}
            onClick={() => navigate('/automation')}
          >
            ⚡ Automation Rules
          </button>
          <button 
            type="button" 
            className={`nav-link ${currentView === 'reports' ? 'active' : ''}`}
            onClick={() => navigate('/reports')}
          >
            📈 Reports & SLA
          </button>
        </nav>

        {/* Dynamic Main View Area */}
        <main className="app-content">
          {currentView === 'dashboard' && (
            <Dashboard 
              tickets={tickets} 
              onSelectTicket={(id) => setSelectedTicketId(id)}
              onNavigate={(path) => navigate(path)}
              dateRange={dateRange}
            />
          )}

          {currentView === 'tickets' && (
            <div className="tickets-view-container">
              {/* Ticket Controls Filter Bar */}
              <div className="tickets-toolbar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search subject, customer, ID..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />

                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                  <option value="All">All Departments</option>
                  {liveDepartmentNames.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value="All">All Assignees</option>
                  {liveAgentNames.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  {showArchived ? 'Viewing Archived' : `Show Archived (${archivedCount})`}
                </button>
              </div>

              {/* Tickets Table */}
              <div className="tickets-table-wrapper">
                <table className="tickets-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject</th>
                      <th>Customer</th>
                      <th>Assignee</th>
                      <th>Department</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>SLA / Due</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTickets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-table-cell">
                          No {showArchived ? 'archived' : 'active'} tickets found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      visibleTickets.map((t) => (
                        <tr 
                          key={t.id} 
                          className="ticket-row-clickable"
                          onClick={() => setSelectedTicketId(t.id)}
                        >
                          <td className="ticket-id-cell">#{t.id}</td>
                          <td className="ticket-subject-cell">
                            <span className="ticket-subject-text">{t.subject}</span>
                            <span className="ticket-meta-subtitle">{t.module || 'General'}</span>
                          </td>
                          <td>
                            <div className="customer-info-cell">
                              <span className="customer-avatar">{t.initials || t.customer?.slice(0, 2).toUpperCase()}</span>
                              <span>{t.customer}</span>
                            </div>
                          </td>
                          <td>{t.assignee || 'Unassigned'}</td>
                          <td>{t.department || 'Core support'}</td>
                          <td>
                            <span className={`priority-pill priority-${(t.priority || 'medium').toLowerCase()}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill status-${(t.status || 'open').toLowerCase()}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="sla-cell">
                            <span className={t.sla?.includes('00:') ? 'sla-danger' : ''}>{t.sla}</span>
                            <span className="due-date-sub">{t.dueDate}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => toggleArchiveTicket(t.id)}
                            >
                              {t.archived ? 'Unarchive' : 'Archive'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Management Pages: Customers, Agents, Teams, Departments */}
          {['customers', 'agents', 'teams', 'departments'].includes(currentView) && (
            <ManagementPages
              view={currentView}
              customers={customers}
              setCustomers={setCustomers}
              agents={agents}
              setAgents={setAgents}
              teams={teams}
              setTeams={setTeams}
              departments={departments}
              setDepartments={setDepartments}
              tickets={tickets}
              onNavigate={(v) => navigate(`/${v}`)}
            />
          )}

          {currentView === 'automation' && (
            <AutomationPage 
              rules={automationRules} 
              setRules={setAutomationRules} 
            />
          )}

          {currentView === 'reports' && (
            <ReportsPage 
              tickets={tickets} 
              agents={agents} 
            />
          )}
        </main>
      </div>

      {/* CREATE TICKET MODAL (WITH 100% STRICT LIVE DROPDOWNS) */}
      {isCreateModalOpen && (
        <div className="ticket-detail-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="ticket-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Ticket</h2>
              <button type="button" className="close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="ticket-edit-form modal-form">
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={newTicketForm.subject}
                  onChange={handleCreateTicketChange}
                  placeholder="e.g. Cannot export monthly report"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer * (Live)</label>
                  <select
                    name="customer"
                    value={newTicketForm.customer}
                    onChange={handleCreateTicketChange}
                    required
                  >
                    <option value="">Select customer</option>
                    {liveCustomerNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={newTicketForm.email}
                    onChange={handleCreateTicketChange}
                    placeholder="customer@domain.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assignee (Live)</label>
                  <select
                    name="assignee"
                    value={newTicketForm.assignee}
                    onChange={handleCreateTicketChange}
                  >
                    <option value="Unassigned">Unassigned</option>
                    {liveAgentNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department (Live)</label>
                  <select
                    name="department"
                    value={newTicketForm.department}
                    onChange={handleCreateTicketChange}
                  >
                    <option value="">Select department</option>
                    {liveDepartmentNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Team (Live)</label>
                  <select
                    name="team"
                    value={newTicketForm.team}
                    onChange={handleCreateTicketChange}
                  >
                    <option value="">Select team</option>
                    {liveTeamNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={newTicketForm.priority}
                    onChange={handleCreateTicketChange}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  rows={3}
                  value={newTicketForm.description}
                  onChange={handleCreateTicketChange}
                  placeholder="Detailed description of the issue..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Module / Area</label>
                  <input
                    type="text"
                    name="module"
                    value={newTicketForm.module}
                    onChange={handleCreateTicketChange}
                    placeholder="e.g. Billing, Workspace, SSO"
                  />
                </div>

                <div className="form-group">
                  <label>SLA Tier</label>
                  <select
                    name="sla"
                    value={newTicketForm.sla}
                    onChange={handleCreateTicketChange}
                  >
                    <option value="Standard">Standard (24h)</option>
                    <option value="Priority">Priority (4h)</option>
                    <option value="Enterprise">Enterprise (1h)</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT & DETAIL PROFESSIONAL DRAWER (LIVE DROPDOWNS PROPS PASSED) */}
      {selectedTicket && (
        <TicketDetailProfessional
          ticket={selectedTicket}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={updateTicket}
          onToggleArchive={toggleArchiveTicket}
          customers={customers}
          agents={agents}
          teams={teams}
          departments={departments}
        />
      )}

      {/* COPILOT / AI ASSISTANT DRAWER */}
      {isAssistantOpen && (
        <div className="copilot-drawer">
          <div className="copilot-header">
            <h3>Workspace Copilot</h3>
            <button type="button" onClick={() => setIsAssistantOpen(false)}>×</button>
          </div>
          <div className="copilot-body">
            <div className="copilot-logs">
              {assistantLog.length === 0 ? (
                <div className="copilot-empty">
                  Ask questions like:
                  <ul>
                    <li>"How many critical tickets are open?"</li>
                    <li>"Who is assigned to ticket 1042?"</li>
                    <li>"assign ticket 1042 to Sara Davis"</li>
                  </ul>
                </div>
              ) : (
                assistantLog.map((log, idx) => (
                  <div key={idx} className="copilot-message">
                    <div className="copilot-q"><strong>You:</strong> {log.q}</div>
                    <div className="copilot-a"><strong>AI:</strong> {log.a}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAssistantSubmit} className="copilot-input-form">
              <input
                type="text"
                placeholder="Ask or command..."
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}