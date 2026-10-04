const statusColors = { Open: 'orange', Pending: 'blue', Resolved: 'green' }
const priorityColors = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' }

function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0
}

function MetricCard({ label, value, detail, tone = 'green' }) {
  return <div className="metric-card dashboard-metric"><div className="metric-label">{label}<span className="metric-icon">↗</span></div><div className="metric-value">{value}</div><div className={`metric-trend ${tone}`}>{tone === 'red' ? '!' : '↑'} <span>{detail}</span></div></div>
}

function DistributionList({ rows, total, colorKey }) {
  return <div className="distribution-list">{rows.map((row) => <div className="distribution-row" key={row.label}><div className="distribution-label"><i className={`legend-dot ${colorKey ? colorKey(row.label) : row.color}`} /><span>{row.label}</span><strong>{row.value}</strong></div><div className="distribution-track"><span className={colorKey ? colorKey(row.label) : row.color} style={{ width: `${percent(row.value, total)}%` }} /></div><small>{percent(row.value, total)}%</small></div>)}</div>
}

function Dashboard({ tickets, activityLog, onOpenTickets }) {
  const total = tickets.length
  const open = tickets.filter((ticket) => ticket.status === 'Open').length
  const pending = tickets.filter((ticket) => ticket.status === 'Pending').length
  const resolved = tickets.filter((ticket) => ticket.status === 'Resolved').length
  const critical = tickets.filter((ticket) => ticket.priority === 'Critical').length
  const slaBreaches = tickets.filter((ticket) => /breach|overdue/i.test(`${ticket.sla} ${ticket.tag} ${ticket.status}`)).length
  const resolutionTimes = tickets.map((ticket) => ticket.resolutionMinutes).filter((value) => Number.isFinite(value))
  const averageResolution = resolutionTimes.length ? `${Math.round(resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length)}m` : 'N/A'
  const priorities = ['Critical', 'High', 'Medium', 'Low'].map((label) => ({ label, value: tickets.filter((ticket) => ticket.priority === label).length }))
  const statuses = [{ label: 'Open', value: open, color: 'orange' }, { label: 'Pending', value: pending, color: 'blue' }, { label: 'Resolved', value: resolved, color: 'green' }]
  const trendTickets = tickets.slice(0, 7).reverse()
  const maxTrend = Math.max(trendTickets.length, 1)
  const agents = [...new Set(tickets.map((ticket) => ticket.assignee).filter(Boolean))].map((assignee) => {
    const assigned = tickets.filter((ticket) => ticket.assignee === assignee)
    const resolvedByAgent = assigned.filter((ticket) => ticket.status === 'Resolved').length
    return { assignee, total: assigned.length, resolved: resolvedByAgent, rate: percent(resolvedByAgent, assigned.length) }
  }).sort((a, b) => b.total - a.total)
  const fallbackActivity = tickets.flatMap((ticket) => (ticket.history || []).map((action) => ({ action: `${action} on ticket #${ticket.id}`, actor: ticket.assignee || 'Support team', createdAt: ticket.created }))).slice(0, 5)
  const activities = activityLog.length ? activityLog.slice(0, 5) : fallbackActivity

  return <>
    <div className="metrics-grid dashboard-metrics-grid"><MetricCard label="Total tickets" value={total} detail="live workspace count" /><MetricCard label="Open tickets" value={open} detail="awaiting action" /><MetricCard label="Pending tickets" value={pending} detail="waiting on response" /><MetricCard label="Resolved tickets" value={resolved} detail="completed requests" /><MetricCard label="Critical tickets" value={critical} detail={critical ? 'needs attention' : 'none in queue'} tone={critical ? 'red' : 'green'} /><MetricCard label="SLA breaches" value={slaBreaches} detail={slaBreaches ? 'requires escalation' : 'no breaches recorded'} tone={slaBreaches ? 'red' : 'green'} /><MetricCard label="Avg. resolution time" value={averageResolution} detail={resolutionTimes.length ? 'from recorded timings' : 'no timing data recorded'} /><MetricCard label="Agent performance" value={agents.length ? `${Math.round(agents.reduce((sum, agent) => sum + agent.rate, 0) / agents.length)}%` : 'N/A'} detail={agents.length ? 'average resolution rate' : 'no assigned tickets'} /></div>

    <div className="dashboard-grid"><section className="panel dashboard-chart-panel"><div className="panel-heading"><div><h2>Ticket trends</h2><p>Ticket creation recency from the current workspace data</p></div><span className="chart-caption">{total} tracked</span></div><div className="trend-chart">{trendTickets.map((ticket, index) => <div className="trend-column" key={ticket.id}><span className="trend-value">{index + 1}</span><div className="trend-bar"><span style={{ height: `${((index + 1) / maxTrend) * 100}%` }} /></div><small>{ticket.created}</small></div>)}</div></section><section className="panel dashboard-chart-panel"><div className="panel-heading"><div><h2>Ticket status</h2><p>Current queue distribution</p></div><strong className="chart-total">{total}</strong></div><DistributionList rows={statuses} total={total} /></section></div>

    <div className="dashboard-grid"><section className="panel dashboard-chart-panel"><div className="panel-heading"><div><h2>Priority distribution</h2><p>Current urgency across tickets</p></div></div><DistributionList rows={priorities} total={total} colorKey={(label) => priorityColors[label]} /></section><section className="panel dashboard-chart-panel"><div className="panel-heading"><div><h2>Agent performance</h2><p>Assigned workload and resolved tickets</p></div></div><div className="agent-performance-list">{agents.length ? agents.map((agent) => <div className="agent-performance-row" key={agent.assignee}><span className="avatar small">{agent.assignee.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><strong>{agent.assignee}</strong><small>{agent.total} assigned · {agent.resolved} resolved</small></div><b>{agent.rate}%</b></div>) : <div className="dashboard-empty">No assigned ticket data yet.</div>}</div></section></div>

    <div className="lower-grid"><section className="panel queue-panel"><div className="panel-heading"><div><h2>Recent tickets</h2><p>Latest records from the ticket workspace</p></div><button className="text-link" onClick={onOpenTickets}>View all <span>→</span></button></div>{tickets.slice(0, 5).map((ticket) => <button className="recent-ticket-row" key={ticket.id} onClick={onOpenTickets}><span className={`priority-bar ${ticket.priority.toLowerCase()}`} /><span className="row-id">#{ticket.id}</span><span className="row-subject"><strong>{ticket.subject}</strong><small>{ticket.customer} · {ticket.channel}</small></span><span className={`pill ${ticket.status.toLowerCase()}`}>{ticket.status}</span></button>)}{!tickets.length && <div className="dashboard-empty">No tickets have been created yet.</div>}</section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest recorded actions</p></div></div>{activities.length ? activities.map((activity, index) => <div className="activity" key={`${activity.action}-${index}`}><span className="activity-icon green">✓</span><span><strong>{activity.action}</strong><small>{activity.actor} · {activity.createdAt}</small></span></div>) : <div className="dashboard-empty">No activity has been recorded yet.</div>}</section></div>
  </>
}

export default Dashboard
