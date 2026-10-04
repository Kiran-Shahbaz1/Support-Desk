import { Router } from 'express'

export default function teamRoutes(teamController) {
  const router = Router()
  router.get('/', teamController.list)
  router.post('/', teamController.create)
  router.patch('/:id', teamController.update)
  router.delete('/:id', teamController.delete)
  return router
}
