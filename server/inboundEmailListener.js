import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function startInboundEmailListener({ user, pass, onNewTicket }) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: user, // Test support email
      pass: pass  // 16-digit Google App Password
    },
    logger: false
  });

  try {
    await client.connect();
    console.log(`\n📬 INBOUND LISTENER ACTIVE! Listening on: ${user}`);
    console.log(`👉 Ab apne mobile/personal email se is par email bhej kar dekhein...\n`);

    // Inbox lock karke listen karna
    const lock = await client.getMailboxLock('INBOX');

    // Real-time new email event listener
    client.on('exists', async (data) => {
      console.log(`🔔 Nayi email aayi! (Total messages: ${data.count})`);

      // Aakhri unread message fetch karna
      for await (let message of client.fetch(`${data.count}:*`, { envelope: true, source: true })) {
        const parsed = await simpleParser(message.source);

        console.log(`\n📥 LIVE EMAIL DETECTED!`);
        console.log(`   From: ${parsed.from.text}`);
        console.log(`   Subject: ${parsed.subject}`);

        // Intelligent Priority detection
        let priority = 'Medium';
        const fullText = `${parsed.subject} ${parsed.text}`.toLowerCase();
        if (/urgent|critical|crash|down|emergency/i.test(fullText)) priority = 'Critical';
        else if (/error|bug|issue|help/i.test(fullText)) priority = 'High';

        const newTicket = {
          id: Math.floor(1000 + Math.random() * 9000),
          title: parsed.subject || 'Email Ticket',
          description: parsed.text || 'No text content',
          customerEmail: parsed.from.value[0]?.address || parsed.from.text,
          priority: priority,
          status: 'Open',
          channel: 'Email (Live IMAP)',
          assignee: 'Unassigned',
          createdAt: new Date().toISOString()
        };

        console.log(`🎫 TICKET #${newTicket.id} CREATED IN SYSTEM! [Priority: ${newTicket.priority}]`);

        // Ticket callback call karna
        if (onNewTicket) onNewTicket(newTicket);
      }
    });

  } catch (error) {
    console.error('❌ IMAP Listener Error:', error.message);
  }
}