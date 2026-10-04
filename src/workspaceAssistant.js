import { readLocalStorageValue } from './useLocalStorageState.js'
import { initialAgents, initialDepartments, initialTeams } from './workspaceData.js'

export function answerWorkspaceQuestion(question, tickets = []) {
  const q = String(question || '').trim().toLowerCase()

  // Data helpers
  const agents = readLocalStorageValue('relay:agents', initialAgents) || []
  const departments = readLocalStorageValue('relay:departments', initialDepartments) || []
  const teams = readLocalStorageValue('relay:teams', initialTeams) || []
  const savedCustomers = readLocalStorageValue('relay:customers', []) || []
  
  const ticketCustomers = tickets.map((t) => t.customer).filter(Boolean)
  const allCustomerNames = [...new Set([...savedCustomers.map((c) => c.name).filter(Boolean), ...ticketCustomers])]

  const totalTickets = tickets.length
  const open = tickets.filter((t) => t.status === 'Open').length
  const pending = tickets.filter((t) => t.status === 'Pending').length
  const activeTickets = open + pending
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length

  // 1. Agar specific Ticket ID poocha ho (e.g. #1042)
  const ticketId = q.match(/#?(\d{3,})/)?.[1]
  if (ticketId) {
    const ticket = tickets.find((item) => String(item.id) === ticketId)
    return ticket 
      ? `Ticket #${ticket.id}: ${ticket.subject}. Status: ${ticket.status}; Priority: ${ticket.priority}; Assigned to: ${ticket.assignee}; Customer: ${ticket.customer}.` 
      : `I couldn't find ticket #${ticketId} in this workspace.`
  }

  // 2. Agar user ne "ACTIVE" poocha ho
  if (/(active|chalu|in progress)/i.test(q)) {
    if (/(agent|agents)/i.test(q)) {
      return `Total Active Agents: ${agents.length}`
    }
    return `Total Active Tickets: ${activeTickets} (Open: ${open}, Pending: ${pending})`
  }

  // 3. Agar user ne "RESOLVED" ya "CLOSED" poocha ho
  if (/(resolved|closed|band|solve)/i.test(q)) {
    return `Total Resolved Tickets: ${resolvedTickets}`
  }

  // 4. Agar user ne "AGENTS" poocha ho (Strict Total)
  if (/(agent|agents)/i.test(q) && !/(workload|load)/i.test(q)) {
    const names = agents.map((a) => a.name).filter(Boolean).join(', ')
    return `Total Agents: ${agents.length} (${names || 'None'})`
  }

  // 5. Agar user ne "DEPARTMENTS" poocha ho (Strict Total)
  if (/(department|departments|dept)/i.test(q)) {
    const names = departments.map((d) => d.name).filter(Boolean).join(', ')
    return `Total Departments: ${departments.length} (${names || 'None'})`
  }

  // 6. Agar user ne "TEAMS" poocha ho (Strict Total)
  if (/(team|teams)/i.test(q) && !/(workload|load)/i.test(q)) {
    const names = teams.map((t) => t.name).filter(Boolean).join(', ')
    return `Total Teams: ${teams.length} (${names || 'None'})`
  }

  // 7. Agar user ne "CUSTOMERS" poocha ho (Strict Total)
  if (/(customer|customers|client)/i.test(q)) {
    return `Total Customers: ${allCustomerNames.length} (${allCustomerNames.join(', ') || 'None'})`
  }

  // 8. Agar user ne "WORKLOAD" poocha ho
  if (/workload|load/i.test(q)) {
    const workload = [...new Set(tickets.map((t) => t.assignee))].map((name) => `${name}: ${tickets.filter((t) => t.assignee === name && t.status !== 'Resolved').length} active`).join('; ')
    return `Current active ticket workload: ${workload || 'None'}.`
  }

  // 9. SLA / Risk
  if (/sla|risk|urgent|critical/i.test(q)) {
    const atRisk = tickets.filter((t) => t.status !== 'Resolved' && (t.priority === 'Critical' || /risk|left/i.test(t.sla)))
    return atRisk.length 
      ? `There are ${atRisk.length} tickets flagged for SLA attention: ${atRisk.map((t) => `#${t.id} (${t.priority}, ${t.sla})`).join(', ')}.` 
      : 'No tickets are currently flagged for SLA risk.'
  }

  // 10. Agar user ne "TOTAL" ya "TOTAL TICKETS" poocha ho
  if (/(ticket|tickets)/i.test(q) || /^(total|sab|count)\b/i.test(q)) {
    return `Total Tickets: ${totalTickets}`
  }

  // Snapshot fallback
  return `Workspace snapshot: ${totalTickets} total tickets (${activeTickets} active, ${resolvedTickets} resolved), ${agents.length} agents, ${departments.length} departments.`
}