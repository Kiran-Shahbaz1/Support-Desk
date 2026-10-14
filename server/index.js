import express from 'express';
import cors from 'cors';
import { sendTicketNotification } from './emailService.js';

const app = express();
app.use(cors());
app.use(express.json());

// Automated Notification API Endpoint
app.post('/api/notify-ticket', async (req, res) => {
  try {
    const { ticket, ruleName, recipient } = req.body;
    console.log(`\n⚡ Automation Triggered: [${ruleName}] for Ticket #${ticket?.id}`);

    const result = await sendTicketNotification({
      to: recipient || 'support-agent@company.local',
      subject: `[Automated Alert: ${ruleName}] Ticket #${ticket?.id} - ${ticket?.title}`,
      ticket: ticket
    });

    res.json({ success: true, previewUrl: result.previewUrl });
  } catch (error) {
    console.error('Email API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Port 5001 use karein (Windows safe port)
const PORT = 5001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Notification Server running on http://localhost:${PORT}`);
  console.log(`📡 Waiting for automation triggers... (Press Ctrl+C to stop)`);
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server Error:', err.message);
});

// Keep-alive timer taake process exit na ho
setInterval(() => {}, 60000);
// 📥 INBOUND EMAIL WEBHOOK: Email se Ticket Create karne ke liye
app.post('/api/inbound-email', async (req, res) => {
  try {
    const { from, subject, body, text } = req.body;
    const emailBody = body || text || 'No description provided';

    console.log(`\n📥 NEW INBOUND EMAIL RECEIVED!`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${subject}`);

    // Intelligent Priority Detection: Agar email mein urgent/crash/error ho to Critical
    let detectedPriority = 'Medium';
    const textToCheck = `${subject} ${emailBody}`.toLowerCase();
    if (/urgent|critical|crash|down|emergency|immediately/i.test(textToCheck)) {
      detectedPriority = 'Critical';
    } else if (/error|bug|issue|failed|high/i.test(textToCheck)) {
      detectedPriority = 'High';
    } else if (/low|minor|feedback|suggestion/i.test(textToCheck)) {
      detectedPriority = 'Low';
    }

    // Auto-generate new Ticket Object from incoming email
    const newTicket = {
      id: Math.floor(1000 + Math.random() * 9000), // e.g. 1049
      title: subject || 'Untitled Email Ticket',
      description: emailBody,
      customerEmail: from || 'unknown@customer.com',
      priority: detectedPriority,
      status: 'Open',
      channel: 'Email', // Mark channel as Email
      assignee: 'Unassigned',
      createdAt: new Date().toISOString(),
      tags: ['Inbound Email']
    };

    console.log(`✅ Ticket Auto-Created from Email: #${newTicket.id} [${newTicket.priority}]`);

    // 📤 Automatically Send Outbound Confirmation Receipt to Customer
    const confirmation = await sendTicketNotification({
      to: newTicket.customerEmail,
      subject: `[Received: #${newTicket.id}] We got your request: ${newTicket.title}`,
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
import { startInboundEmailListener } from './inboundEmailListener.js';

// Support Email credentials (Dedicated Test Account)
startInboundEmailListener({
  user: 'apna_test_support_email@gmail.com', // Yahan support email likhein
  pass: 'xxxx xxxx xxxx xxxx',                // Yahan 16-digit App Password likhein
  onNewTicket: (ticket) => {
    console.log(`⚡ Automation Triggering for Live Ticket #${ticket.id}...`);
    // Automation engine ya notification bhej sakte hain
  }
});