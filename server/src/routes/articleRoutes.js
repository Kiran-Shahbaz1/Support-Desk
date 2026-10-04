import { Router } from 'express'

export default function articleRoutes(articleController) {
  const router = Router()
  router.get('/', articleController.list)
  router.get('/:id', articleController.get)
  router.post('/', articleController.create)
  router.patch('/:id', articleController.update)
  router.delete('/:id', articleController.delete)
  router.post('/:id/read', articleController.read)
  return router
}
