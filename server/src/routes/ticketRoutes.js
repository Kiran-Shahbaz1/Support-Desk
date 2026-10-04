import { Router } from 'express'
import validateRequest from '../middleware/validateRequest.js'
import { commentCreateSchema, ticketCreateSchema, ticketIdSchema, ticketListSchema, ticketUpdateSchema } from '../validators/ticketSchemas.js'

export default function ticketRoutes(controller) {
  const router = Router()
  router.get('/', validateRequest({ query: ticketListSchema }), controller.list)
  router.post('/', validateRequest({ body: ticketCreateSchema }), controller.create)
  router.get('/:id/activity', validateRequest({ params: ticketIdSchema }), controller.activity)
  router.post('/:id/comments', validateRequest({ params: ticketIdSchema, body: commentCreateSchema }), controller.addComment)
  router.get('/:id', validateRequest({ params: ticketIdSchema }), controller.get)
  router.patch('/:id', validateRequest({ params: ticketIdSchema, body: ticketUpdateSchema }), controller.update)
  router.delete('/:id', validateRequest({ params: ticketIdSchema }), controller.delete)
  return router
}