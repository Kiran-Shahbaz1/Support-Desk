import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/database/client.js'

function testServer() {
  return { app: createApp({ prismaClient: prisma, logger: false }) }
}

test('agents, teams, and departments endpoints support listing and creating', async () => {
  const { app } = testServer()

  // Agents
  const agents = await request(app).get('/api/v1/agents').expect(200)
  assert.ok(Array.isArray(agents.body.data))
  assert.ok(agents.body.data.length >= 1)

  // Teams
  const teams = await request(app).get('/api/v1/teams').expect(200)
  assert.ok(Array.isArray(teams.body.data))
  assert.ok(teams.body.data.length >= 1)

  // Departments
  const departments = await request(app).get('/api/v1/departments').expect(200)
  assert.ok(Array.isArray(departments.body.data))
  assert.ok(departments.body.data.length >= 1)
})

test('articles, automations, settings, and auth endpoints work properly', async () => {
  const { app } = testServer()

  // Articles
  const articles = await request(app).get('/api/v1/articles').expect(200)
  assert.ok(Array.isArray(articles.body.data))

  // Automations
  const automations = await request(app).get('/api/v1/automations').expect(200)
  assert.ok(Array.isArray(automations.body.data))

  // Settings
  const settings = await request(app).get('/api/v1/settings').expect(200)
  assert.ok(typeof settings.body.data === 'object')

  // Auth /me
  const auth = await request(app).get('/api/v1/auth/me').expect(200)
  assert.equal(auth.body.data.role, 'Administrator')
})
