import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/database/client.js'

function testServer() {
  return { app: createApp({ prismaClient: prisma, logger: false }), database: prisma }
}

test('health endpoint responds without coupling to the frontend', async () => {
  const { app } = testServer()
  const response = await request(app).get('/health').expect(200)
  assert.deepEqual(response.body, { status: 'ok' })
  assert.ok(response.headers['x-request-id'])
})

test('ticket CRUD persists fields, comments, activity, customer rollups, and reports', async () => {
  const { app } = testServer()
  const created = await request(app).post('/api/v1/tickets').send({
    subject: 'Cannot sign in',
    customer: 'Mina Khan',
    email: 'mina@example.com',
    description: 'The sign-in page returns an error.',
    priority: 'High',
    assignee: 'Sara Davis',
    tags: ['login', 'urgent'],
  }).expect(201)
  const id = created.body.data.id
  assert.equal(created.body.data.status, 'Open')
  assert.deepEqual(created.body.data.tags, ['login', 'urgent'])

  const list = await request(app).get('/api/v1/tickets?priority=High&search=sign').expect(200)
  assert.ok(list.body.data.total >= 1)
  assert.ok(list.body.data.items.some((item) => item.id === id))

  const updated = await request(app).patch(`/api/v1/tickets/${id}`).send({ status: 'Resolved' }).expect(200)
  assert.equal(updated.body.data.status, 'Resolved')
  assert.ok(updated.body.data.resolvedAt)

  const comment = await request(app).post(`/api/v1/tickets/${id}/comments`).send({ body: 'Please retry now.', visibility: 'internal' }).expect(201)
  assert.equal(comment.body.data.visibility, 'internal')
  const detail = await request(app).get(`/api/v1/tickets/${id}`).expect(200)
  assert.ok(detail.body.data.comments.some((c) => c.body === 'Please retry now.'))
  assert.ok((await request(app).get(`/api/v1/tickets/${id}/activity`).expect(200)).body.data.length >= 2)

  const customers = await request(app).get('/api/v1/customers').expect(200)
  assert.ok(customers.body.data.some((c) => c.name === 'Mina Khan'))
  const report = await request(app).get('/api/v1/reports/summary').expect(200)
  assert.ok(report.body.data.resolved >= 1)

  await request(app).delete(`/api/v1/tickets/${id}`).expect(204)
  await request(app).get(`/api/v1/tickets/${id}`).expect(404)
})

test('invalid ticket input and missing records return structured errors', async () => {
  const { app } = testServer()
  const invalid = await request(app).post('/api/v1/tickets').send({ subject: '', customer: 'Mina', description: '' }).expect(400)
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR')
  assert.ok(invalid.body.error.requestId)

  const missing = await request(app).get('/api/v1/tickets/999999').expect(404)
  assert.equal(missing.body.error.code, 'TICKET_NOT_FOUND')
})

test('disallowed browser origins receive a structured forbidden response', async () => {
  const { app } = testServer()
  const response = await request(app).get('/health').set('Origin', 'https://untrusted.example').expect(403)
  assert.equal(response.body.error.code, 'CORS_ORIGIN_DENIED')
  assert.ok(response.body.error.requestId)
})