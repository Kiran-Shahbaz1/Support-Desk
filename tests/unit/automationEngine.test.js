import assert from 'node:assert/strict'
import test from 'node:test'
import { getActionType, getTriggerType, runAutomationRules } from '../../src/automationEngine.js'

const timestamp = Date.parse('2026-10-01T12:00:00.000Z')

test('critical-priority rules assign the matching ticket and record an event', () => {
  const rules = [{ id: 'critical', name: 'Escalate critical', triggerType: 'priority-critical', actionType: 'assign-manager', action: 'Assign to Kiran Shah', status: 'Active', runs: 0 }]
  const tickets = [{ id: 1, priority: 'Critical', status: 'Open', assignee: 'Sara Davis', automationRuns: [] }]

  const result = runAutomationRules(tickets, rules, { now: timestamp })

  assert.equal(result.tickets[0].assignee, 'Kiran Shah')
  assert.deepEqual(result.tickets[0].automationRuns, ['critical'])
  assert.equal(result.rules[0].runs, 1)
  assert.match(result.events[0], /ticket #1/)
})

test('SLA rules notify only tickets with less than an hour remaining', () => {
  const rules = [{ id: 'sla', name: 'SLA reminder', triggerType: 'sla-under-hour', actionType: 'notify-assignee', action: 'Notify assignee', status: 'Active', runs: 0 }]
  const tickets = [
    { id: 1, priority: 'High', status: 'Open', assignee: 'Sara Davis', sla: '00:42 left', tags: [], automationRuns: [] },
    { id: 2, priority: 'High', status: 'Open', assignee: 'Kiran Shah', sla: '02:18 left', tags: [], automationRuns: [] },
  ]

  const result = runAutomationRules(tickets, rules, { now: timestamp })

  assert.equal(result.events.filter((event) => event.includes('notified Sara Davis')).length, 1)
  assert.equal(result.tickets.filter((ticket) => ticket.automationRuns.includes('sla')).length, 1)
  assert.deepEqual(result.tickets[0].automationRuns, ['sla'])
  assert.deepEqual(result.tickets[1].automationRuns, [])
})

test('archive rules require a resolved ticket to be at least seven days old', () => {
  const rules = [{ id: 'archive', name: 'Archive resolved', triggerType: 'resolved-seven-days', actionType: 'archive-ticket', action: 'Archive the ticket', status: 'Active', runs: 0 }]
  const tickets = [
    { id: 1, status: 'Resolved', resolvedAt: new Date(timestamp - 8 * 86400000).toISOString(), automationRuns: [] },
    { id: 2, status: 'Resolved', resolvedAt: new Date(timestamp - 2 * 86400000).toISOString(), automationRuns: [] },
    { id: 3, status: 'Open', resolvedAt: new Date(timestamp - 9 * 86400000).toISOString(), automationRuns: [] },
  ]

  const result = runAutomationRules(tickets, rules, { now: timestamp })

  assert.equal(result.tickets[0].archived, true)
  assert.equal(result.tickets[1].archived, undefined)
  assert.equal(result.tickets[2].archived, undefined)
})

test('resolve action changes status, closes SLA, and records ticket history', () => {
  const rules = [{ id: 'resolve', name: 'Resolve critical', triggerType: 'priority-critical', actionType: 'resolve-ticket', action: 'Resolve the ticket', status: 'Active', runs: 0 }]
  const tickets = [{ id: 4, priority: 'Critical', status: 'Open', sla: '00:42 left', history: [], automationRuns: [] }]

  const result = runAutomationRules(tickets, rules, { now: timestamp })

  assert.equal(result.tickets[0].status, 'Resolved')
  assert.equal(result.tickets[0].sla, 'Closed')
  assert.ok(result.tickets[0].resolvedAt)
  assert.match(result.tickets[0].history[0], /Resolve the ticket/)
})

test('paused and previously applied rules do not execute again', () => {
  const rules = [
    { id: 'paused', name: 'Paused', triggerType: 'priority-critical', actionType: 'assign-manager', action: 'Assign', status: 'Paused', runs: 0 },
    { id: 'already-ran', name: 'Already ran', triggerType: 'priority-critical', actionType: 'notify-assignee', action: 'Notify', status: 'Active', runs: 1 },
  ]
  const tickets = [{ id: 1, priority: 'Critical', status: 'Open', assignee: 'Sara Davis', automationRuns: ['already-ran'] }]

  const result = runAutomationRules(tickets, rules, { now: timestamp })

  assert.equal(result.events.length, 0)
  assert.equal(result.tickets[0].assignee, 'Sara Davis')
  assert.deepEqual(result.tickets[0].automationRuns, ['already-ran'])
})

test('legacy rule labels migrate notification separately from assignment', () => {
  assert.equal(getTriggerType({ trigger: 'Less than 60 minutes remaining' }), 'sla-under-hour')
  assert.equal(getActionType({ action: 'Notify assignee and manager' }), 'notify-assignee')
  assert.equal(getActionType({ action: 'Assign to Support Manager + notify' }), 'assign-manager')
})