export default class ReportModel {
  constructor(database) {
    this.database = database
  }

  async summary() {
    const [total, open, pending, resolved, critical, archived, tickets] = await Promise.all([
      this.database.ticket.count(),
      this.database.ticket.count({ where: { status: 'OPEN' } }),
      this.database.ticket.count({ where: { status: 'PENDING' } }),
      this.database.ticket.count({ where: { status: 'RESOLVED' } }),
      this.database.ticket.count({ where: { priority: 'CRITICAL' } }),
      this.database.ticket.count({ where: { archivedAt: { not: null } } }),
      this.database.ticket.findMany({ select: { priority: true } }),
    ])

    const priorityCounts = {}
    for (const t of tickets) {
      const p = t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase()
      priorityCounts[p] = (priorityCounts[p] || 0) + 1
    }
    const byPriority = ['Critical', 'High', 'Medium', 'Low'].map((label) => ({
      label,
      count: priorityCounts[label] || 0,
    }))

    return {
      total,
      open,
      pending,
      resolved,
      critical,
      archived,
      byPriority,
    }
  }
}