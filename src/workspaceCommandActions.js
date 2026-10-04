import { initialAgents, initialArticles, initialDepartments, initialTeams } from './workspaceData.js'
import { answerWorkspaceQuestion } from './workspaceAssistant.js'
import { getActionType, getTriggerType, initialAutomationRules, normalizeAutomationRule } from './automationEngine.js'
import { readLocalStorageValue, writeLocalStorageState } from './useLocalStorageState.js'
import api from './api.js'

const entityCollections = {
  customer: ['relay:customers', []],
  agent: ['relay:agents', initialAgents],
  team: ['relay:teams', initialTeams],
  department: ['relay:departments', initialDepartments],
  article: ['relay:articles', initialArticles],
  rule: ['relay:automation-rules', initialAutomationRules],
}

function writeCollection(entity, records) {
  writeLocalStorageState(entityCollections[entity][0], records)
}

function readCollection(entity) {
  const [key, fallback] = entityCollections[entity]
  return readLocalStorageValue(key, fallback)
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// 👈 SMART WORKSPACE QUERY ENGINE (Fetches Database for all 12 Customers)
async function answerWorkspaceQuery(query, context) {
  const q = String(query || '').toLowerCase().trim()
  const agents = readCollection('agent') || []
  const depts = readCollection('department') || []
  const teams = readCollection('team') || []
  const tickets = context.tickets || []

  // 1. CUSTOMERS QUERY (Database API + LocalStorage + Tickets merge -> Exactly 12)
  if (/(customer|customers|client)/i.test(q)) {
    let remoteCustomers = []
    try {
      const res = await api.getCustomers()
      remoteCustomers = Array.isArray(res) ? res : res?.items || []
    } catch (e) {
      console.warn('Could not fetch remote customers:', e)
    }

    const savedCustomers = readCollection('customer') || []
    const ticketCustomers = tickets.map((t) => t.customer).filter(Boolean)

    const map = new Map()
    ticketCustomers.forEach((name) => map.set(name, name))
    savedCustomers.forEach((c) => c.name && map.set(c.name, c.name))
    remoteCustomers.forEach((c) => c.name && map.set(c.name, c.name))

    const allNames = [...map.values()]
    const totalCustomers = allNames.length

    if (/(active|chalu)/i.test(q)) {
      return `Active Customers: ${totalCustomers} (${allNames.join(', ')})`
    }
    return `Total Customers: ${totalCustomers} (${allNames.join(', ')})`
  }

  const totalTickets = tickets.length
  const activeTickets = tickets.filter((t) => t.status !== 'Resolved').length
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length
  const openTickets = tickets.filter((t) => t.status === 'Open').length
  const pendingTickets = tickets.filter((t) => t.status === 'Pending').length

  // 2. AGENTS
  if (/(agent|agents)/i.test(q)) {
    const names = agents.map((a) => a.name).filter(Boolean).join(', ')
    if (/(active|chalu)/i.test(q)) {
      return `Active Agents: ${agents.length} (${names})`
    }
    return `Total Agents: ${agents.length} (${names})`
  }

  // 3. DEPARTMENTS
  if (/(department|departments|dept)/i.test(q)) {
    const names = depts.map((d) => d.name).filter(Boolean).join(', ')
    return `Total Departments: ${depts.length} (${names})`
  }

  // 4. TEAMS
  if (/(team|teams)/i.test(q)) {
    const names = teams.map((t) => t.name).filter(Boolean).join(', ')
    return `Total Teams: ${teams.length} (${names})`
  }

  // 5. ACTIVE TICKETS
  if (/(active|chalu|in progress)/i.test(q)) {
    return `Active Tickets: ${activeTickets} (Open: ${openTickets}, Pending: ${pendingTickets})`
  }

  // 6. RESOLVED TICKETS
  if (/(resolved|closed|band|solve)/i.test(q)) {
    return `Resolved Tickets: ${resolvedTickets}`
  }

  // 7. TOTAL TICKETS
  if (/(ticket|tickets)/i.test(q)) {
    return `Total Tickets: ${totalTickets}`
  }

  // 8. GENERAL TOTAL
  if (/^(total|overall|summary|stats|overview|sab)\b/i.test(q)) {
    return `Total Workspace Data -> Tickets: ${totalTickets} | Agents: ${agents.length} | Departments: ${depts.length} | Teams: ${teams.length}`
  }

  return context.answerQuestion ? context.answerQuestion(query) : ''
}

// Validation Helpers
function findExistingAgent(name) {
  if (!name || name.toLowerCase() === 'unassigned') return null
  const agents = readCollection('agent') || []
  const clean = name.toLowerCase().trim()
  return agents.find((a) => {
    const aName = (a.name || '').toLowerCase()
    return aName === clean || aName.includes(clean) || clean.includes(aName)
  })
}

function findExistingDepartment(name) {
  if (!name) return null
  const depts = readCollection('department') || []
  const clean = name.toLowerCase().trim()
  return depts.find((d) => (d.name || '').toLowerCase().includes(clean))
}

function findExistingTeam(name) {
  if (!name) return null
  const teams = readCollection('team') || []
  const clean = name.toLowerCase().trim()
  return teams.find((t) => (t.name || '').toLowerCase().includes(clean))
}

function normalizeFields(entity, fields) {
  if (entity === 'agent' || entity === 'team' || entity === 'department') {
    const normalized = {}
    if (fields.name || fields.title || fields.rename || fields.newname) {
      normalized.name = fields.rename || fields.newname || fields.name || fields.title
    }
    if (fields.role || fields.description || fields.detail) {
      normalized.detail = fields.role || fields.description || fields.detail
    }
    return normalized
  }
  if (entity === 'customer') {
    const normalized = {}
    for (const key of ['name', 'email', 'company', 'department']) {
      if (fields[key]) normalized[key] = fields[key]
    }
    if (fields.customer) normalized.name = fields.customer
    if (fields.rename) normalized.name = fields.rename
    return normalized
  }
  return fields
}

function findRecordIndex(records, name, field) {
  const target = String(name || '').trim().toLowerCase()
  return records.findIndex((record) => String(record[field] || '').trim().toLowerCase() === target)
}

function applyCollectionCommand(intent, context) {
  const { entity, fields = {}, name = '' } = intent
  if (!entityCollections[entity]) return false
  const records = readCollection(entity)
  const field = entity === 'article' ? 'title' : 'name'
  const index = findRecordIndex(records, name, field)

  if (intent.type === 'create') {
    const normalized = normalizeFields(entity, fields)
    const label = normalized[field]
    if (!label) {
      context.setNotice(`Please provide a name for ${entity}.`)
      return true
    }
    const record = { ...normalized, id: crypto.randomUUID() }
    writeCollection(entity, [record, ...records])
    context.recordActivity(`Created ${entity}: ${label}`)
    context.setNotice(`✓ Created ${entity}: ${label}.`)
    return true
  }

  if (index < 0) {
    context.setNotice(`! ${titleCase(entity)} “${name}” mojood nahi hai. Pehle yeh create karein.`)
    return true
  }

  if (intent.type === 'delete') {
    const deleted = records[index]
    if (!context.confirmAction(`Delete ${entity} “${deleted[field]}”?`)) {
      context.setNotice('Delete cancelled.')
      return true
    }
    writeCollection(entity, records.filter((_, itemIndex) => itemIndex !== index))
    context.recordActivity(`Deleted ${entity}: ${deleted[field]}`)
    context.setNotice(`✓ Deleted ${entity}: ${deleted[field]}.`)
    return true
  }

  const updates = normalizeFields(entity, fields)
  records[index] = { ...records[index], ...updates, name: fields.rename || fields.newname || updates.name || records[index].name }
  writeCollection(entity, records)
  context.recordActivity(`Updated ${entity}: ${records[index][field]}`)
  context.setNotice(`✓ Updated ${entity}: ${records[index][field]}.`)
  return true
}

function createTicket(fields, context) {
  const subject = fields.subject || 'Support ticket'
  const customer = fields.customer || 'Valued Customer'
  const description = fields.description || subject

  let assignedAgent = 'Unassigned'
  if (fields.assignee && fields.assignee.toLowerCase() !== 'unassigned') {
    const existingAgent = findExistingAgent(fields.assignee)
    if (!existingAgent) {
      context.setNotice(`! Agent “${fields.assignee}” mojood nahi hai. Pehle yeh agent create karein (Example: 'Create agent name="${fields.assignee}" role="Support agent"').`)
      context.navigate('Agents')
      return
    }
    assignedAgent = existingAgent.name
  }

  const id = Math.max(...context.tickets.map((ticket) => Number(ticket.id) || 0), 0) + 1
  const tags = String(fields.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  if (!tags.length) tags.push('AI created')

  const initials = customer
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const ticket = {
    id,
    subject: fields.subject ? fields.subject : titleCase(subject),
    customer: titleCase(customer),
    initials: initials || 'TC',
    email: fields.email || `${customer.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    description,
    module: fields.module || 'General',
    category: fields.category || 'General inquiry',
    priority: titleCase(fields.priority || 'Medium'),
    status: titleCase(fields.status || 'Open'),
    assignee: assignedAgent,
    department: fields.department || 'Core support',
    team: fields.team || 'Core support',
    tags,
    tag: tags[0],
    sla: fields.sla || 'Standard',
    channel: 'Command box',
    created: 'Just now',
    createdDate: new Date().toLocaleString(),
    updatedDate: new Date().toLocaleString(),
    comments: [],
    attachments: [],
    history: ['Ticket created automatically from AI Command Box'],
  }

  context.saveWithAutomation([ticket, ...context.tickets], [id])
  context.recordActivity(`Created ticket #${id} (${ticket.subject}) for ${ticket.customer}`)
  context.openTicketSearch(String(id))
  context.setNotice(`✓ Created Ticket #${id}: “${ticket.subject}” (${ticket.priority} priority, assigned to ${ticket.assignee}).`)
}

function updateTicket(intent, context) {
  const current = context.tickets.find((ticket) => ticket.id === intent.id)
  if (!current) {
    context.setNotice(`! Ticket #${intent.id} mojood nahi hai. Pehle yeh ticket create karein.`)
    return
  }

  const fields = { ...intent.fields }

  if (fields.assignee && fields.assignee.toLowerCase() !== 'unassigned') {
    const existingAgent = findExistingAgent(fields.assignee)
    if (!existingAgent) {
      context.setNotice(`! Agent “${fields.assignee}” mojood nahi hai. Pehle yeh agent create karein (Example: 'Create agent name="${fields.assignee}" role="Support agent"').`)
      context.navigate('Agents')
      return
    }
    fields.assignee = existingAgent.name
  }

  if (fields.department) {
    const existingDept = findExistingDepartment(fields.department)
    if (!existingDept) {
      context.setNotice(`! Department “${fields.department}” mojood nahi hai. Pehle yeh department create karein.`)
      context.navigate('Departments')
      return
    }
    fields.department = existingDept.name
  }

  if (fields.team) {
    const existingTeam = findExistingTeam(fields.team)
    if (!existingTeam) {
      context.setNotice(`! Team “${fields.team}” mojood nahi hai. Pehle yeh team create karein.`)
      context.navigate('Teams')
      return
    }
    fields.team = existingTeam.name
  }

  if (fields.priority) fields.priority = titleCase(fields.priority)
  if (fields.status) fields.status = titleCase(fields.status)
  if (fields.archived && !fields.archivedAt) fields.archivedAt = new Date().toISOString()
  if (fields.tags && !Array.isArray(fields.tags)) fields.tags = fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean)

  context.updateTicket(intent.id, fields, `Updated ticket #${intent.id} from AI Command Box`)
  context.openTicketSearch(String(intent.id))

  const changesList = Object.entries(fields)
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ')
  context.setNotice(`✓ Ticket #${intent.id} updated (${changesList || 'Saved'}).`)
}

export async function applyWorkspaceCommand(intent, context) {
  switch (intent.type) {
    case 'empty':
      return false

    case 'prompt-missing-data':
      context.setNotice(`! ${intent.message}`)
      if (intent.entity === 'ticket') {
        context.navigate('/tickets/new')
      } else {
        context.navigate(intent.entity === 'agent' ? 'Agents' : intent.entity === 'customer' ? 'Customers' : 'Overview')
      }
      return true

    case 'clear-search':
      context.openTicketSearch('')
      context.navigate('Tickets')
      context.setNotice('✓ All tickets view restored.')
      return true

    case 'navigate':
      context.navigate(intent.view)
      context.setNotice(`✓ Navigated to ${intent.view}.`)
      return true

    case 'open-create-ticket':
      context.navigate('/tickets/new')
      context.setNotice('✓ Opened Create Ticket form.')
      return true

    case 'search-tickets':
      context.openTicketSearch(intent.query)
      context.setNotice(`✓ Showing tickets matching “${intent.query}”.`)
      return true

    case 'set-setting': {
      const settings = readLocalStorageValue('relay:settings', { email: true, realtime: true, sla: true }) || {}
      const key = intent.name.toLowerCase().includes('email') ? 'email' : intent.name.toLowerCase().includes('realtime') ? 'realtime' : intent.name
      settings[key] = intent.enabled
      writeLocalStorageState('relay:settings', settings)
      context.setNotice(`${intent.name} turned ${intent.enabled ? 'on' : 'off'}.`)
      return true
    }

    case 'create':
      if (intent.entity === 'ticket') {
        if (context.openCreateTicketForm) {
          context.openCreateTicketForm(intent.fields)
          context.setNotice(`✓ Create Ticket form opened with your details. Review and click "Create ticket"!`)
        } else {
          createTicket(intent.fields, context)
        }
      } else {
        const targetView = intent.entity === 'article'
          ? 'Knowledge Base'
          : intent.entity === 'rule'
          ? 'Automation'
          : `${intent.entity[0].toUpperCase()}${intent.entity.slice(1)}s`
        context.navigate(targetView)
        applyCollectionCommand(intent, context)
      }
      return true

    case 'update-ticket':
      updateTicket(intent, context)
      return true

    case 'assign-ticket':
      updateTicket({ ...intent, fields: { assignee: intent.assignee } }, context)
      return true

    case 'add-comment': {
      const ticket = context.tickets.find((item) => item.id === intent.id)
      if (!ticket) {
        context.setNotice(`! Ticket #${intent.id} mojood nahi hai. Pehle yeh ticket create karein.`)
      } else {
        context.updateTicket(
          intent.id,
          {
            comments: [...(ticket.comments || []), intent.body],
            history: [...(ticket.history || []), 'Comment added from AI Command Box'],
          },
          `Comment added to ticket #${intent.id}`
        )
        context.setNotice(`✓ Added comment to Ticket #${intent.id}.`)
      }
      return true
    }

    case 'delete-ticket': {
      const ticket = context.tickets.find((item) => item.id === intent.id)
      if (!ticket) {
        context.setNotice(`! Ticket #${intent.id} mojood nahi hai.`)
      } else if (context.confirmAction(`Delete ticket #${intent.id}: "${ticket.subject}"?`)) {
        context.updateTicket(intent.id, { removeTicket: true }, `Ticket #${intent.id} deleted from AI Command Box`)
        context.setNotice(`✓ Deleted Ticket #${intent.id}.`)
      } else {
        context.setNotice('Delete cancelled.')
      }
      return true
    }

    case 'delete':
    case 'update':
      return applyCollectionCommand(intent, context)

    case 'run-automation':
      context.runAutomationNow()
      return true

    case 'mark-notifications-read': {
      const activity = readLocalStorageValue('relay:activity', [])
      const dismissed = readLocalStorageValue('relay:dismissed-notifications', [])
      writeLocalStorageState('relay:dismissed-notifications', [
        ...new Set([...dismissed, ...activity.map((item) => item.id)]),
      ])
      context.recordActivity('Marked all notifications read from AI Command Box')
      context.setNotice('✓ All current notifications marked as read.')
      return true
    }

    // 👈 DATABASE FETCH FOR CUSTOMERS
    case 'ask-assistant': {
      const answer = await answerWorkspaceQuery(intent.question, context)
      context.setNotice(answer || `AI analyzed: “${intent.question}”`)
      return true
    }

    case 'export-report':
      context.exportReport()
      context.navigate('Reports')
      context.setNotice('✓ Ticket report exported as CSV.')
      return true

    default:
      return false
  }
}