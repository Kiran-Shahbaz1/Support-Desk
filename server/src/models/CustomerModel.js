export default class CustomerModel {
  constructor(database) {
    this.database = database
  }

  async list() {
    const customers = await this.database.customer.findMany({
      include: {
        tickets: true,
      },
      orderBy: { name: 'asc' },
    })

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      company: c.company || '',
      ticketCount: c.tickets.length,
      department: c.tickets[0]?.departmentLabel || 'Core support',
      initials: c.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CU',
    }))
  }

  async create(data) {
    const { name, email, company } = data
    if (!name) throw new Error('Customer name is required')
    return this.database.customer.create({
      data: {
        name,
        email: email || null,
        company: company || null,
      },
    })
  }
}