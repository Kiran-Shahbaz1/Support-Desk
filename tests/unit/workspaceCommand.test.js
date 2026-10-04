import assert from 'node:assert/strict'
import test from 'node:test'
import { parseWorkspaceCommand } from '../../src/workspaceCommand.js'

test('navigation and new-ticket commands resolve to app views', () => {
  assert.deepEqual(parseWorkspaceCommand('open customers'), { type: 'navigate', view: 'Customers' })
  assert.deepEqual(parseWorkspaceCommand('open create ticket'), { type: 'open-create-ticket' })
  assert.deepEqual(parseWorkspaceCommand('go to knowledge base'), { type: 'navigate', view: 'Knowledge Base' })
})

test('ticket create supports quoted values and legacy natural phrasing', () => {
  assert.deepEqual(parseWorkspaceCommand('create ticket subject="Login issue" customer="Ali Khan" description="Cannot sign in" priority=High assignee="Sara Davis"'), {
    type: 'create',
    entity: 'ticket',
    fields: { subject: 'Login issue', customer: 'Ali Khan', description: 'Cannot sign in', priority: 'High', assignee: 'Sara Davis' },
  })
  assert.deepEqual(parseWorkspaceCommand('Create a high-priority ticket for Ali Khan regarding login issue and assign it to Sara Davis'), {
    type: 'create',
    entity: 'ticket',
    fields: { priority: 'high', customer: 'Ali Khan', subject: 'login issue', assignee: 'Sara Davis', description: 'login issue' },
  })
})

test('ticket mutations parse assignment, status, comments, and deletion', () => {
  assert.deepEqual(parseWorkspaceCommand('assign ticket #1042 to "Sara Davis"'), { type: 'assign-ticket', id: 1042, assignee: 'Sara Davis' })
  assert.deepEqual(parseWorkspaceCommand('update ticket #1042 status=Resolved'), { type: 'update-ticket', id: 1042, fields: { status: 'Resolved' } })
  assert.deepEqual(parseWorkspaceCommand('resolve ticket #1042'), { type: 'update-ticket', id: 1042, fields: { status: 'Resolved' } })
  assert.deepEqual(parseWorkspaceCommand('comment ticket #1042 "Please retry now"'), { type: 'add-comment', id: 1042, body: 'Please retry now' })
  assert.deepEqual(parseWorkspaceCommand('delete ticket #1042'), { type: 'delete-ticket', id: 1042 })
  const archive = parseWorkspaceCommand('archive ticket #1042')
  assert.equal(archive.type, 'update-ticket')
  assert.equal(archive.id, 1042)
  assert.equal(archive.fields.archived, true)
  assert.ok(Date.parse(archive.fields.archivedAt))
})

test('management create/edit/delete intents preserve quoted record names', () => {
  assert.deepEqual(parseWorkspaceCommand('create agent name="Mina Shah" role="Support agent"'), { type: 'create', entity: 'agent', fields: { name: 'Mina Shah', role: 'Support agent' } })
  assert.deepEqual(parseWorkspaceCommand('edit article "Configure SSO" category=Security'), { type: 'update', entity: 'article', name: 'Configure SSO', fields: { category: 'Security' } })
  assert.deepEqual(parseWorkspaceCommand('delete team "Core support"'), { type: 'delete', entity: 'team', name: 'Core support' })
})

test('settings, notifications, automation, reports, and assistant commands parse', () => {
  assert.deepEqual(parseWorkspaceCommand('turn off email notifications'), { type: 'set-setting', name: 'email notifications', enabled: false })
  assert.deepEqual(parseWorkspaceCommand('mark all notifications read'), { type: 'mark-notifications-read' })
  assert.deepEqual(parseWorkspaceCommand('run automation'), { type: 'run-automation' })
  assert.deepEqual(parseWorkspaceCommand('export report'), { type: 'export-report' })
  assert.deepEqual(parseWorkspaceCommand('ask why is ticket #1042 open'), { type: 'ask-assistant', question: 'why is ticket #1042 open' })
})