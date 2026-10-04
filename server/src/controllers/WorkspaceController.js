import asyncHandler from '../utils/asyncHandler.js'

export default class WorkspaceController {
  constructor(prisma) {
    this.prisma = prisma

    // Notifications
    this.listNotifications = asyncHandler(async (_request, response) => {
      const activities = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      const ticketActivities = await this.prisma.ticketActivity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      const combined = [
        ...activities.map((a) => ({
          id: a.id,
          action: a.action,
          actor: 'Workspace administrator',
          createdAt: a.createdAt.toISOString(),
        })),
        ...ticketActivities.map((ta) => ({
          id: ta.id,
          action: `${ta.action} on ticket #${ta.ticketId}`,
          actor: 'Support team',
          createdAt: ta.createdAt.toISOString(),
        })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      response.json({ data: combined.slice(0, 30) })
    })

    // Activity / Audit
    this.listActivity = asyncHandler(async (_request, response) => {
      const activities = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      response.json({
        data: activities.map((a) => ({
          id: a.id,
          action: a.action,
          actor: 'Workspace administrator',
          entity: a.entity,
          createdAt: a.createdAt.toISOString(),
        })),
      })
    })

    this.recordActivity = asyncHandler(async (request, response) => {
      const { action, actor, entity, entityId } = request.body
      if (!action) return response.status(400).json({ error: { message: 'Action is required' } })

      const log = await this.prisma.auditLog.create({
        data: {
          action,
          entity: entity || 'Workspace',
          entityId: entityId || null,
        },
      })
      response.status(201).json({
        data: {
          id: log.id,
          action: log.action,
          actor: actor || 'Workspace administrator',
          createdAt: log.createdAt.toISOString(),
        },
      })
    })

    // Settings
    this.getSettings = asyncHandler(async (_request, response) => {
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'workspace_settings' },
      })
      let value = { email: true, realtime: true, sla: true }
      if (setting?.value) {
        try { value = JSON.parse(setting.value) } catch {}
      }
      response.json({ data: value })
    })

    this.updateSettings = asyncHandler(async (request, response) => {
      const nextSettings = request.body
      await this.prisma.setting.upsert({
        where: { key: 'workspace_settings' },
        update: { value: JSON.stringify(nextSettings) },
        create: { key: 'workspace_settings', value: JSON.stringify(nextSettings) },
      })
      response.json({ data: nextSettings })
    })

    // Auth
    this.me = asyncHandler(async (_request, response) => {
      const user = await this.prisma.user.findFirst({
        where: { email: 'admin@supportdesk.io' },
        include: { roles: { include: { role: true } } },
      })
      response.json({
        data: {
          id: user?.id || 'admin',
          name: user?.name || 'Workspace administrator',
          email: user?.email || 'admin@supportdesk.io',
          role: 'Administrator',
          avatarInitials: 'WA',
        },
      })
    })

    this.login = asyncHandler(async (request, response) => {
      const { email } = request.body
      const user = await this.prisma.user.findFirst({
        where: { email: email || 'admin@supportdesk.io' },
      })
      response.json({
        data: {
          id: user?.id || 'admin',
          name: user?.name || 'Workspace administrator',
          email: user?.email || email || 'admin@supportdesk.io',
          role: 'Administrator',
          token: 'demo-jwt-token',
        },
      })
    })

    this.logout = asyncHandler(async (_request, response) => {
      response.json({ data: { message: 'Logged out successfully' } })
    })

    // Attachments
    this.addAttachment = asyncHandler(async (request, response) => {
      const { id } = request.params
      const { fileName, sizeBytes, contentType } = request.body
      if (!fileName) return response.status(400).json({ error: { message: 'fileName is required' } })

      const attachment = await this.prisma.ticketAttachment.create({
        data: {
          ticketId: Number(id),
          fileName,
          storageKey: `uploads/${id}/${fileName}`,
          contentType: contentType || 'application/octet-stream',
          sizeBytes: sizeBytes || 1024,
        },
      })

      await this.prisma.ticketActivity.create({
        data: {
          ticketId: Number(id),
          action: `Attachment added: ${fileName}`,
        },
      })

      response.status(201).json({ data: attachment })
    })
  }
}
