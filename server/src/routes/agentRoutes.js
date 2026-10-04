import { Router } from 'express'

export default function agentRoutes(agentController) {
  const router = Router()
  router.get('/', agentController.list)
  router.post('/', agentController.create)
  router.patch('/:id', agentController.update)
  router.delete('/:id', agentController.delete)
  return router
}
