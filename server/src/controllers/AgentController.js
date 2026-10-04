import asyncHandler from '../utils/asyncHandler.js'

export default class AgentController {
  constructor(prisma) {
    this.prisma = prisma

    this.list = asyncHandler(async (_request, response) => {
      const agents = await this.prisma.agent.findMany({
        include: {
          user: true,
          team: true,
          department: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      // Get ticket counts for each agent
      const tickets = await this.prisma.ticket.findMany({
        select: { assigneeLabel: true, status: true },
      })

      const result = agents.map((agent) => {
        const name = agent.user?.name || agent.title || 'Support agent'
        const assigned = tickets.filter((t) => t.assigneeLabel === name)
        const resolved = assigned.filter((t) => t.status === 'RESOLVED').length
        return {
          id: agent.id,
          name,
          email: agent.user?.email || '',
          detail: agent.title || 'Support agent',
          team: agent.team?.name || 'Core support',
          department: agent.department?.name || 'Core support',
          assignedCount: assigned.length,
          resolvedCount: resolved,
        }
      })

      response.json({ data: result })
    })

    this.create = asyncHandler(async (request, response) => {
      const { name, detail, email, team, department } = request.body
      if (!name) return response.status(400).json({ error: { message: 'Name is required' } })

      let user = await this.prisma.user.findFirst({ where: { name } })
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            name,
            email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@supportdesk.io`,
            passwordHash: 'demo-hash',
          },
        })
      }

      let teamRecord = null
      if (team) {
        teamRecord = await this.prisma.team.findFirst({ where: { name: team } })
      }

      let deptRecord = null
      if (department) {
        deptRecord = await this.prisma.department.findFirst({ where: { name: department } })
      }

      const agent = await this.prisma.agent.create({
        data: {
          userId: user.id,
          title: detail || 'Support agent',
          teamId: teamRecord?.id || null,
          departmentId: deptRecord?.id || null,
        },
        include: { user: true, team: true, department: true },
      })

      await this.prisma.auditLog.create({
        data: {
          action: `Created agent ${name}`,
          entity: 'Agent',
          entityId: agent.id,
        },
      })

      response.status(201).json({
        data: {
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
          detail: agent.title,
          team: agent.team?.name || 'Core support',
          department: agent.department?.name || 'Core support',
        },
      })
    })

    this.update = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { name, detail } = request.body

      const agent = await this.prisma.agent.findUnique({
        where: { id },
        include: { user: true },
      })
      if (!agent) return response.status(404).json({ error: { message: 'Agent not found' } })

      if (name && agent.user) {
        await this.prisma.user.update({
          where: { id: agent.user.id },
          data: { name },
        })
      }

      const updated = await this.prisma.agent.update({
        where: { id },
        data: { title: detail !== undefined ? detail : agent.title },
        include: { user: true, team: true, department: true },
      })

      response.json({
        data: {
          id: updated.id,
          name: updated.user.name,
          email: updated.user.email,
          detail: updated.title,
        },
      })
    })

    this.delete = asyncHandler(async (request, response) => {
      const { id } = request.params
      await this.prisma.agent.delete({ where: { id } })
      response.status(204).end()
    })
  }
}
