import HttpError from '../utils/HttpError.js'

export default class TicketService {
  constructor(ticketModel) {
    this.ticketModel = ticketModel
  }

  async list(filters) {
    return this.ticketModel.list(filters)
  }

  async get(id) {
    const ticket = await this.ticketModel.getById(id)
    if (!ticket) throw new HttpError(404, 'TICKET_NOT_FOUND', `Ticket #${id} was not found.`)
    return ticket
  }

  async create(input) {
    return this.ticketModel.create(input)
  }

  async update(id, changes) {
    const ticket = await this.ticketModel.update(id, changes)
    if (!ticket) throw new HttpError(404, 'TICKET_NOT_FOUND', `Ticket #${id} was not found.`)
    return ticket
  }

  async delete(id) {
    const deleted = await this.ticketModel.delete(id)
    if (!deleted) throw new HttpError(404, 'TICKET_NOT_FOUND', `Ticket #${id} was not found.`)
  }

  async addComment(id, input) {
    await this.get(id)
    return this.ticketModel.addComment(id, input)
  }

  async activity(id) {
    await this.get(id)
    return this.ticketModel.activity(id)
  }
}