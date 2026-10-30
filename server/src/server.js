import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase, prisma } from './database/client.js'
import { 
  sendTicketNotification, 
  sendTicketCreatedEmail, 
  sendTicketInProgressEmail, 
  sendTicketResolvedEmail,
  sendAgentReplyEmail 
} from '../emailService.js'
import { startInboundEmailListener } from '../inboundEmailListener.js'

// WhatsApp Libraries
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg

let currentWhatsAppQr = null
let isWhatsAppConnected = false

// ========================================================
// PERMANENT DISK STORAGE FOR COMMENTS (SURVIVES RESTARTS)
// ========================================================
const COMMENTS_FILE = path.resolve('./ticket-comments.json')

function getStoredComments(ticketId) {
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8') || '{}')
      return data[String(ticketId)] || []
    }
  } catch (_) {}
  return []
}

function saveCommentToDisk(ticketId, comment) {
  try {
    let data = {}
    if (fs.existsSync(COMMENTS_FILE)) {
      data = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8') || '{}')
    }
    const idKey = String(ticketId)
    if (!data[idKey]) data[idKey] = []
    
    const exists = data[idKey].some(c => c.body === comment.body)
    if (!exists) {
      data[idKey].push(comment)
      fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2))
    }
  } catch (e) {
    console.error('Error saving comment to disk:', e.message)
  }
}

// ========================================================
// PERMANENT DISK & DATABASE STORAGE FOR AGENTS (SURVIVES RESTARTS)
// ========================================================
const AGENTS_FILE = path.resolve('./agents-store.json')

function getStoredAgents() {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8') || '[]')
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch (_) {}
  return [
    { id: 1, name: 'Ahmed Khan', email: 'ahmed.khan@relaydesk.io', password: 'ahmed123', role: 'Support agent', department: 'Core support', detail: 'Support agent · Core support' },
    { id: 2, name: 'Kiran Shah', email: 'kiran.shah@relaydesk.io', password: 'kiran123', role: 'Support agent', department: 'Finance support', detail: 'Support agent · Finance support' },
    { id: 3, name: 'Sara Davis', email: 'sara.davis@relaydesk.io', password: 'sara123', role: 'Support agent', department: 'Enterprise', detail: 'Support agent · Enterprise' }
  ]
}

function saveAgentsToDisk(agents) {
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
  } catch (e) {
    console.error('Error saving agents to disk:', e.message)
  }
}

// ========================================================
// SECURITY OTP STORE & EMAIL HELPER FOR AGENT PROFILE
// ========================================================
const activeSecurityOtps = new Map()

async function sendSecurityCodeEmail(recipientEmail, otpCode) {
  try {
    const emailUser = process.env.GMAIL_USER || env.GMAIL_USER
    const emailPass = process.env.GMAIL_PASS || env.GMAIL_PASS

    if (!emailUser || !emailPass) {
      console.warn(`[OTP] Gmail credentials not found in env. Generated code for ${recipientEmail}: ${otpCode}`)
      return true
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })

    const mailOptions = {
      from: `"RelayDesk Security" <${emailUser}>`,
      to: recipientEmail,
      subject: `RelayDesk Security Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <div style="background: #0284c7; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">🛡️</div>
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">RelayDesk Security Verification</h2>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            You requested to verify your identity to update your password or profile credentials. Use the 6-digit code below to complete the verification:
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #166534; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 20px 0 0 0; line-height: 1.5;">
            ⏰ This code will expire in <strong>10 minutes</strong>. If you did not make this request, please change your login password immediately.
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`[AUTH] 6-digit OTP dispatched to real email: ${recipientEmail}`)
    return true
  } catch (err) {
    console.error(`[AUTH] Failed to send OTP email:`, err.message)
    return false
  }
}

function generateQrHtml(qrData) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrData)}`
  return `<!DOCTYPE html>
<html>
<head>
  <title>Scan WhatsApp QR Code</title>
  <meta http-equiv="refresh" content="25">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .card { background: white; padding: 35px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 450px; }
    img { border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0; }
    h2 { color: #075e54; margin: 0; font-size: 24px; }
    ol { text-align: left; color: #4a5568; line-height: 1.8; font-size: 15px; margin: 20px 0; }
    .badge { background: #e6fffa; color: #047857; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Live WhatsApp Support</span>
    <h2 style="margin-top:10px;">Scan QR Code</h2>
    <ol>
      <li>Apne mobile me <b>WhatsApp</b> open karein.</li>
      <li>Settings / Menu (3 dots) par tap karein.</li>
      <li><b>Linked Devices</b> &gt; <b>Link a Device</b> par tap karein.</li>
      <li>Neeche diye gaye QR Code ko scan karein:</li>
    </ol>
    <img src="${qrImageUrl}" width="320" height="320" alt="Scan QR Code" />
    <p style="color:#718096;font-size:12px;margin-bottom:0;">Session automatically refresh hota rahega.</p>
  </div>
</body>
</html>`
}

// ========================================================
// WHATSAPP LIVE ENGINE
// ========================================================
function startWhatsAppEngine({ onNewTicket }) {
  console.log('📱 Initializing WhatsApp Web Engine...')

  const waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  })

  waClient.on('qr', (qr) => {
    currentWhatsAppQr = qr
    try {
      fs.writeFileSync('whatsapp-qr.html', generateQrHtml(qr))
    } catch (_) {}

    console.log('\n======================================================')
    console.log('📲 BROWSER ME QR SCAN KARNE KE LIYE YE LINK KHOLEN:')
    console.log('👉 http://localhost:4000/api/whatsapp-qr')
    console.log('👉 Ya folder me "whatsapp-qr.html" file par double-click karein')
    console.log('======================================================\n')
  })

  waClient.on('ready', () => {
    isWhatsAppConnected = true
    currentWhatsAppQr = null
    console.log('\n🎉 ✓ WHATSAPP LIVE & READY! Listening for customer messages...\n')
  })

  waClient.on('authenticated', () => {
    console.log('✓ WhatsApp Authenticated successfully!')
  })

  waClient.on('disconnected', () => {
    isWhatsAppConnected = false
    console.log('⚠️ WhatsApp disconnected. Reconnecting...')
    setTimeout(() => waClient.initialize(), 5000)
  })

  waClient.on('message', async (msg) => {
    try {
      if (msg.isStatus || msg.from.includes('@g.us')) return

      const contact = await msg.getContact()
      const senderPhone = msg.from.replace('@c.us', '')
      const senderName = contact.pushname || contact.name || `WhatsApp User (+${senderPhone})`
      const messageBody = msg.body

      if (!messageBody || messageBody.trim().length === 0) return

      console.log(`\n💬 INCOMING WHATSAPP MESSAGE DETECTED!`)
      console.log(`   From: ${senderName} (+${senderPhone})`)
      console.log(`   Message: ${messageBody}`)

      const subject = messageBody.length > 55 ? messageBody.substring(0, 52) + '...' : messageBody

      let priority = 'MEDIUM'
      const fullText = messageBody.toLowerCase()
      if (/urgent|critical|crash|down|emergency/i.test(fullText)) {
        priority = 'CRITICAL'
      } else if (/error|bug|issue|help|not working|problem/i.test(fullText)) {
        priority = 'HIGH'
      }

      const newTicket = {
        title: `[WhatsApp] ${subject}`,
        subject: `[WhatsApp] ${subject}`,
        description: messageBody,
        customerPhone: senderPhone,
        customerName: senderName,
        customerEmail: `${senderPhone}@whatsapp.support`,
        channel: 'CHAT',
        priority: priority
      }

      if (onNewTicket) {
        const savedTicket = await onNewTicket(newTicket)

        if (savedTicket?.id) {
          const replyText = `👋 Salam *${senderName}*!\n\nAapki complaint darj kar li gayi hai:\n🎫 *Ticket #${savedTicket.id}*\n📌 *Issue:* ${subject}\n\nHumari team jald aapse rabta karegi.`
          await msg.reply(replyText)
          console.log(`✉️ Automated reply sent to +${senderPhone}`)
        }
      }
    } catch (err) {
      console.error('❌ Error handling WhatsApp message:', err.message)
    }
  })

  waClient.initialize().catch((err) => {
    console.error('❌ WhatsApp initialize error:', err.message)
  })
}

// ========================================================
// MAIN SERVER STARTUP
// ========================================================
try {
  console.log('Connecting to database...')
  await connectDatabase()
  console.log('✓ Database connected successfully!')

  const emailUser = process.env.GMAIL_USER || env.GMAIL_USER
  const emailPass = process.env.GMAIL_PASS || env.GMAIL_PASS

  if (emailUser && emailPass) {
    startInboundEmailListener({
      user: emailUser,
      pass: emailPass,
      onNewTicket: async (newTicket) => {
        try {
          const model = prisma.ticket || prisma.tickets
          if (model) {
            const subject = newTicket.subject || newTicket.title || 'New Support Ticket'
            const customerEmail = newTicket.customerEmail || newTicket.from || 'guest@example.com'
            const customerName = customerEmail.includes('@') ? customerEmail.split('@')[0] : 'Guest'
            const description = newTicket.description || 'No description provided'

            const existingTicket = await model.findFirst({
              where: { subject, description }
            }).catch(() => null)

            if (existingTicket) {
              console.log(`ℹ️ [Skipped] Ticket #${existingTicket.id} pehle se DB me mojood hai ("${subject}"). Duplicate create nahi kiya.`)
              return
            }

            let customerRecord = null
            if (prisma.customer) {
              customerRecord = await prisma.customer.findFirst({
                where: { email: customerEmail }
              }).catch(() => null)

              if (!customerRecord) {
                customerRecord = await prisma.customer.create({
                  data: { name: customerName, email: customerEmail }
                }).catch(() => null)
              }
            }

            let departmentRecord = null
            if (prisma.department) {
              departmentRecord = await prisma.department.findFirst().catch(() => null)
            }

            let priority = 'MEDIUM'
            const p = (newTicket.priority || '').toUpperCase()
            if (p.includes('CRIT')) priority = 'CRITICAL'
            else if (p.includes('HIGH')) priority = 'HIGH'
            else if (p.includes('LOW')) priority = 'LOW'
            else priority = 'MEDIUM'

            const ticketData = {
              subject: subject,
              description: description,
              channel: 'EMAIL',
              priority: priority,
              status: 'OPEN',
              departmentLabel: departmentRecord?.name || 'Core support'
            }

            if (customerRecord?.id) {
              ticketData.customer = { connect: { id: customerRecord.id } }
            }
            if (departmentRecord?.id) {
              ticketData.department = { connect: { id: departmentRecord.id } }
            }

            const saved = await model.create({ data: ticketData })
            console.log(`\n🎉 ✓ SUCCESS: Naya Email Ticket #${saved.id} successfully created!\n`)

            if (customerEmail && customerEmail !== 'guest@example.com') {
              sendTicketCreatedEmail({ to: customerEmail, ticket: { ...saved, id: saved.id, subject, description, priority } }).catch(() => {})
            }

            return saved
          }
        } catch (dbErr) {
          console.error('Database Save Error (Email):', dbErr.message)
        }
      },

      onTicketReply: async ({ ticketId, author, email, text }) => {
        try {
          const id = Number(ticketId)
          console.log(`\n💬 Customer ne Ticket #${id} par email reply bheja: "${text.substring(0, 60)}..."`)

          const newComment = {
            id: 'c_' + Date.now().toString(36),
            body: text,
            author: author || 'Customer (via Email)',
            email: email,
            createdAt: new Date().toISOString(),
            visibility: 'public'
          }

          saveCommentToDisk(id, newComment)

          const model = prisma.ticket || prisma.tickets
          if (model) {
            await model.update({
              where: { id },
              data: { status: 'OPEN' }
            }).catch(() => {})
          }

          console.log(`🎉 ✓ SUCCESS: Customer reply Ticket #${id} ke comments me save ho gaya!\n`)
        } catch (replyErr) {
          console.error('Customer Reply Save Error:', replyErr.message)
        }
      }
    })
  } else {
    console.log('ℹ️ Inbound Email Listener is disabled (Set GMAIL_USER & GMAIL_PASS in .env to enable)')
  }

  // 2. LIVE WHATSAPP LISTENER
  startWhatsAppEngine({
    onNewTicket: async (newTicket) => {
      try {
        const model = prisma.ticket || prisma.tickets
        if (model) {
          let customerRecord = null
          if (prisma.customer) {
            customerRecord = await prisma.customer.findFirst({
              where: { email: newTicket.customerEmail }
            }).catch(() => null)

            if (!customerRecord) {
              customerRecord = await prisma.customer.create({
                data: {
                  name: newTicket.customerName,
                  email: newTicket.customerEmail
                }
              }).catch(() => null)
            }
          }

          let departmentRecord = null
          if (prisma.department) {
            departmentRecord = await prisma.department.findFirst().catch(() => null)
          }

          const ticketData = {
            subject: newTicket.subject,
            description: newTicket.description,
            channel: 'CHAT',
            priority: newTicket.priority || 'MEDIUM',
            status: 'OPEN',
            departmentLabel: departmentRecord?.name || 'Core support',
            ...(customerRecord?.id && {
              customer: { connect: { id: customerRecord.id } }
            }),
            ...(departmentRecord?.id && {
              department: { connect: { id: departmentRecord.id } }
            })
          }

          const saved = await model.create({ data: ticketData })
          console.log(`\n🎉 ✓ SUCCESS: Naya WhatsApp Ticket #${saved.id} successfully created!\n`)
          return saved
        }
      } catch (dbErr) {
        console.error('Database Save Error (WhatsApp):', dbErr.message)
      }
    }
  })

  const app = createApp({ prismaClient: prisma })

  // ========================================================
  // SECURITY OTP ENDPOINTS (EMAIL DISPATCH - SCREEN HIDDEN)
  // ========================================================
  app.post(['/api/v1/auth/send-otp', '/api/auth/send-otp'], async (req, res) => {
    try {
      const { email } = req.body || {}
      const cleanEmail = (email || '').trim().toLowerCase()
      if (!cleanEmail) {
        return res.status(400).json({ success: false, error: { message: 'Email address is required.' } })
      }

      // Generate 6-digit verification code
      const otpCode = String(Math.floor(100000 + Math.random() * 900000))
      
      // Store in memory for 10 minutes
      activeSecurityOtps.set(cleanEmail, {
        code: otpCode,
        expiresAt: Date.now() + 10 * 60 * 1000
      })

      // Dispatch to actual email inbox
      await sendSecurityCodeEmail(cleanEmail, otpCode)

      // Do not return the code in the JSON response (only success message)
      return res.json({
        success: true,
        message: `Security verification code has been dispatched to your email (${cleanEmail}).`
      })
    } catch (err) {
      console.error('OTP Send Route Error:', err.message)
      return res.status(500).json({ success: false, error: { message: err.message } })
    }
  })

  app.post(['/api/v1/auth/verify-otp', '/api/auth/verify-otp'], (req, res) => {
    try {
      const { email, code } = req.body || {}
      const cleanEmail = (email || '').trim().toLowerCase()
      const enteredCode = String(code || '').trim()

      // 1. Direct email match check karein
      let record = activeSecurityOtps.get(cleanEmail)

      // 2. Agar email change hone ki wajah se direct na mile, to active valid OTPs me check karein
      if (!record) {
        for (const [storedEmail, otpData] of activeSecurityOtps.entries()) {
          if (otpData.code === enteredCode && Date.now() <= otpData.expiresAt) {
            record = otpData
            break
          }
        }
      }

      if (!record) {
        return res.status(400).json({ success: false, error: { message: 'No verification code found. Please request a new code.' } })
      }

      if (Date.now() > record.expiresAt) {
        activeSecurityOtps.delete(cleanEmail)
        return res.status(400).json({ success: false, error: { message: 'Verification code has expired. Please request a new code.' } })
      }

      if (record.code !== enteredCode) {
        return res.status(400).json({ success: false, error: { message: 'Invalid 6-digit code. Please check your email and try again.' } })
      }

      // Consumed successfully
      activeSecurityOtps.clear()
      return res.json({ success: true, message: 'Identity verified successfully.' })
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } })
    }
  })

  // ========================================================
  // LIVE AGENTS API (DATABASE + PERMANENT DISK STORAGE)
  // ========================================================
  app.get(['/api/v1/agents', '/api/agents'], async (req, res) => {
    try {
      let agents = getStoredAgents()
      const model = prisma.agent || prisma.agents || prisma.user || prisma.staff
      if (model) {
        try {
          const dbAgents = await model.findMany().catch(() => [])
          if (Array.isArray(dbAgents) && dbAgents.length > 0) {
            agents = dbAgents.map(da => {
              const diskMatch = agents.find(sa => String(sa.id) === String(da.id) || sa.email?.toLowerCase() === da.email?.toLowerCase())
              return {
                ...da,
                password: diskMatch?.password || da.password || 'agent123',
                detail: da.detail || `${da.role || 'Support agent'} · ${da.department || 'Core support'}`
              }
            })
          }
        } catch (_) {}
      }
      return res.json({ success: true, data: agents, agents })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  app.all(['/api/v1/agents/:id', '/api/agents/:id'], async (req, res, next) => {
    if (req.method !== 'PATCH' && req.method !== 'PUT') return next()
    try {
      const rawId = req.params.id
      const idNum = Number(rawId)
      const body = req.body || {}
      let agents = getStoredAgents()

      const cleanEmail = (body.email || '').trim().toLowerCase()
      const cleanName = (body.name || '').trim().toLowerCase()

      let foundIndex = agents.findIndex(a => 
        String(a.id) === String(rawId) || 
        (cleanEmail && a.email?.toLowerCase() === cleanEmail) ||
        (cleanName && a.name?.toLowerCase() === cleanName)
      )

      let updatedAgent
      if (foundIndex >= 0) {
        updatedAgent = {
          ...agents[foundIndex],
          ...body,
          id: agents[foundIndex].id,
          detail: body.detail || `${body.role || agents[foundIndex].role || 'Support agent'} · ${body.department || agents[foundIndex].department || 'Core support'}`
        }
        agents[foundIndex] = updatedAgent
      } else {
        updatedAgent = {
          id: !isNaN(idNum) ? idNum : Date.now(),
          name: body.name || 'Support Agent',
          email: cleanEmail || 'agent@relaydesk.io',
          password: body.password || 'agent123',
          role: body.role || 'Support agent',
          department: body.department || 'Core support',
          detail: `${body.role || 'Support agent'} · ${body.department || 'Core support'}`,
          ...body
        }
        agents.push(updatedAgent)
      }

      saveAgentsToDisk(agents)

      // Sync Prisma Database if available
      const model = prisma.agent || prisma.agents || prisma.user || prisma.staff
      if (model) {
        try {
          const updateData = {
            name: updatedAgent.name,
            email: updatedAgent.email,
            role: updatedAgent.role,
            department: updatedAgent.department
          }
          if (updatedAgent.password) {
            try {
              await model.update({
                where: { id: !isNaN(idNum) ? idNum : updatedAgent.id },
                data: { ...updateData, password: updatedAgent.password }
              })
            } catch (passErr) {
              await model.update({
                where: { id: !isNaN(idNum) ? idNum : updatedAgent.id },
                data: updateData
              }).catch(() => {})
            }
          }
        } catch (dbErr) {
          console.warn('Prisma Agent Update Info:', dbErr.message)
        }
      }

      console.log(`\n🎉 ✓ SUCCESS: Agent ${updatedAgent.name} (${updatedAgent.email}) credentials & profile updated in Database & Disk!\n`)
      return res.json({ success: true, data: updatedAgent, agent: updatedAgent })
    } catch (err) {
      console.error('Agent Update Error:', err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  app.post(['/api/v1/agents', '/api/agents'], async (req, res) => {
    try {
      const body = req.body || {}
      let agents = getStoredAgents()
      const newId = Date.now()
      const newAgent = {
        id: newId,
        name: body.name || 'New Agent',
        email: (body.email || '').toLowerCase().trim(),
        password: body.password || 'agent123',
        role: body.role || 'Support agent',
        department: body.department || 'Core support',
        detail: `${body.role || 'Support agent'} · ${body.department || 'Core support'}`,
        ...body
      }
      agents.unshift(newAgent)
      saveAgentsToDisk(agents)

      const model = prisma.agent || prisma.agents || prisma.user || prisma.staff
      if (model) {
        try {
          await model.create({
            data: {
              name: newAgent.name,
              email: newAgent.email,
              role: newAgent.role,
              department: newAgent.department
            }
          }).catch(() => {})
        } catch (_) {}
      }

      console.log(`\n🎉 ✓ SUCCESS: New Agent ${newAgent.name} created!\n`)
      return res.status(201).json({ success: true, data: newAgent, agent: newAgent })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  app.delete(['/api/v1/agents/:id', '/api/agents/:id'], async (req, res) => {
    try {
      const rawId = req.params.id
      const idNum = Number(rawId)
      let agents = getStoredAgents()
      agents = agents.filter(a => String(a.id) !== String(rawId))
      saveAgentsToDisk(agents)

      const model = prisma.agent || prisma.agents || prisma.user || prisma.staff
      if (model) {
        try {
          await model.delete({
            where: { id: !isNaN(idNum) ? idNum : rawId }
          }).catch(() => {})
        } catch (_) {}
      }
      return res.json({ success: true, message: 'Agent deleted' })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // AGENT LOGIN HANDLER
  app.post(['/api/v1/auth/login', '/api/auth/login'], (req, res) => {
    const { email, password } = req.body || {}
    const cleanEmail = (email || '').trim().toLowerCase()
    const agents = getStoredAgents()
    
    const found = agents.find(a => a.email?.toLowerCase() === cleanEmail)
    if (found) {
      if (password && found.password && found.password !== password) {
        return res.status(401).json({ success: false, error: 'Incorrect password' })
      }
      return res.json({
        success: true,
        user: {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role || 'Support agent',
          department: found.department || 'Core support'
        }
      })
    }

    if (cleanEmail === 'admin@relaydesk.io') {
      return res.json({
        success: true,
        user: { id: 0, name: 'Administrator', email: cleanEmail, role: 'Administrator' }
      })
    }

    return res.status(404).json({ success: false, error: 'User not found' })
  })

  // ========================================================
  // LIVE COMMENTS API (GET, POST & DELETE)
  // ========================================================
  app.get('/api/tickets/:id/comments', (req, res) => {
    const id = Number(req.params.id)
    const comments = getStoredComments(id)
    res.json({ success: true, comments })
  })

  app.post('/api/tickets/:id/comments', async (req, res) => {
    try {
      const id = Number(req.params.id)
      const { comment, ticket, agentName, isCustomer } = req.body

      if (comment) {
        saveCommentToDisk(id, comment)
      }

      if (!isCustomer && comment?.body) {
        const customerEmail = ticket?.email || ticket?.customerEmail
        if (customerEmail && !customerEmail.includes('whatsapp.support')) {
          sendAgentReplyEmail({
            to: customerEmail,
            ticket,
            commentText: comment.body,
            agentName: agentName || 'Support Agent'
          }).catch(() => {})
        }
      }

      res.json({ success: true })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // 🗑️ PERMANENT DELETE ROUTE (CLEAN POST HANDLER)
  app.post('/api/tickets/:id/delete-comment', (req, res) => {
    try {
      const idKey = String(req.params.id)
      const { index, text, commentId } = req.body

      if (fs.existsSync(COMMENTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8') || '{}')
        if (data[idKey] && Array.isArray(data[idKey])) {
          if (typeof index === 'number' && index >= 0 && index < data[idKey].length) {
            data[idKey].splice(index, 1)
          } else {
            data[idKey] = data[idKey].filter(c => {
              if (commentId && c.id === commentId) return false
              if (text && (c.body === text || c.text === text)) return false
              return true
            })
          }
          fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2))
          console.log(`✓ Comment successfully deleted from Ticket #${idKey}`)
        }
      }
      res.json({ success: true })
    } catch (e) {
      console.error('Delete error in server:', e.message)
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ========================================================
  // ROBUST TICKET CREATION
  // ========================================================
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer) => {
      if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        layer.handle.stack = layer.handle.stack.filter((subLayer) => {
          if (subLayer.route && (subLayer.route.path === '/' || subLayer.route.path === '/tickets' || subLayer.route.path === '/api/v1/tickets')) {
            if (subLayer.route.methods && subLayer.route.methods.post) {
              return false
            }
          }
          return true
        })
      }
    })
  }

  app.post(['/api/v1/tickets', '/api/tickets'], async (req, res) => {
    try {
      const model = prisma.ticket || prisma.tickets
      if (!model) {
        return res.status(500).json({ success: false, message: 'Database ticket model not available' })
      }

      const body = req.body || {}
      const subject = (body.subject || body.title || 'Support Request').trim()
      const description = (body.description || body.details || 'No description provided.').trim()
      const customerEmail = (body.email || body.customerEmail || 'customer@example.com').trim().toLowerCase()
      const customerName = (body.customer || body.customerName || customerEmail.split('@')[0] || 'Customer').trim()
      const departmentName = body.department || body.departmentLabel || 'Core support'

      let priority = 'MEDIUM'
      const p = String(body.priority || '').toUpperCase()
      if (p.includes('CRIT')) priority = 'CRITICAL'
      else if (p.includes('HIGH')) priority = 'HIGH'
      else if (p.includes('LOW')) priority = 'LOW'
      else priority = 'MEDIUM'

      let status = 'OPEN'
      const s = String(body.status || '').toUpperCase()
      if (s.includes('RESOLV')) status = 'RESOLVED'
      else if (s.includes('PEND')) status = 'PENDING'
      else if (s.includes('CLOSE')) status = 'CLOSED'
      else status = 'OPEN'

      let channel = 'WEB'
      const ch = String(body.channel || '').toUpperCase()
      if (ch.includes('EMAIL')) channel = 'EMAIL'
      else if (ch.includes('CHAT') || ch.includes('WHATSAPP')) channel = 'CHAT'
      else if (ch.includes('SMS') || ch.includes('PHONE')) channel = 'PHONE'
      else channel = 'WEB'

      let customerRecord = null
      if (prisma.customer) {
        customerRecord = await prisma.customer.findFirst({
          where: { email: customerEmail }
        }).catch(() => null)

        if (!customerRecord) {
          customerRecord = await prisma.customer.create({
            data: { name: customerName, email: customerEmail }
          }).catch(() => null)
        }
      }

      let departmentRecord = null
      if (prisma.department) {
        departmentRecord = await prisma.department.findFirst({
          where: {
            OR: [
              { name: { equals: departmentName } },
              { name: { contains: departmentName } }
            ]
          }
        }).catch(() => null)

        if (!departmentRecord) {
          departmentRecord = await prisma.department.findFirst().catch(() => null)
        }
      }

      const ticketData = {
        subject: subject,
        description: description,
        priority: priority,
        status: status,
        channel: channel,
        departmentLabel: departmentName,
        category: body.category || 'General Inquiry',
        ...(customerRecord?.id && {
          customer: { connect: { id: customerRecord.id } }
        }),
        ...(departmentRecord?.id && {
          department: { connect: { id: departmentRecord.id } }
        })
      }

      let savedTicket
      try {
        savedTicket = await model.create({
          data: ticketData,
          include: { customer: true, department: true }
        })
      } catch (prismaErr) {
        delete ticketData.category
        savedTicket = await model.create({
          data: ticketData,
          include: { customer: true, department: true }
        })
      }

      console.log(`\n🎉 ✓ SUCCESS: Ticket #${savedTicket.id} successfully created and stored in Database!\n`)

      if (customerEmail && customerEmail !== 'customer@example.com' && !customerEmail.includes('whatsapp.support')) {
        sendTicketCreatedEmail({
          to: customerEmail,
          ticket: {
            ...savedTicket,
            id: savedTicket.id,
            subject,
            description,
            priority: body.priority || 'Medium',
            channel
          }
        }).catch((e) => {
          console.warn('Could not dispatch customer intake email:', e.message)
        })
      }

      return res.status(201).json({
        success: true,
        ticket: savedTicket,
        id: savedTicket.id,
        ...savedTicket
      })
    } catch (err) {
      console.error('Ticket Create Error:', err.message)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ========================================================
  // BROWSER ME WHATSAPP QR ROUTE (BYPASSES FRONTEND)
  // ========================================================
  app.get('/api/whatsapp-qr', (req, res) => {
    if (isWhatsAppConnected) {
      return res.send(`
        <div style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2 style="color:#10b981;">✓ WhatsApp pehle se Connected hai! 🎉</h2>
          <p>QR scan karne ki zaroorat nahi hai. Messages live receive ho rahe hain.</p>
        </div>
      `)
    }

    if (!currentWhatsAppQr) {
      return res.send(`
        <div style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2>WhatsApp QR Code generate ho raha hai...</h2>
          <p>Page ko 3 second baad refresh karein.</p>
          <script>setTimeout(() => window.location.reload(), 3000);</script>
        </div>
      `)
    }

    res.send(generateQrHtml(currentWhatsAppQr))
  })

  // ========================================================
  // CUSTOMER PUBLIC TICKET TRACKING (NO LOGIN REQUIRED)
  // ========================================================
  app.get('/api/v1/track-tickets', async (req, res) => {
    try {
      const { email, ticketId, ids } = req.query
      const model = prisma.ticket || prisma.tickets

      if (ids) {
        const idList = ids.split(',').map(id => parseInt(id.trim())).filter(Boolean)
        const tickets = await model.findMany({
          where: { id: { in: idList } },
          include: { customer: true, department: true },
          orderBy: { id: 'desc' }
        })
        return res.json({ success: true, tickets })
      }

      if (email) {
        const tickets = await model.findMany({
          where: {
            OR: [
              { customer: { email: { equals: email.trim() } } },
              { customer: { name: { contains: email.trim() } } }
            ]
          },
          include: { customer: true, department: true },
          orderBy: { id: 'desc' }
        })
        return res.json({ success: true, tickets })
      }

      if (ticketId) {
        const ticket = await model.findFirst({
          where: { id: parseInt(ticketId) },
          include: { customer: true, department: true }
        })
        return res.json({ success: true, tickets: ticket ? [ticket] : [] })
      }

      return res.status(400).json({ success: false, message: 'Ticket ID ya Email provide karein.' })

    } catch (err) {
      console.error('Track Ticket Error:', err.message)
      res.status(500).json({ success: false, error: err.message })
    }
  })

  // ========================================================
  // AUTOMATED CUSTOMER NOTIFICATION API ENDPOINT
  // ========================================================
  app.post('/api/notify-ticket', async (req, res) => {
    try {
      const { ticket, ruleName, recipient } = req.body
      const customerEmail = recipient || ticket?.email || ticket?.customerEmail

      console.log(`⚡ Automated Email Triggered: [${ruleName}] for Ticket #${ticket?.id} (Status: ${ticket?.status})`)

      let result = { success: false }
      const status = String(ticket?.status || '').toUpperCase()

      if (status.includes('RESOLV') || status.includes('CLOSE')) {
        result = await sendTicketResolvedEmail({ to: customerEmail, ticket })
      } else if (status.includes('PEND') || status.includes('PROGRESS')) {
        result = await sendTicketInProgressEmail({ to: customerEmail, ticket })
      } else {
        result = await sendTicketCreatedEmail({ to: customerEmail, ticket })
      }

      res.json({
        success: true,
        message: 'Automated English email dispatched successfully',
        previewUrl: result?.previewUrl
      })
    } catch (error) {
      console.error('Email API Error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  })

  // ========================================================
  // DIRECT TICKET PATCH/STATUS INTERCEPTOR FOR RESOLVED EMAIL
  // ========================================================
  app.patch(['/api/v1/tickets/:id', '/api/tickets/:id'], async (req, res, next) => {
    try {
      const id = Number(req.params.id)
      const body = req.body || {}
      const newStatus = String(body.status || '').toUpperCase()

      if (newStatus.includes('RESOLV')) {
        const model = prisma.ticket || prisma.tickets
        if (model && !isNaN(id)) {
          const currentTicket = await model.findUnique({
            where: { id },
            include: { customer: true }
          }).catch(() => null)

          const targetEmail = currentTicket?.customer?.email || body.email || currentTicket?.email
          if (targetEmail && !targetEmail.includes('whatsapp.support') && targetEmail !== 'customer@example.com') {
            console.log(`\n📧 Ticket #${id} marked as RESOLVED! Sending customer resolution email to: ${targetEmail}...`)
            sendTicketResolvedEmail({
              to: targetEmail,
              ticket: {
                id,
                subject: body.subject || currentTicket?.subject || 'Support Ticket',
                description: body.description || currentTicket?.description || '',
                status: 'Resolved'
              }
            }).catch(e => console.warn('Could not send resolved email:', e.message))
          }
        }
      }
    } catch (err) {
      console.warn('Resolved interceptor info:', err.message)
    }
    return next()
  })

  const server = app.listen(env.PORT, () => {
    console.log(`\n======================================================`)
    console.log(`✓ Support Desk System LIVE on: http://localhost:${env.PORT}`)
    console.log(`======================================================\n`)
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