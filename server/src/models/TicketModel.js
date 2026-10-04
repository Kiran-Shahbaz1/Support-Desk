function mapStatusToPrisma(status) {
  if (!status) return undefined
  const upper = String(status).toUpperCase()
  if (['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].includes(upper)) return upper
  return 'OPEN'
}

function mapStatusFromPrisma(status) {
  if (!status) return 'Open'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function mapPriorityToPrisma(priority) {
  if (!priority) return undefined
  const upper = String(priority).toUpperCase()
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(upper)) return upper
  return 'MEDIUM'
}

function mapPriorityFromPrisma(priority) {
  if (!priority) return 'Medium'
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
}

export function serializeTicket(ticket) {
  if (!ticket) return null

  const comments = (ticket.comments || []).map((c) => ({
    id: c.id,
    body: c.body,
    author: c.author?.name || 'Workspace administrator',
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    visibility: c.visibility === 'INTERNAL' ? 'internal' : 'public',
  }))

  const internalNotes = (ticket.internalNotes || []).map((n) => ({
    id: n.id,
    body: n.body,
    author: n.author?.name || 'Workspace administrator',
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
    visibility: 'internal',
  }))

  const allComments = [...comments, ...internalNotes]

  const tags = (ticket.tags || []).map((t) => (t.tag ? t.tag.name : t.name || String(t)))
  const history = (ticket.activities || []).map((a) => a.action)
  const attachments = (ticket.attachments || []).map((a) => a.fileName)
  const customerName = ticket.customer?.name || ticket.customerId || 'Customer'
  const customerEmail = ticket.customer?.email || ''
  const initials = customerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CU'

  return {
    id: ticket.id,
    subject: ticket.subject,
    customer: customerName,
    initials,
    email: customerEmail,
    description: ticket.description,
    module: ticket.module,
    category: ticket.category,
    priority: mapPriorityFromPrisma(ticket.priority),
    status: mapStatusFromPrisma(ticket.status),
    assignee: ticket.assigneeLabel || ticket.assignee?.user?.name || 'Unassigned',
    department: ticket.departmentLabel || ticket.department?.name || 'Core support',
    team: ticket.teamLabel || ticket.team?.name || 'Core support',
    channel: ticket.channel ? (ticket.channel.charAt(0).toUpperCase() + ticket.channel.slice(1).toLowerCase()) : 'Web form',
    sla: ticket.sla || 'Standard',
    dueDate: ticket.dueAt ? ticket.dueAt.toISOString() : (ticket.sla ? `${ticket.sla}` : 'Not scheduled'),
    tag: tags[0] || 'General',
    tags,
    attachments,
    comments: allComments,
    publicComments: comments,
    internalNotes,
    history,
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : null,
    archived: Boolean(ticket.archivedAt),
    archivedAt: ticket.archivedAt ? new Date(ticket.archivedAt).toISOString() : null,
    created: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Just now',
    createdDate: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
    updatedDate: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
  }
}

export default class TicketModel {
  constructor(database) {
    this.database = database
  }

  async list(filters = {}) {
    const where = {}

    if (filters.status) {
      where.status = mapStatusToPrisma(filters.status)
    }
    if (filters.priority) {
      where.priority = mapPriorityToPrisma(filters.priority)
    }
    if (filters.assignee) {
      where.assigneeLabel = { contains: filters.assignee }
    }
    if (filters.customer) {
      where.customer = { name: { contains: filters.customer } }
    }
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search } },
        { description: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { customer: { email: { contains: filters.search } } },
      ]
    }

    const limit = filters.limit ? Number(filters.limit) : 50
    const offset = filters.offset ? Number(filters.offset) : 0

    const [total, items] = await Promise.all([
      this.database.ticket.count({ where }),
      this.database.ticket.findMany({
        where,
        include: {
          customer: true,
          tags: { include: { tag: true } },
          comments: { orderBy: { createdAt: 'asc' } },
          internalNotes: { orderBy: { createdAt: 'asc' } },
          attachments: true,
          activities: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
      }),
    ])

    return {
      items: items.map(serializeTicket),
      total,
      limit,
      offset,
    }
  }

  async getById(id) {
    const ticket = await this.database.ticket.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        tags: { include: { tag: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        internalNotes: { orderBy: { createdAt: 'asc' } },
        attachments: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    })
    return serializeTicket(ticket)
  }

  async create(input) {
    let customer = null
    if (input.customer) {
      customer = await this.database.customer.findFirst({
        where: {
          OR: [
            { name: input.customer },
            ...(input.email ? [{ email: input.email }] : []),
          ],
        },
      })
      if (!customer) {
        customer = await this.database.customer.create({
          data: {
            name: input.customer,
            email: input.email || null,
          },
        })
      }
    } else {
      customer = await this.database.customer.findFirst()
      if (!customer) {
        customer = await this.database.customer.create({
          data: { name: 'Walk-in customer', email: 'customer@example.com' },
        })
      }
    }

    const tagConnectOrCreate = (input.tags || []).map((name) => ({
      tag: {
        connectOrCreate: {
          where: { name },
          create: { name },
        },
      },
    }))

    const channelUpper = (input.channel || 'WEB').toUpperCase()
    const validChannel = ['WEB', 'EMAIL', 'CHAT', 'PHONE', 'API'].includes(channelUpper) ? channelUpper : 'WEB'

    const ticket = await this.database.ticket.create({
      data: {
        subject: input.subject,
        description: input.description,
        module: input.module || 'General',
        category: input.category || 'General inquiry',
        priority: mapPriorityToPrisma(input.priority) || 'MEDIUM',
        status: mapStatusToPrisma(input.status) || 'OPEN',
        channel: validChannel,
        sla: input.sla || 'Standard',
        dueAt: input.dueDate ? new Date(input.dueDate) : null,
        customerId: customer.id,
        assigneeLabel: input.assignee || 'Unassigned',
        departmentLabel: input.department || 'Core support',
        teamLabel: input.team || 'Core support',
        tags: { create: tagConnectOrCreate },
        resolvedAt: input.status === 'Resolved' ? new Date() : null,
        activities: {
          create: [
            { action: 'Ticket created' },
            ...(input.assignee && input.assignee !== 'Unassigned' ? [{ action: `Assigned to ${input.assignee}` }] : []),
          ],
        },
      },
      include: {
        customer: true,
        tags: { include: { tag: true } },
        comments: true,
        internalNotes: true,
        attachments: true,
        activities: true,
      },
    })

    return serializeTicket(ticket)
  }

  async update(id, changes) {
    const existing = await this.database.ticket.findUnique({
      where: { id: Number(id) },
      include: { customer: true },
    })
    if (!existing) return null

    const data = {}
    const activities = []

    if (changes.subject !== undefined) data.subject = changes.subject
    if (changes.description !== undefined) data.description = changes.description
    if (changes.module !== undefined) data.module = changes.module
    if (changes.category !== undefined) data.category = changes.category
    if (changes.priority !== undefined) {
      const nextPri = mapPriorityToPrisma(changes.priority)
      if (nextPri !== existing.priority) {
        data.priority = nextPri
        activities.push(`Priority changed to ${changes.priority}`)
      }
    }
    if (changes.status !== undefined) {
      const nextStat = mapStatusToPrisma(changes.status)
      if (nextStat !== existing.status) {
        data.status = nextStat
        if (nextStat === 'RESOLVED') {
          data.resolvedAt = new Date()
          data.sla = 'Closed'
        } else if (existing.status === 'RESOLVED') {
          data.resolvedAt = null
        }
        activities.push(`Status changed to ${changes.status}`)
      }
    }
    if (changes.assignee !== undefined && changes.assignee !== existing.assigneeLabel) {
      data.assigneeLabel = changes.assignee
      activities.push(`Assigned to ${changes.assignee}`)
    }
    if (changes.department !== undefined) data.departmentLabel = changes.department
    if (changes.team !== undefined) data.teamLabel = changes.team
    if (changes.sla !== undefined) data.sla = changes.sla
    if (changes.dueDate !== undefined) data.dueAt = changes.dueDate ? new Date(changes.dueDate) : null
    if (changes.archived !== undefined) {
      data.archivedAt = changes.archived ? new Date() : null
      activities.push(changes.archived ? 'Ticket archived' : 'Ticket unarchived')
    }

    if (activities.length > 0) {
      data.activities = {
        create: activities.map((action) => ({ action })),
      }
    }

    const updated = await this.database.ticket.update({
      where: { id: Number(id) },
      data,
      include: {
        customer: true,
        tags: { include: { tag: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        internalNotes: { orderBy: { createdAt: 'asc' } },
        attachments: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    })
    return serializeTicket(updated)
  }

  async delete(id) {
    try {
      await this.database.ticket.delete({ where: { id: Number(id) } })
      return true
    } catch (error) {
      if (error.code === 'P2025') return false
      throw error
    }
  }

  async addComment(id, input) {
    const isInternal = input.visibility === 'internal'
    if (isInternal) {
      const note = await this.database.internalNote.create({
        data: {
          ticketId: Number(id),
          body: input.body,
        },
      })
      await this.database.ticketActivity.create({
        data: {
          ticketId: Number(id),
          action: 'Internal note added',
        },
      })
      return {
        id: note.id,
        body: note.body,
        author: 'Workspace administrator',
        createdAt: note.createdAt.toISOString(),
        visibility: 'internal',
      }
    } else {
      const comment = await this.database.ticketComment.create({
        data: {
          ticketId: Number(id),
          body: input.body,
          visibility: 'PUBLIC',
        },
      })
      await this.database.ticketActivity.create({
        data: {
          ticketId: Number(id),
          action: 'Public comment added',
        },
      })
      return {
        id: comment.id,
        body: comment.body,
        author: 'Workspace administrator',
        createdAt: comment.createdAt.toISOString(),
        visibility: 'public',
      }
    }
  }

  async activity(id) {
    const rows = await this.database.ticketActivity.findMany({
      where: { ticketId: Number(id) },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: 'Workspace administrator',
      createdAt: r.createdAt.toISOString(),
    }))
  }
}