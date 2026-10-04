import { Router } from 'express'

export default function departmentRoutes(departmentController) {
  const router = Router()
  router.get('/', departmentController.list)
  router.post('/', departmentController.create)
  router.patch('/:id', departmentController.update)
  router.delete('/:id', departmentController.delete)
  return router
}
