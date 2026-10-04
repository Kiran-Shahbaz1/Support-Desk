import { Router } from 'express'

export default function automationRoutes(automationController) {
  const router = Router()
  router.get('/', automationController.list)
  router.post('/', automationController.create)
  router.post('/run', automationController.run)
  router.patch('/:id', automationController.update)
  router.delete('/:id', automationController.delete)
  return router
}
