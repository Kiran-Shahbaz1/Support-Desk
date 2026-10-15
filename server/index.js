import express from 'express';
import cors from 'cors';
import { sendTicketNotification } from './emailService.js';
import { startInboundEmailListener } from './inboundEmailListener.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. Automated Outbound Notification API Endpoint
app.post('/api/notify-ticket', async (req, res) => {
  try {
    const { ticket, ruleName, recipient } = req.body;
    console.log(`\n⚡ Automation Triggered: [${ruleName}] for Ticket #${ticket?.id}`);

    const result = await sendTicketNotification({
      to: recipient || 'support-agent@company.local',
      subject: `[Automated Alert: ${ruleName}] Ticket #${ticket?.id} - ${ticket?.subject || ticket?.title}`,
      ticket: ticket
    });

    res.json({ success: true, previewUrl: result.previewUrl });
  } catch (error) {
    console.error('Email API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Inbound Email Webhook (Email se Ticket auto-create karne ke liye)
app.post('/api/inbound-email', async (req, res) => {
  try {
    const { from, subject, body, text } = req.body;
    const emailBody = body || text || 'No description provided';

    console.log(`\n📥 NEW INBOUND EMAIL RECEIVED!`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${subject}`);

    // Intelligent Priority Detection
    let detectedPriority = 'Medium';
    const textToCheck = `${subject} ${emailBody}`.toLowerCase();
    if (/urgent|critical|crash|down|emergency|immediately/i.test(textToCheck)) {
      detectedPriority = 'Critical';
    } else if (/error|bug|issue|failed|high/i.test(textToCheck)) {
      detectedPriority = 'High';
    } else if (/low|minor|feedback|suggestion/i.test(textToCheck)) {
      detectedPriority = 'Low';
    }

    const newTicket = {
      id: Math.floor(1000 + Math.random() * 9000),
      subject: subject || 'Untitled Email Ticket',
      title: subject || 'Untitled Email Ticket',
      description: emailBody,
      customer: from ? from.split('@')[0] : 'Email Customer',
      customerEmail: from || 'unknown@customer.com',
      email: from || 'unknown@customer.com',
      priority: detectedPriority,
      status: 'Open',
      channel: 'Email',
      assignee: 'Unassigned',
      createdAt: new Date().toISOString(),
      tags: ['Inbound Email']
    };

    console.log(`✅ Ticket Auto-Created from Email: #${newTicket.id} [${newTicket.priority}]`);

    // Confirmation receipt
    const confirmation = await sendTicketNotification({
      to: newTicket.customerEmail,
      subject: `[Received: #${newTicket.id}] We got your request: ${newTicket.subject}`,
      ticket: newTicket
    });

    res.json({
      success: true,
      message: 'Inbound email converted to ticket successfully!',
      ticket: newTicket,
      receiptPreviewUrl: confirmation.previewUrl
    });

  } catch (error) {
    console.error('❌ Inbound Email Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Port 5001 start
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Ticket Management Backend Running on http://localhost:${PORT}`);
  console.log(`📡 Automation Engine: Active & Listening`);
  console.log(`📥 Inbound Email Webhook: Ready on POST /api/inbound-email`);
  console.log(`=================================================\n`);
});

server.on('error', (err) => {
  console.error('❌ Server Error:', err.message);
});

// 4. Smart IMAP Checker (Dummy credentials hone par crash/error nahi dega)
const supportUser = process.env.SUPPORT_EMAIL || 'apna_test_support_email@gmail.com';
const supportPass = process.env.SUPPORT_EMAIL_PASS || 'xxxx xxxx xxxx xxxx';

if (
  supportUser !== 'apna_test_support_email@gmail.com' && 
  supportPass !== 'xxxx xxxx xxxx xxxx' &&
  !supportPass.includes('xxxx')
) {
  try {
    startInboundEmailListener({
      user: supportUser,
      pass: supportPass,
      onNewTicket: (ticket) => {
        console.log(`⚡ Automation Triggering for Live Ticket #${ticket.id}...`);
      }
    });
  } catch (err) {
    console.warn('⚠️ IMAP Listener Warning:', err.message);
  }
} else {
  console.log(`💡 IMAP Live Poller: Standby mode (Ready for production credentials)`);
}

// Keep-alive timer
setInterval(() => {}, 60000);