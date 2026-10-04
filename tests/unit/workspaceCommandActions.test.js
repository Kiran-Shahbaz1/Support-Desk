import assert from 'node:assert/strict'
import test from 'node:test'
import { applyWorkspaceCommand } from '../../src/workspaceCommandActions.js'
import { parseWorkspaceCommand } from '../../src/workspaceCommand.js'

function createContext() {
  const storage = new Map()
  const storageEvents = []
  const notices = []
  const activities = []
  const navigation = []
  let tickets = [{ id: 1042, subject: 'Invoice export', customer: 'Maya Chen', priority: 'Critical', status: 'Open', assignee: 'Ahmed Khan', sla: '00:42 left', tags: [], comments: [], history: [] }]
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail }
  }
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    dispatchEvent: (event) => storageEvents.push(event),
  }
  const context = {
    get tickets() { return tickets },
    notices,
    activities,
    navigation,
    storage,
    storageEvents,
    navigate: (view) => navigation.push(view),
    openTicketSearch: (query) => navigation.push(`Tickets:${query}`),
    setNotice: (notice) => notices.push(notice),
    recordActivity: (activity) => activities.push(activity),
    confirmAction: () => true,
    saveWithAutomation: (nextTickets) => { tickets = nextTickets },
    updateTicket: (id, changes) => { tickets = tickets.map((ticket) => ticket.id === id ? { ...ticket, ...changes } : ticket) },
    runAutomationNow: () => notices.push('Automation run'),
    answerQuestion: () => 'Workspace answer',
    exportReport: () => notices.push('Report exported'),
  }
  return context
}

test('Command Box creates, edits, and deletes a persistent agent record', () => {
  const context = createContext()
  applyWorkspaceCommand(parseWorkspaceCommand('create agent name="Mina Shah" role="Support agent"'), context)
  let agents = JSON.parse(context.storage.get('relay:agents'))
  assert.equal(agents[0].name, 'Mina Shah')
  assert.equal(context.navigation.at(-1), 'Agents')
  assert.equal(context.storageEvents.at(-1).detail.key, 'relay:agents')

  applyWorkspaceCommand(parseWorkspaceCommand('edit agent "Mina Shah" role="Senior agent"'), context)
  agents = JSON.parse(context.storage.get('relay:agents'))
  assert.equal(agents[0].detail, 'Senior agent')
  assert.equal(agents[0].name, 'Mina Shah')

  applyWorkspaceCommand(parseWorkspaceCommand('delete agent "Mina Shah"'), context)
  assert.equal(JSON.parse(context.storage.get('relay:agents')).some((agent) => agent.name === 'Mina Shah'), false)
  assert.equal(JSON.parse(context.storage.get('relay:agents')).length, 3)
})

test('Command Box creates tickets through the automation-aware ticket path', () => {
  const context = createContext()
  applyWorkspaceCommand(parseWorkspaceCommand('create ticket subject="Login issue" customer="Ali Khan" description="Cannot sign in" priority=High assignee="Sara Davis"'), context)

  assert.equal(context.tickets[0].id, 1043)
  assert.equal(context.tickets[0].subject, 'Login issue')
  assert.equal(context.tickets[0].assignee, 'Sara Davis')
  assert.equal(context.navigation.at(-1), 'Tickets:1043')
  assert.ok(context.activities.some((activity) => activity.includes('Created ticket #1043')))
})

test('Command Box setting changes publish same-tab updates', () => {
  const context = createContext()
  window.localStorage.setItem('relay:settings', JSON.stringify({ email: true, realtime: true, sla: true }))
  applyWorkspaceCommand(parseWorkspaceCommand('turn off email notifications'), context)

  assert.equal(JSON.parse(context.storage.get('relay:settings')).email, false)
  assert.equal(context.storageEvents.at(-1).detail.key, 'relay:settings')
  assert.equal(context.notices.at(-1), 'email notifications turned off.')
})