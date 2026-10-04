import { Router } from 'express'

export default function reportRoutes(controller) {
  const router = Router()
  router.get('/summary', controller.summary)
  return router
}