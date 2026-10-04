import asyncHandler from '../utils/asyncHandler.js'

export default class TeamController {
  constructor(prisma) {
    this.prisma = prisma

    this.list = asyncHandler(async (_request, response) => {
      const teams = await this.prisma.team.findMany({
        include: { department: true, agents: true, tickets: true },
        orderBy: { name: 'asc' },
      })
      const result = teams.map((team) => ({
        id: team.id,
        name: team.name,
        detail: team.description || 'Support team',
        department: team.department?.name || 'Core support',
        memberCount: team.agents.length,
        ticketCount: team.tickets.length,
      }))
      response.json({ data: result })
    })

    this.create = asyncHandler(async (request, response) => {
      const { name, detail, department } = request.body
      if (!name) return response.status(400).json({ error: { message: 'Team name is required' } })

      let deptRecord = null
      if (department) {
        deptRecord = await this.prisma.department.findFirst({ where: { name: department } })
      }

      const team = await this.prisma.team.create({
        data: {
          name,
          description: detail || 'Support team',
          departmentId: deptRecord?.id || null,
        },
      })
      response.status(201).json({
        data: {
          id: team.id,
          name: team.name,
          detail: team.description,
        },
      })
    })

    this.update = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { name, detail } = request.body
      const team = await this.prisma.team.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(detail !== undefined ? { description: detail } : {}),
        },
      })
      response.json({ data: { id: team.id, name: team.name, detail: team.description } })
    })

    this.delete = asyncHandler(async (request, response) => {
      const { id } = request.params
      await this.prisma.team.delete({ where: { id } })
      response.status(204).end()
    })
  }
}
