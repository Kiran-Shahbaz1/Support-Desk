export const automationTriggers = [
  { value: 'priority-critical', label: 'Priority is Critical' },
  { value: 'sla-under-hour', label: 'SLA has less than 60 minutes left' },
  { value: 'resolved-seven-days', label: 'Resolved for at least 7 days' },
]

export const automationActions = [
  { value: 'assign-manager', label: 'Assign to Kiran Shah' },
  { value: 'notify-assignee', label: 'Add a notification to the activity feed' },
  { value: 'resolve-ticket', label: 'Resolve the ticket' },
  { value: 'archive-ticket', label: 'Archive the ticket' },
]

export const initialAutomationRules = [
  { id: 'rule-critical', name: 'Escalate critical tickets', triggerType: 'priority-critical', trigger: 'Priority is Critical', actionType: 'assign-manager', action: 'Assign to Kiran Shah', status: 'Active', runs: 18 },
  { id: 'rule-sla', name: 'SLA risk alert', triggerType: 'sla-under-hour', trigger: 'SLA has less than 60 minutes left', actionType: 'notify-assignee', action: 'Add a notification to the activity feed', status: 'Active', runs: 42 },
  { id: 'rule-resolved', name: 'Archive old resolved tickets', triggerType: 'resolved-seven-days', trigger: 'Resolved for at least 7 days', actionType: 'archive-ticket', action: 'Archive the ticket', status: 'Paused', runs: 8 },
]

export function getTriggerType(rule) {
  if (rule.triggerType) return rule.triggerType
  if (/critical/i.test(rule.trigger || '')) return 'priority-critical'
  if (/resolved/i.test(rule.trigger || '')) return 'resolved-seven-days'
  if (/sla|60|minute/i.test(rule.trigger || '')) return 'sla-under-hour'
  return ''
}

export function getActionType(rule) {
  if (rule.actionType) return rule.actionType
  if (/archive/i.test(rule.action || '')) return 'archive-ticket'
  if (/resolve|close/i.test(rule.action || '')) return 'resolve-ticket'
  if (/^\s*assign(?:ed)?\b/i.test(rule.action || '')) return 'assign-manager'
  if (/^\s*(?:notify|alert)\b/i.test(rule.action || '')) return 'notify-assignee'
  if (/notify|alert/i.test(rule.action || '')) return 'notify-assignee'
  if (/\bassign(?:ed)?\b/i.test(rule.action || '')) return 'assign-manager'
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
  if (/sla risk/i.test([ticket.tag, ...(ticket.tags || [])].join(' '))) return true
  const match = String(ticket.sla || '').match(/(\d{1,2}):(\d{2})\s*left/i)
  if (!match) return false
  return Number(match[1]) * 60 + Number(match[2]) < 60
}

function matchesTrigger(triggerType, ticket, now) {
  if (triggerType === 'priority-critical') return ticket.priority === 'Critical'
  if (triggerType === 'sla-under-hour') return ticket.status !== 'Resolved' && hasSlaRisk(ticket)
  if (triggerType === 'resolved-seven-days') {
    if (ticket.status !== 'Resolved' || !ticket.resolvedAt) return false
    return now - new Date(ticket.resolvedAt).getTime() >= 7 * 24 * 60 * 60 * 1000
  }
  return false
}

export function runAutomationRules(tickets, rules, { ticketIds, now = Date.now() } = {}) {
  const includedIds = ticketIds ? new Set(ticketIds) : null
  const nextTickets = tickets.map((ticket) => ({ ...ticket, automationRuns: [...(ticket.automationRuns || [])] }))
  const runCounts = new Map()
  const events = []

  for (const rule of rules) {
    if (rule.status !== 'Active') continue
    const triggerType = getTriggerType(rule)
    const actionType = getActionType(rule)
    if (!triggerType || !actionType || !rule.id) continue

    for (const ticket of nextTickets) {
      if (includedIds && !includedIds.has(ticket.id)) continue
      if (ticket.automationRuns.includes(rule.id) || !matchesTrigger(triggerType, ticket, now)) continue

      const timestamp = new Date(now).toISOString()
      const history = [...(ticket.history || [])]
      if (actionType === 'assign-manager') ticket.assignee = 'Kiran Shah'
      if (actionType === 'notify-assignee') events.push(`Automation “${rule.name}” notified ${ticket.assignee} about ticket #${ticket.id}`)
      if (actionType === 'resolve-ticket') {
        ticket.status = 'Resolved'
        ticket.sla = 'Closed'
        ticket.resolvedAt = ticket.resolvedAt || timestamp
      }
      if (actionType === 'archive-ticket' && ticket.status === 'Resolved') {
        ticket.archived = true
        ticket.archivedAt = timestamp
      }

      ticket.automationRuns.push(rule.id)
      ticket.history = [...history, `Automation “${rule.name}” applied: ${rule.action}`]
      ticket.updatedDate = new Date(now).toLocaleString()
      runCounts.set(rule.id, (runCounts.get(rule.id) || 0) + 1)
      events.push(`Automation “${rule.name}” applied to ticket #${ticket.id}: ${rule.action}`)
    }
  }

  const nextRules = rules.map((rule) => ({ ...rule, runs: (rule.runs || 0) + (runCounts.get(rule.id) || 0) }))
  return { tickets: nextTickets, rules: nextRules, events }
}