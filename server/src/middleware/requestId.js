import { randomUUID } from 'node:crypto'

export default function requestId(request, response, next) {
  request.id = randomUUID()
  response.setHeader('x-request-id', request.id)
  next()
}