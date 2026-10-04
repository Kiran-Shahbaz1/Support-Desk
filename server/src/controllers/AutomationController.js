import asyncHandler from '../utils/asyncHandler.js'

export default class AutomationController {
  constructor(prisma) {
    this.prisma = prisma

    this.list = asyncHandler(async (_request, response) => {
      const rules = await this.prisma.automationRule.findMany({
        include: { runs: true },
        orderBy: { createdAt: 'asc' },
      })
      const result = rules.map((rule) => {
        const actionObj = typeof rule.action === 'object' && rule.action ? rule.action : {}
        return {
          id: rule.id,
          name: rule.name,
          triggerType: rule.triggerType,
          trigger: rule.description || rule.triggerType,
          actionType: rule.actionType,
          action: actionObj.label || rule.actionType,
          status: rule.active ? 'Active' : 'Paused',
          runs: rule.runs.length,
        }
      })
      response.json({ data: result })
    })

    this.create = asyncHandler(async (request, response) => {
      const { name, triggerType, trigger, actionType, action } = request.body
      if (!name) return response.status(400).json({ error: { message: 'Rule name is required' } })

      const rule = await this.prisma.automationRule.create({
        data: {
          name,
          description: trigger || triggerType,
          triggerType: triggerType || 'priority-critical',
          actionType: actionType || 'assign-manager',
          action: { label: action || actionType },
          active: true,
        },
      })
      response.status(201).json({
        data: {
          id: rule.id,
          name: rule.name,
          triggerType: rule.triggerType,
          trigger: rule.description,
          actionType: rule.actionType,
          action: action || actionType,
          status: 'Active',
          runs: 0,
        },
      })
    })

    this.update = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { name, triggerType, trigger, actionType, action, status } = request.body

      const data = {}
      if (name) data.name = name
      if (triggerType) data.triggerType = triggerType
      if (trigger) data.description = trigger
      if (actionType) data.actionType = actionType
      if (action) data.action = { label: action }
      if (status !== undefined) data.active = status === 'Active'

      const rule = await this.prisma.automationRule.update({
        where: { id },
        data,
        include: { runs: true },
      })
      response.json({
        data: {
          id: rule.id,
          name: rule.name,
          triggerType: rule.triggerType,
          trigger: rule.description,
          actionType: rule.actionType,
          action: rule.action?.label || rule.actionType,
          status: rule.active ? 'Active' : 'Paused',
          runs: rule.runs.length,
        },
      })
    })

    this.delete = asyncHandler(async (request, response) => {
      const { id } = request.params
      await this.prisma.automationRule.delete({ where: { id } })
      response.status(204).end()
    })

    this.run = asyncHandler(async (_request, response) => {
      // Find active rules
      const rules = await this.prisma.automationRule.findMany({ where: { active: true } })
      const tickets = await this.prisma.ticket.findMany({
        where: { status: { not: 'RESOLVED' } },
      })

      const events = []
      for (const rule of rules) {
        if (rule.triggerType === 'priority-critical') {
          const criticalTickets = tickets.filter((t) => t.priority === 'CRITICAL' && t.assigneeLabel !== 'Kiran Shah')
          for (const ticket of criticalTickets) {
            await this.prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                assigneeLabel: 'Kiran Shah',
                activities: {
                  create: [{ action: `Rule “${rule.name}” assigned ticket #${ticket.id} to Kiran Shah` }],
                },
              },
            })
            await this.prisma.automationRun.create({
              data: { ruleId: rule.id, ticketId: ticket.id, status: 'SUCCEEDED' },
            })
            events.push(`Rule “${rule.name}” applied to ticket #${ticket.id}`)
          }
        }
      }

      response.json({ data: { executed: events.length, events } })
    })
  }
}
