import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // 1. Agar .env me real Gmail credentials hain to real mail bhejega:
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    console.log('✅ Live Email Service Ready (Using Gmail)');
    return transporter;
  }

  // 2. Agar credentials nahi hain to Automatic Test Sandbox create karega:
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('✅ Test Email Sandbox Ready!');
  } catch (err) {
    console.warn('⚠️ Fallback transporter initialized.');
  }

  return transporter;
}

// ========================================================
// 1. TICKET CREATION CONFIRMATION EMAIL (TO CUSTOMER)
// ========================================================
export async function sendTicketCreatedEmail({ to, ticket }) {
  try {
    const mailTransporter = await getTransporter();
    if (!mailTransporter) return { success: false };

    const customerEmail = to || ticket.email;
    if (!customerEmail || customerEmail.includes('whatsapp.support') || customerEmail === 'customer@example.com') {
      return { success: false, message: 'Invalid customer email' };
    }

    const customerName = ticket.customer || ticket.customerName || 'Valued Customer';
    const ticketId = ticket.id;
    const subjectText = ticket.subject || ticket.title || 'Support Request';

    const info = await mailTransporter.sendMail({
      from: '"Support Desk" <no-reply@supportdesk.com>',
      to: customerEmail,
      subject: `[Ticket Received: #${ticketId}] ${subjectText}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Support Desk Confirmation</h2>
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Dear <strong>${customerName}</strong>,</p>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 18px 0;">
            Thank you for contacting our support team. Your support request has been successfully received and registered under ticket <strong>#${ticketId}</strong>.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 35%;">Ticket ID:</td>
                <td style="padding: 6px 0; color: #2563eb; font-weight: bold;">#${ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 6px 0;">${subjectText}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 6px 0;"><span style="color: #b45309; font-weight: bold;">${ticket.priority || 'Medium'}</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Channel:</td>
                <td style="padding: 6px 0;">${ticket.channel || 'Web Portal'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Current Status:</td>
                <td style="padding: 6px 0;"><span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-weight: bold; font-size: 11px;">OPEN</span></td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Our support agents are currently reviewing your request. You can track the status of this ticket anytime on our Customer Portal using your Ticket ID: <strong>#${ticketId}</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Best regards,<br />
            <strong>Customer Support Team</strong>
          </p>
        </div>
      `
    });

    console.log(`✉️ Ticket Created Email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send Ticket Created email:', error.message);
    return { success: false, error: error.message };
  }
}

// ========================================================
// 2. TICKET IN PROGRESS STATUS UPDATE EMAIL (TO CUSTOMER)
// ========================================================
export async function sendTicketInProgressEmail({ to, ticket }) {
  try {
    const mailTransporter = await getTransporter();
    if (!mailTransporter) return { success: false };

    const customerEmail = to || ticket.email;
    if (!customerEmail || customerEmail.includes('whatsapp.support') || customerEmail === 'customer@example.com') {
      return { success: false };
    }

    const customerName = ticket.customer || ticket.customerName || 'Valued Customer';
    const ticketId = ticket.id;
    const subjectText = ticket.subject || ticket.title || 'Support Request';

    const info = await mailTransporter.sendMail({
      from: '"Support Desk" <no-reply@supportdesk.com>',
      to: customerEmail,
      subject: `[In Progress: Ticket #${ticketId}] ${subjectText}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #d97706; margin: 0; font-size: 20px;">Ticket Status Update: In Progress</h2>
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Dear <strong>${customerName}</strong>,</p>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 18px 0;">
            This is an automated update regarding your support ticket <strong>#${ticketId}: "${subjectText}"</strong>.
          </p>

          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
              ⚙️ A dedicated support specialist is actively working on your issue.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #78350f;">
              Assigned Specialist: <strong>${ticket.assignee || 'Assigned Support Specialist'}</strong><br />
              Status: <strong style="color: #d97706;">IN PROGRESS</strong>
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Best regards,<br />
            <strong>Customer Support Team</strong>
          </p>
        </div>
      `
    });

    console.log(`✉️ Ticket In Progress Email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send Ticket In Progress email:', error.message);
    return { success: false, error: error.message };
  }
}

// ========================================================
// 3. TICKET RESOLVED STATUS EMAIL (TO CUSTOMER)
// ========================================================
export async function sendTicketResolvedEmail({ to, ticket }) {
  try {
    const mailTransporter = await getTransporter();
    if (!mailTransporter) return { success: false };

    const customerEmail = to || ticket.email;
    if (!customerEmail || customerEmail.includes('whatsapp.support') || customerEmail === 'customer@example.com') {
      return { success: false };
    }

    const customerName = ticket.customer || ticket.customerName || 'Valued Customer';
    const ticketId = ticket.id;
    const subjectText = ticket.subject || ticket.title || 'Support Request';

    const info = await mailTransporter.sendMail({
      from: '"Support Desk" <no-reply@supportdesk.com>',
      to: customerEmail,
      subject: `[Resolved: Ticket #${ticketId}] ${subjectText}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #059669; margin: 0; font-size: 20px;">✓ Your Ticket Has Been Resolved</h2>
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Dear <strong>${customerName}</strong>,</p>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 18px 0;">
            We are pleased to inform you that your support ticket <strong>#${ticketId}</strong> has been marked as <strong>RESOLVED</strong> by our support team.
          </p>

          <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            If you still experience issues or have further questions, feel free to reply directly to this email to continue the conversation.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Best regards,<br />
            <strong>Customer Support Operations</strong>
          </p>
        </div>
      `
    });

    console.log(`✉️ Ticket Resolved Email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send Ticket Resolved email:', error.message);
    return { success: false, error: error.message };
  }
}

// ========================================================
// 4. GENERAL STATUS ROUTER NOTIFICATION
// ========================================================
export async function sendTicketNotification({ to, subject, ticket }) {
  try {
    const status = String(ticket?.status || '').toUpperCase();
    if (status.includes('RESOLV') || status.includes('CLOSE')) {
      return await sendTicketResolvedEmail({ to, ticket });
    } else if (status.includes('PEND') || status.includes('PROGRESS')) {
      return await sendTicketInProgressEmail({ to, ticket });
    } else if (status.includes('OPEN')) {
      return await sendTicketCreatedEmail({ to, ticket });
    }

    const mailTransporter = await getTransporter();
    const info = await mailTransporter.sendMail({
      from: '"Support Desk" <no-reply@supportdesk.com>',
      to: to || 'customer@example.com',
      subject: subject || `[Ticket #${ticket.id}] Update Notification`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Ticket Notification</h2>
          <p><strong>Ticket ID:</strong> #${ticket.id}</p>
          <p><strong>Title:</strong> ${ticket.subject || ticket.title}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
        </div>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ========================================================
// 5. AGENT COMMENT / REPLY EMAIL (TO CUSTOMER)
// ========================================================
export async function sendAgentReplyEmail({ to, ticket, commentText, agentName }) {
  try {
    const mailTransporter = await getTransporter();
    if (!mailTransporter) return { success: false };

    const customerEmail = to || ticket?.email;
    if (!customerEmail || customerEmail.includes('whatsapp.support') || customerEmail === 'customer@example.com') {
      return { success: false };
    }

    const customerName = ticket.customer || ticket.customerName || 'Valued Customer';
    const ticketId = ticket.id;
    const subjectText = ticket.subject || ticket.title || 'Support Request';
    const sender = agentName || ticket.assignee || 'Support Agent';

    const info = await mailTransporter.sendMail({
      from: '"Support Desk" <no-reply@supportdesk.com>',
      to: customerEmail,
      subject: `Re: [Ticket #${ticketId}] ${subjectText}`,
      headers: {
        'In-Reply-To': `<ticket-${ticketId}@supportdesk.com>`,
        'References': `<ticket-${ticketId}@supportdesk.com>`
      },
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Support Response: Ticket #${ticketId}</h2>
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px 0;">Dear <strong>${customerName}</strong>,</p>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
            <strong>${sender}</strong> has replied to your ticket:
          </p>

          <div style="background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px; padding: 14px 16px; margin-bottom: 20px; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${commentText}</div>

          <div style="background: #eff6ff; border: 1px dashed #93c5fd; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #1d4ed8; font-weight: 500;">
              💬 You can reply directly to this email to continue the conversation with the agent.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Best regards,<br />
            <strong>Customer Support Team</strong>
          </p>
        </div>
      `
    });

    console.log(`✉️ Agent Reply Email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send Agent Reply email:', error.message);
    return { success: false, error: error.message };
  }
}