import asyncHandler from '../utils/asyncHandler.js'
import { sendTicketResolvedEmail } from '../../emailService.js'

export default class TicketController {
  constructor(ticketService) {
    this.list = asyncHandler(async (request, response) => {
      const result = await ticketService.list(request.validated.query)
      response.json({ data: result })
    })

    this.get = asyncHandler(async (request, response) => {
      const ticket = await ticketService.get(request.validated.params.id)
      response.json({ data: ticket })
    })

    this.create = asyncHandler(async (request, response) => {
      const ticket = await ticketService.create(request.validated.body)
      response.status(201).json({ data: ticket })
    })

    this.update = asyncHandler(async (request, response) => {
      const ticket = await ticketService.update(request.validated.params.id, request.validated.body)

      // 📧 Check for Resolved Status & Dispatch Email to Customer
      try {
        const status = String(request.validated.body?.status || ticket?.status || '').toUpperCase()
        if (status.includes('RESOLV')) {
          const customerEmail = ticket?.customer?.email || ticket?.email || ticket?.customerEmail
          if (customerEmail && !customerEmail.includes('whatsapp.support') && customerEmail !== 'customer@example.com') {
            console.log(`\n📧 [Ticket #${ticket.id} Resolved] Dispatching resolution email to: ${customerEmail}...`)
            sendTicketResolvedEmail({
              to: customerEmail,
              ticket: {
                id: ticket.id,
                subject: ticket.subject || 'Support Ticket',
                description: ticket.description || '',
                status: 'Resolved'
              }
            }).catch((err) => console.warn('Could not dispatch resolved email:', err.message))
          }
        }
      } catch (emailErr) {
        console.warn('Resolved email trigger warning:', emailErr.message)
      }

      response.json({ data: ticket })
    })

    this.delete = asyncHandler(async (request, response) => {
      await ticketService.delete(request.validated.params.id)
      response.status(204).end()
    })

    this.addComment = asyncHandler(async (request, response) => {
      const comment = await ticketService.addComment(request.validated.params.id, request.validated.body)
      response.status(201).json({ data: comment })
    })

    this.activity = asyncHandler(async (request, response) => {
      const activities = await ticketService.activity(request.validated.params.id)
      response.json({ data: activities })
    })
  }
}