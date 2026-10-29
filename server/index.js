import { createApp } from './src/app.js'
import { env } from './src/config/env.js'
import { connectDatabase, disconnectDatabase, prisma } from './src/database/client.js'
import { sendTicketNotification } from './emailService.js'
import { startInboundEmailListener } from './inboundEmailListener.js'

try {
  console.log('Connecting to database...')
  await connectDatabase()
  console.log('✓ Database connected successfully!')

  // Live Gmail Inbound Listener with Fixed Customer & Department Relations
  startInboundEmailListener({
    user: 'kshahbaz7721@gmail.com',         // 👈 Apni Gmail
    pass: 'zkgd ennk ldcx kmdg',         // 👈 16-digit Google App Password
    onNewTicket: async (newTicket) => {
      try {
        const custEmail = newTicket.customerEmail || 'customer@example.com'
        const custName = (newTicket.customerName || custEmail.split('@')[0])

        // 1. Pehle Customer find ya create karein
        let customerRecord = await prisma.customer.findFirst({
          where: { email: custEmail }
        })

        if (!customerRecord) {
          customerRecord = await prisma.customer.create({
            data: {
              name: custName,
              email: custEmail
            }
          })
          console.log(`👤 New Customer profile created: ${custEmail}`)
        }

        // 2. Department check karein taake proper relation connect ho sake
        let departmentConnect = undefined
        try {
          let dept = await prisma.department.findFirst()
          if (!dept) {
            dept = await prisma.department.create({ data: { name: 'Core support' } })
          }
          if (dept) {
            departmentConnect = { connect: { id: dept.id } }
          }
        } catch (e) {
          // Department table agar different ho
        }

        // 3. Priority format karein (UPPERCASE)
        let p = (newTicket.priority || 'MEDIUM').toUpperCase()
        if (p === 'CRITICAL') p = 'URGENT'

        // 4. Ticket create karein
        const model = prisma.ticket || prisma.tickets
        if (model) {
          const ticketData = {
            subject: newTicket.title || newTicket.subject || 'Email Ticket',
            description: newTicket.description || 'No content provided',
            channel: 'EMAIL',
            priority: p,
            status: 'OPEN',
            departmentLabel: 'Core support',
            customer: {
              connect: { id: customerRecord.id }
            }
          }

          if (departmentConnect) {
            ticketData.department = departmentConnect
          }

          const saved = await model.create({ data: ticketData })
          console.log(`\n🎉 BINGO! Ticket #${saved.id} successfully saved in MySQL database! [Subject: ${saved.subject}]`)
        }
      } catch (dbErr) {
        console.error('❌ Database Save Error:', dbErr.message)
      }
    }
  })

  const app = createApp({ prismaClient: prisma })

  // Automated Notification API Endpoint
  app.post('/api/notify-ticket', async (req, res) => {
    try {
      const { ticket, ruleName, recipient } = req.body
      console.log(`⚡ Automation Triggered: [${ruleName}] for Ticket #${ticket?.id}`)

      const result = await sendTicketNotification({
        to: recipient || 'support-agent@company.local',
        subject: `[Automated Alert: ${ruleName}] Ticket #${ticket?.id} - ${ticket?.title || ticket?.subject}`,
        ticket: ticket
      })

      res.json({
        success: true,
        message: 'Automated email dispatched successfully',
        previewUrl: result.previewUrl
      })
    } catch (error) {
      console.error('Email API Error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  })

  const server = app.listen(env.PORT, () => {
    console.log(`Support Desk API listening on http://localhost:${env.PORT}`)
  })

  server.on('error', (err) => {
    console.error('Server error:', err)
  })

  server.on('close', () => {
    console.log('Server socket closed!')
  })

  function shutdown(signal) {
    console.log(`Shutdown triggered by: ${signal}`)
    server.close(() => {
      disconnectDatabase(prisma).finally(() => process.exit(0))
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
  })

  process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`)
  })
} catch (error) {
  console.error('Fatal startup error:', error)
}