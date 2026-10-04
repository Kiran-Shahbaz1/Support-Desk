import asyncHandler from '../utils/asyncHandler.js'

export default class DepartmentController {
  constructor(prisma) {
    this.prisma = prisma

    this.list = asyncHandler(async (_request, response) => {
      const departments = await this.prisma.department.findMany({
        include: { teams: true, tickets: true },
        orderBy: { name: 'asc' },
      })
      const result = departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        detail: dept.description || 'Ticket routing queue',
        teamCount: dept.teams.length,
        ticketCount: dept.tickets.length,
      }))
      response.json({ data: result })
    })

    this.create = asyncHandler(async (request, response) => {
      const { name, detail } = request.body
      if (!name) return response.status(400).json({ error: { message: 'Department name is required' } })

      const dept = await this.prisma.department.create({
        data: {
          name,
          description: detail || 'Ticket routing queue',
        },
      })
      response.status(201).json({
        data: {
          id: dept.id,
          name: dept.name,
          detail: dept.description,
        },
      })
    })

    this.update = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { name, detail } = request.body
      const dept = await this.prisma.department.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(detail !== undefined ? { description: detail } : {}),
        },
      })
      response.json({ data: { id: dept.id, name: dept.name, detail: dept.description } })
    })

    this.delete = asyncHandler(async (request, response) => {
      const { id } = request.params
      await this.prisma.department.delete({ where: { id } })
      response.status(204).end()
    })
  }
}
