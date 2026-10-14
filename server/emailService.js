import nodemailer from 'nodemailer';

// Auto-generated test account (No credentials required from you!)
let transporter = null;

async function getTransporter() {
  if (!transporter) {
    // Ye line automatically ek fake test account generate karti hai bina kisi password ke:
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user, // Auto generated dummy user
        pass: testAccount.pass  // Auto generated dummy pass
      }
    });

    console.log('✅ Test Email Sandbox Ready!');
  }
  return transporter;
}

/**
 * Ticket Notification Email Bhejne ke liye function
 */
export async function sendTicketNotification({ to, subject, ticket }) {
  try {
    const mailTransporter = await getTransporter();

    const info = await mailTransporter.sendMail({
      from: '"Support System" <no-reply@ticketmanagement.local>',
      to: to || 'agent@example.com',
      subject: subject || `[Ticket #${ticket.id}] Update Notification`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Ticket Notification</h2>
          <p><strong>Ticket ID:</strong> #${ticket.id}</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Priority:</strong> <span style="color: red; font-weight: bold;">${ticket.priority}</span></p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><strong>Assignee:</strong> ${ticket.assignee || 'Unassigned'}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="color: #64748b; font-size: 13px;">This is an automated notification from Ticket Management System.</p>
        </div>
      `
    });

    console.log(`📨 Notification Email Sent: Message ID: ${info.messageId}`);
    
    // Yahan magic link print hoga:
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`🔗 PREVIEW YOUR EMAIL HERE: \x1b[36m${previewUrl}\x1b[0m`);

    return { success: true, previewUrl };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error };
  }
}

