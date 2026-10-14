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
  { 
    id: 'rule-critical', 
    name: 'Escalate critical tickets', 
    triggerType: 'priority-high', 
    trigger: 'Priority is High', 
    actionType: 'assign-manager', 
    action: 'Assign to Kiran Shah', 
    status: 'Active', 
    runs: 18 
  },
  { 
    id: 'rule-deadline', 
    name: 'Urgent Deadline & SLA Alert', 
    triggerType: 'deadline-overdue', 
    trigger: 'Deadline or SLA breach reached / approaching', 
    actionType: 'notify-deadline', 
    action: 'Send Urgent Deadline / SLA Breach Alert', 
    status: 'Active', 
    runs: 25 
  },
  { 
    id: 'rule-sla', 
    name: 'SLA risk alert', 
    triggerType: 'sla-under-hour', 
    trigger: 'SLA has less than 60 minutes left', 
    actionType: 'notify-assignee', 
    action: 'Add a notification to the activity feed', 
    status: 'Active', 
    runs: 42 
  },
  { 
    id: 'rule-resolved', 
    name: 'Archive old resolved tickets', 
    triggerType: 'resolved-seven-days', 
    trigger: 'Resolved for at least 7 days', 
    actionType: 'archive-ticket', 
    action: 'Archive the ticket', 
    status: 'Paused', 
    runs: 8 
  },
]

export function getTriggerType(rule) {
  if (rule.triggerType) {
    const valid = [
      'priority-critical', 'priority-high', 'priority-medium', 'priority-low',
      'deadline-overdue', 'sla-under-hour', 'resolved-seven-days', 'unassigned-ticket'
    ]
    if (valid.includes(rule.triggerType)) return rule.triggerType
  }
  const triggerText = String(rule.trigger || rule.name || '').toLowerCase()
  if (/critical/i.test(triggerText)) return 'priority-critical'
  if (/high/i.test(triggerText)) return 'priority-high'
  if (/medium/i.test(triggerText)) return 'priority-medium'
  if (/low/i.test(triggerText)) return 'priority-low'
  if (/deadline|due|overdue|late|breach/i.test(triggerText)) return 'deadline-overdue'
  if (/sla|60|minute/i.test(triggerText)) return 'sla-under-hour'
  if (/resolved/i.test(triggerText)) return 'resolved-seven-days'
  if (/unassigned/i.test(triggerText)) return 'unassigned-ticket'
  return rule.triggerType || ''
}

export function getActionType(rule) {
  if (rule.actionType) return rule.actionType
  const actionText = String(rule.action || rule.name || '').toLowerCase()
  if (/archive/i.test(actionText)) return 'archive-ticket'
  if (/resolve|close/i.test(actionText)) return 'resolve-ticket'
  if (/deadline|urgent|breach/i.test(actionText)) return 'notify-deadline'
  if (/assign/i.test(actionText)) return 'assign-manager'
  if (/notify|alert/i.test(actionText)) return 'notify-assignee'
  return ''
}

export function normalizeAutomationRule(rule) {
  const triggerType = getTriggerType(rule)
  const actionType = getActionType(rule)
  return {
    ...rule,
    triggerType,
    trigger: automationTriggers.find((item) => item.value === triggerType)?.label || rule.trigger,
    actionType,
    action: automationActions.find((item) => item.value === actionType)?.label || rule.action,
  }
}

function hasSlaRisk(ticket) {
  if (/sla risk|breach|overdue/i.test([ticket.tag, ...(ticket.tags || [])].join(' '))) return true
  const match = String(ticket.sla || '').match(/(\d{1,2}):(\d{2})\s*left/i)
  if (!match) return false
  return Number(match[1]) * 60 + Number(match[2]) < 60
}

function isDeadlineApproachingOrPassed(ticket, now) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') return false
  if (hasSlaRisk(ticket)) return true
  
  if (ticket.dueDate) {
    const dueTime = new Date(ticket.dueDate).getTime()
    if (!isNaN(dueTime)) {
      if (dueTime <= now + (2 * 60 * 60 * 1000)) return true
    }
    if (/overdue|today|passed|expired/i.test(String(ticket.dueDate))) return true
  }
  return false
}

function matchesTrigger(triggerType, ticket, now) {
  const priority = String(ticket.priority || '').trim().toLowerCase()

  if (triggerType === 'priority-critical') return priority === 'critical'
  if (triggerType === 'priority-high') return priority === 'high' || priority === 'critical'
  if (triggerType === 'priority-medium') return priority === 'medium'
  if (triggerType === 'priority-low') return priority === 'low'

  if (triggerType === 'deadline-overdue') return isDeadlineApproachingOrPassed(ticket, now)
  if (triggerType === 'sla-under-hour') return ticket.status !== 'Resolved' && hasSlaRisk(ticket)

  if (triggerType === 'unassigned-ticket') {
    return !ticket.assignee || ticket.assignee.toLowerCase() === 'unassigned'
  }

  if (triggerType === 'resolved-seven-days') {
    if (ticket.status !== 'Resolved' || !ticket.resolvedAt) return false
    return now - new Date(ticket.resolvedAt).getTime() >= 7 * 24 * 60 * 60 * 1000
  }

  return false
}

/**
 * Single Ticket par Instant Rules Apply karne ka Function
 * Yeh tab chalta hai jab koi bhi ticket Edit ya Create ho
 */
export function applyRulesToSingleTicket(ticket, rules, now = Date.now()) {
  let updatedTicket = { ...ticket, automationRuns: [...(ticket.automationRuns || [])] }
  const events = []

  for (const rule of rules) {
    if (rule.status !== 'Active') continue
    const triggerType = getTriggerType(rule)
    const actionType = getActionType(rule)
    if (!triggerType || !actionType) continue

    // Check if rule condition matches the ticket
    if (matchesTrigger(triggerType, updatedTicket, now)) {
      const timestamp = new Date(now).toISOString()

      if (actionType === 'assign-manager' && updatedTicket.assignee !== 'Kiran Shah') {
        updatedTicket.assignee = 'Kiran Shah'
        events.push(`Automation: Ticket #${updatedTicket.id} auto-assigned to Kiran Shah (Matched rule: ${rule.name})`)
      }

      if (actionType === 'notify-deadline') {
        events.push(`🚨 DEADLINE ALERT: Ticket #${updatedTicket.id} is approaching its deadline!`)
        updatedTicket.tags = Array.from(new Set([...(updatedTicket.tags || []), 'SLA Alert']))
      }

      if (actionType === 'resolve-ticket' && updatedTicket.status !== 'Resolved') {
        updatedTicket.status = 'Resolved'
        updatedTicket.sla = 'Closed'
        updatedTicket.resolvedAt = timestamp
        events.push(`Automation: Ticket #${updatedTicket.id} marked as Resolved`)
      }

      if (actionType === 'archive-ticket' && updatedTicket.status === 'Resolved' && !updatedTicket.archived) {
        updatedTicket.archived = true
        updatedTicket.archivedAt = timestamp
        events.push(`Automation: Ticket #${updatedTicket.id} moved to Archives`)
      }

      if (!updatedTicket.automationRuns.includes(rule.id)) {
        updatedTicket.automationRuns.push(rule.id)
      }
    }
  }

  return { ticket: updatedTicket, events }
}

/**
 * Bulk Run - Saari tickets par rules execute karne ke liye
 */
export function runAutomationRules(tickets, rules, { ticketIds, now = Date.now() } = {}) {
  const includedIds = ticketIds ? new Set(ticketIds) : null
  const runCounts = new Map()
  let allEvents = []

  const nextTickets = tickets.map((ticket) => {
    if (includedIds && !includedIds.has(ticket.id)) return ticket

    const { ticket: processedTicket, events } = applyRulesToSingleTicket(ticket, rules, now)
    
    if (events.length > 0) {
      allEvents = [...allEvents, ...events]
      // Run count update
      for (const rule of rules) {
        if (rule.status === 'Active' && matchesTrigger(getTriggerType(rule), ticket, now)) {
          runCounts.set(rule.id, (runCounts.get(rule.id) || 0) + 1)
        }
      }
    }
    return processedTicket
  })

  const nextRules = rules.map((rule) => ({
    ...rule,
    runs: (rule.runs || 0) + (runCounts.get(rule.id) || 0)
  }))

  return { tickets: nextTickets, rules: nextRules, events: allEvents }
}