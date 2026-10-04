import { Router } from 'express'

export default function customerRoutes(controller) {
  const router = Router()
  router.get('/', controller.list)
  router.post('/', controller.create)
  return router
}