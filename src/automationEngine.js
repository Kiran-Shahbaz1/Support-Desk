export const automationTriggers = [
  { value: 'priority-critical', label: 'Priority is Critical' },
  { value: 'priority-high', label: 'Priority is High' },
  { value: 'priority-medium', label: 'Priority is Medium' },
  { value: 'priority-low', label: 'Priority is Low' },
  { value: 'unassigned-ticket', label: 'Ticket is Unassigned' },
  { value: 'deadline-overdue', label: 'Deadline or SLA breach reached / approaching' },
  { value: 'sla-under-hour', label: 'SLA has less than 60 minutes left' },
  { value: 'resolved-seven-days', label: 'Resolved for at least 7 days' },
]

export const automationActions = [
  { value: 'assign-manager', label: 'Assign to Kiran Shah' },
  { value: 'notify-deadline', label: 'Send Urgent Deadline / SLA Breach Alert' },
  { value: 'notify-assignee', label: 'Add a notification to the activity feed' },
  { value: 'resolve-ticket', label: 'Resolve the ticket' },
  { value: 'archive-ticket', label: 'Archive the ticket' },
]

export const initialAutomationRules = [
  { id: 'rule-critical', name: 'Escalate critical tickets', trigger: 'Priority is Critical', action: 'Assign to Kiran Shah', status: 'Active', runs: 0 },
  { id: 'rule-deadline', name: 'Urgent Deadline & SLA Alert', trigger: 'Deadline or SLA breach reached', action: 'Add tag Urgent', status: 'Active', runs: 0 },
  { id: 'rule-sla', name: 'SLA risk alert', trigger: 'SLA has less than 60 minutes left', action: 'Add a notification to the activity feed', status: 'Active', runs: 0 },
  { id: 'rule-resolved', name: 'Archive old resolved tickets', trigger: 'Resolved for at least 7 days', action: 'Archive the ticket', status: 'Paused', runs: 0 },
]

export function getTriggerType(rule) {
  if (!rule) return ''
  return rule.triggerType || rule.trigger || ''
}

export function getActionType(rule) {
  if (!rule) return ''
  return rule.actionType || rule.action || ''
}

// User ka exact likha hua text preserve rakhta hai
export function normalizeAutomationRule(rule) {
  if (!rule) return null
  return {
    ...rule,
    id: rule.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: rule.name || rule.title || 'Custom Rule',
    trigger: rule.trigger || rule.triggerType || 'Priority is High',
    triggerType: rule.triggerType || rule.trigger || 'Priority is High',
    action: rule.action || rule.actionType || 'Assign to Kiran Shah',
    actionType: rule.actionType || rule.action || 'Assign to Kiran Shah',
    status: rule.status || 'Active',
    runs: typeof rule.runs === 'number' && !isNaN(rule.runs) ? rule.runs : (parseInt(rule.runs, 10) || 0)
  }
}

// Universal Trigger Matcher (Understands any custom text!)
function evaluateCustomTrigger(ticket, triggerInput = '') {
  if (!ticket || !triggerInput) return false
  const text = String(triggerInput).toLowerCase().trim()

  if (text === 'all' || text === 'always' || text.includes('all ticket') || text.includes('every ticket')) {
    return true
  }

  // 1. Priority
  if (text.includes('critical')) return ticket.priority?.toLowerCase() === 'critical'
  if (text.includes('high')) return ticket.priority?.toLowerCase() === 'high'
  if (text.includes('medium')) return ticket.priority?.toLowerCase() === 'medium'
  if (text.includes('low')) return ticket.priority?.toLowerCase() === 'low'

  // 2. Unassigned
  if (text.includes('unassigned') || text.includes('no agent') || text.includes('not assigned')) {
    return !ticket.assignee || ticket.assignee.toLowerCase() === 'unassigned'
  }

  // 3. Status
  if (text.includes('resolved')) return ticket.status?.toLowerCase() === 'resolved'
  if (text.includes('pending')) return ticket.status?.toLowerCase() === 'pending'
  if (text.includes('open')) return ticket.status?.toLowerCase() === 'open'
  if (text.includes('closed') || text.includes('close')) return ticket.status?.toLowerCase() === 'closed'

  // 4. SLA & Deadline
  if (text.includes('sla') || text.includes('deadline') || text.includes('overdue') || text.includes('breach') || text.includes('hour')) {
    return (
      ticket.tag === 'SLA risk' ||
      (Array.isArray(ticket.tags) && ticket.tags.some((t) => /sla|risk|alert|urgent/i.test(t))) ||
      /(\d{1,2}):(\d{2})\s*left/i.test(String(ticket.sla || '')) ||
      /overdue|today|breach/i.test(String(ticket.dueDate || ''))
    )
  }

  // 5. Channel
  if (text.includes('email')) return ticket.channel?.toLowerCase() === 'email'
  if (text.includes('chat')) return ticket.channel?.toLowerCase() === 'chat'
  if (text.includes('api')) return ticket.channel?.toLowerCase() === 'api'
  if (text.includes('web')) return ticket.channel?.toLowerCase().includes('web')

  // 6. Generic Text Search across all ticket fields
  const searchable = [
    ticket.subject,
    ticket.customer,
    ticket.email,
    ticket.department,
    ticket.team,
    ticket.module,
    ticket.category,
    ticket.priority,
    ticket.status,
    ticket.assignee,
    ticket.tag,
    ...(Array.isArray(ticket.tags) ? ticket.tags : [])
  ].filter(Boolean).join(' ').toLowerCase()

  const cleanKeywords = text
    .replace(/^(when|if|the|ticket|has|is)\s+/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['and', 'for', 'the', 'with', 'then', 'that'].includes(w))

  if (cleanKeywords.length > 0) {
    return cleanKeywords.some((word) => searchable.includes(word))
  }

  return false
}

// Universal Action Executor (Executes any custom text!)
function applyCustomAction(ticket, actionInput = '', ruleName = '') {
  let changed = false
  const updated = { ...ticket }
  const text = String(actionInput).toLowerCase().trim()
  let description = `Rule "${ruleName}" executed: ${actionInput}`

  // 1. Assign to Agent
  const knownAgents = ['Kiran Shah', 'Ahmed Khan', 'Sara Davis', 'Maya Patel']
  const matchedAgent = knownAgents.find((a) => text.includes(a.toLowerCase()))
  if (matchedAgent) {
    if (updated.assignee !== matchedAgent) {
      updated.assignee = matchedAgent
      changed = true
      description = `Assigned ticket #${ticket.id} to ${matchedAgent}`
    }
  } else if (text.includes('assign to') || text.includes('assign')) {
    const match = actionInput.match(/assign(?:\s+to)?\s+([A-Za-z\s]+)/i)
    if (match && match[1]?.trim()) {
      const target = match[1].trim()
      if (updated.assignee !== target) {
        updated.assignee = target
        changed = true
        description = `Assigned ticket #${ticket.id} to ${target}`
      }
    }
  }

  // 2. Add Tag
  if (text.includes('tag')) {
    const match = actionInput.match(/tag(?:\s+as|\s+to|\s*:\s*)?\s*["']?([^"']+)["']?/i)
    const newTag = match && match[1] ? match[1].trim() : 'Urgent'
    const currentTags = Array.isArray(updated.tags) ? [...updated.tags] : []
    if (!currentTags.includes(newTag)) {
      currentTags.push(newTag)
      updated.tags = currentTags
      changed = true
      description = `Added tag "${newTag}" to ticket #${ticket.id}`
    }
  }

  // 3. Status Changes
  if (text.includes('resolve')) {
    if (updated.status !== 'Resolved') {
      updated.status = 'Resolved'
      updated.sla = 'Closed'
      updated.resolvedAt = new Date().toISOString()
      changed = true
      description = `Resolved ticket #${ticket.id}`
    }
  } else if (text.includes('close')) {
    if (updated.status !== 'Closed') {
      updated.status = 'Closed'
      updated.sla = 'Closed'
      changed = true
      description = `Closed ticket #${ticket.id}`
    }
  } else if (text.includes('pending')) {
    if (updated.status !== 'Pending') {
      updated.status = 'Pending'
      changed = true
      description = `Set ticket #${ticket.id} status to Pending`
    }
  } else if (text.includes('open')) {
    if (updated.status !== 'Open') {
      updated.status = 'Open'
      changed = true
      description = `Reopened ticket #${ticket.id}`
    }
  }

  // 4. Priority Changes
  if (text.includes('priority')) {
    if (text.includes('critical') && updated.priority !== 'Critical') {
      updated.priority = 'Critical'
      changed = true
    } else if (text.includes('high') && updated.priority !== 'High') {
      updated.priority = 'High'
      changed = true
    } else if (text.includes('medium') && updated.priority !== 'Medium') {
      updated.priority = 'Medium'
      changed = true
    } else if (text.includes('low') && updated.priority !== 'Low') {
      updated.priority = 'Low'
      changed = true
    }
  }

  // 5. Archive
  if (text.includes('archive')) {
    if (!updated.archived) {
      updated.archived = true
      updated.archivedAt = new Date().toISOString()
      changed = true
      description = `Moved ticket #${ticket.id} to archive`
    }
  }

  if (!changed) {
    changed = true
    description = `Automation "${ruleName}" applied: ${actionInput}`
  }

  const currentHistory = Array.isArray(updated.history) ? [...updated.history] : []
  currentHistory.push(`Automation [${ruleName}]: ${actionInput}`)
  updated.history = currentHistory
  updated.updatedDate = new Date().toLocaleString()

  return { changed, updatedTicket: updated, description }
}

// Background Auto-Runner (Har ticket par khud chalega bina click ke)
export function runAutomationRules(tickets = [], rules = [], { ticketIds, now = Date.now() } = {}) {
  if (!Array.isArray(tickets) || tickets.length === 0 || !Array.isArray(rules) || rules.length === 0) {
    return { tickets: tickets || [], rules: rules || [], events: [] }
  }

  const includedIds = ticketIds ? new Set(ticketIds) : null
  const nextTickets = tickets.map((ticket) => {
    if (!ticket) return {}
    return {
      ...ticket,
      automationRuns: Array.isArray(ticket.automationRuns) ? [...ticket.automationRuns] : []
    }
  }).filter((t) => t && t.id)

  const runCounts = new Map()
  const events = []
  let anyTicketChanged = false

  for (const rule of rules) {
    if (!rule || rule.status === 'Paused' || rule.enabled === false) continue

    const triggerCondition = String(rule.trigger || rule.triggerType || '').trim()
    const actionToTake = String(rule.action || rule.actionType || '').trim()
    if (!triggerCondition || !actionToTake || !rule.id) continue

    const ruleExecutionKey = `${rule.id}:${triggerCondition}:${actionToTake}`

    for (let i = 0; i < nextTickets.length; i++) {
      let ticket = nextTickets[i]
      if (!ticket || !ticket.id) continue
      if (includedIds && !includedIds.has(ticket.id)) continue

      if (!evaluateCustomTrigger(ticket, triggerCondition)) continue

      // Agar ye rule is ticket par pehle execute ho chuka hai, toh dobara na chale
      if (ticket.automationRuns.includes(ruleExecutionKey)) {
        continue
      }

      const result = applyCustomAction(ticket, actionToTake, rule.name || 'Custom Rule')
      if (result.changed) {
        ticket = result.updatedTicket
        ticket.automationRuns.push(ruleExecutionKey)
        nextTickets[i] = ticket
        events.push(result.description)

        runCounts.set(rule.id, (runCounts.get(rule.id) || 0) + 1)
        anyTicketChanged = true

        sendAutomationEmail(ticket, rule.name || 'Custom Automation Rule').catch(() => {})
      }
    }
  }

  if (!anyTicketChanged || events.length === 0) {
    return { tickets, rules, events: [] }
  }

  const nextRules = rules.map((rule) => {
    if (!rule) return rule
    const additional = runCounts.get(rule.id) || 0
    if (additional > 0) {
      return {
        ...rule,
        runs: (Number(rule.runs) || 0) + additional,
        lastRun: 'Just now'
      }
    }
    return rule
  })

  return { tickets: nextTickets, rules: nextRules, events }
}

export async function sendAutomationEmail(ticket, ruleName) {
  try {
    const backendUrl = 'http://localhost:5001'
    const response = await fetch(`${backendUrl}/api/notify-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket,
        ruleName: ruleName || 'Custom Automation Rule',
        recipient: ticket?.email || 'on-call-agent@support.local'
      })
    })

    const data = await response.json()
    if (data?.previewUrl) {
      console.log(`%c📨 EMAIL SENT FOR TICKET #${ticket.id}! Preview: ${data.previewUrl}`, 'color: #10b981; font-weight: bold;')
    }
  } catch (error) {
    // Silent catch
  }
}