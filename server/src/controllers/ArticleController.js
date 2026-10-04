import asyncHandler from '../utils/asyncHandler.js'

export default class ArticleController {
  constructor(prisma) {
    this.prisma = prisma

    this.list = asyncHandler(async (request, response) => {
      const search = request.query.search?.trim()
      const where = search ? {
        OR: [
          { title: { contains: search } },
          { category: { contains: search } },
          { body: { contains: search } },
        ],
      } : {}

      const articles = await this.prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
      response.json({ data: articles })
    })

    this.get = asyncHandler(async (request, response) => {
      const { id } = request.params
      const article = await this.prisma.article.findUnique({ where: { id } })
      if (!article) return response.status(404).json({ error: { message: 'Article not found' } })
      response.json({ data: article })
    })

    this.create = asyncHandler(async (request, response) => {
      const { title, category, body } = request.body
      if (!title || !category || !body) {
        return response.status(400).json({ error: { message: 'Title, category, and body are required' } })
      }
      const article = await this.prisma.article.create({
        data: { title, category, body },
      })
      response.status(201).json({ data: article })
    })

    this.update = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { title, category, body } = request.body
      const article = await this.prisma.article.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(category ? { category } : {}),
          ...(body ? { body } : {}),
        },
      })
      response.json({ data: article })
    })

    this.delete = asyncHandler(async (request, response) => {
      const { id } = request.params
      await this.prisma.article.delete({ where: { id } })
      response.status(204).end()
    })

    this.read = asyncHandler(async (request, response) => {
      const { id } = request.params
      const article = await this.prisma.article.update({
        where: { id },
        data: { reads: { increment: 1 } },
      })
      response.json({ data: article })
    })
  }
}
