import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Email ke reply me se purani history (e.g. "On ... wrote:") ko hatane ke liye helper
function cleanEmailReply(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const cleanLines = [];
  for (const line of lines) {
    if (
      /^On\s.+wrote:/i.test(line.trim()) ||
      /^---+\s*Original Message\s*---+/i.test(line.trim()) ||
      /^From:\s/i.test(line.trim()) ||
      /^-{10,}/.test(line.trim())
    ) {
      break;
    }
    cleanLines.push(line);
  }
  const result = cleanLines.join('\n').trim();
  return result || text.trim();
}

export async function startInboundEmailListener({ user, pass, onNewTicket, onTicketReply }) {
  if (!user || user.includes('YOUR_GMAIL') || !pass || pass.includes('xxxx')) {
    console.log('⚠️ [IMAP] Real Gmail ya App Password provide nahi kiya gaya. Email listener pause hai.');
    return;
  }

  const processedUids = new Set();
  let isChecking = false;
  let client = null;
  let syncInterval = null;
  let reconnectTimer = null;

  function createClient() {
    return new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: user.trim(),
        pass: pass.replace(/\s+/g, '')
      },
      logger: false,
      emitLogs: false
    });
  }

  async function checkEmails(reason = 'poll') {
    if (isChecking || !client || !client.usable) return;
    isChecking = true;

    let lock = null;
    try {
      lock = await client.getMailboxLock('INBOX');

      // Gmail ko force refresh karein (Sync snapshot)
      try {
        await client.noop();
      } catch (_) {}

      // 1. Unread emails
      const unreadUids = (await client.search({ seen: false }, { uid: true })) || [];

      // 2. Pichle 12 ghante ki recent emails (chahe mobile se khul chuki hon)
      const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const recentUids = (await client.search({ since: halfDayAgo }, { uid: true })) || [];

      // Dono ko combine karein
      const allUids = Array.from(new Set([...unreadUids, ...recentUids]));

      // Sirf wo emails jo pehle process nahi hui
      const pendingUids = allUids.filter(uid => !processedUids.has(uid));

      if (pendingUids.length === 0) {
        return;
      }

      console.log(`\n⚡ [IMAP] ${pendingUids.length} new email(s) detected via [${reason}]! Downloading...`);

      // STEP 1: Tamam pending messages ko safely memory me download karein
      const downloadedMessages = [];
      const messagesStream = client.fetch(pendingUids, {
        envelope: true,
        source: true,
        uid: true
      }, { uid: true });

      for await (let msg of messagesStream) {
        processedUids.add(msg.uid);
        downloadedMessages.push(msg);
      }

      // STEP 2: Lock foran release karein taake connection free ho jaye
      if (lock) {
        try { lock.release(); lock = null; } catch (_) {}
      }

      // STEP 3: Ab har download shuda email ko process karein
      for (const message of downloadedMessages) {
        try {
          const parsed = await simpleParser(message.source);

          const fromEmail = parsed.from?.value?.[0]?.address || parsed.from?.text || 'unknown@mail.com';
          const fromName = parsed.from?.value?.[0]?.name || fromEmail.split('@')[0];
          const subject = parsed.subject || 'New Support Ticket via Email';
          const rawBody = parsed.text || parsed.html || 'No text content provided.';

          console.log(`\n📥 LIVE EMAIL DETECTED!`);
          console.log(`   From: ${fromName} <${fromEmail}>`);
          console.log(`   Subject: ${subject}`);

          // ================================================================
          // CHECK: Kya customer kisi purani ticket ka reply kar raha hai?
          // ================================================================
          const ticketIdMatch = subject.match(/#(\d+)/);

          if (ticketIdMatch && ticketIdMatch[1] && onTicketReply) {
            const ticketId = ticketIdMatch[1];
            const cleanReply = cleanEmailReply(rawBody);

            console.log(`💬 [2-WAY CONVERSATION] Customer replied to Ticket #${ticketId}!`);
            await onTicketReply({
              ticketId: Number(ticketId),
              author: fromName,
              email: fromEmail,
              text: cleanReply,
              rawText: rawBody,
              timestamp: new Date().toISOString()
            });
          } else {
            // Agar Subject mein Ticket ID nahi hai to NAYA TICKET create hoga
            let priority = 'Medium';
            const fullText = `${subject} ${rawBody}`.toLowerCase();
            if (/urgent|critical|crash|down|emergency/i.test(fullText)) {
              priority = 'Critical';
            } else if (/error|bug|issue|help|not working|problem/i.test(fullText)) {
              priority = 'High';
            }

            const newTicket = {
              title: subject,
              subject: subject,
              description: rawBody,
              customerEmail: fromEmail,
              customerName: fromName,
              priority: priority,
              channel: 'Email'
            };

            if (onNewTicket) {
              await onNewTicket(newTicket);
            }
          }

        } catch (msgErr) {
          console.error(`❌ Error parsing email #${message.uid}:`, msgErr.message);
        }
      }

    } catch (fetchErr) {
      console.error('❌ Fetch Error:', fetchErr.message);
    } finally {
      if (lock) {
        try { lock.release(); } catch (_) {}
      }
      isChecking = false;
    }
  }

  function scheduleReconnect(delayMs = 10000) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delayMs);
  }

  async function connect() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }

    if (client) {
      try {
        client.removeAllListeners();
        await client.logout();
      } catch (_) {}
      client = null;
    }

    try {
      client = createClient();

      client.on('close', () => {
        console.log('⚠️ IMAP connection closed. Reconnecting in 10s...');
        scheduleReconnect(10000);
      });

      client.on('error', (err) => {
        console.error('⚠️ IMAP client error:', err.message);
      });

      await client.connect();
      console.log(`\n📬 INBOUND LISTENER ACTIVE! Connected to: ${user}`);

      // Pehli baar startup par check
      await checkEmails('startup');

      // Live push event jab Gmail se notification aaye
      client.on('exists', async (data) => {
        console.log(`\n🔔 [Gmail Live Notification] New email event received! Count: ${data.count}`);
        await checkEmails('gmail-push');
      });

      // Har 3 second baad Gmail ko check karega
      syncInterval = setInterval(async () => {
        try {
          if (client && client.usable) {
            await checkEmails('live-sync');
          }
        } catch (e) {
          // ignore
        }
      }, 3000);

    } catch (error) {
      console.error('❌ IMAP Connection Error:', error.message);
      scheduleReconnect(10000);
    }
  }

  await connect();
}