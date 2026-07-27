import nodemailer from 'nodemailer';

export interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const getEmailEndpoint = () => process.env.EMAIL_API_ENDPOINT || 'https://mail-service-1.vercel.app/send-email';

const getEmailCredentials = () => ({
  service: 'gmail',
  user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
  pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
});

// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS, // Gmail App Password
    },
  });
};

/**
 * Modern HTML Template for emails
 */
export const emailUITemplate = (content: string, title = 'SRF Platform'): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 36px 32px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.5px; }
        .header p { color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 0; }
        .body { padding: 36px 32px; font-size: 15px; line-height: 1.6; color: #334155; }
        .footer { text-align: center; padding: 24px 32px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
        .footer p { margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>🏛️ ${title}</h1>
          <p>States' Startup Ranking Framework</p>
        </div>
        <div class="body">
          ${content}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${title}. All rights reserved.</p>
          <p>This is an automated message, please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send email using the external API endpoint
 */
export const sendEmailViaAPI = async (mailOptions: MailOptions) => {
  const endpoint = getEmailEndpoint();
  const credentials = getEmailCredentials();

  const defaultFromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
  const defaultFromEmail = process.env.EMAIL_USER || process.env.SMTP_USER;

  const payloadMailOptions = {
    from: mailOptions.from || `"${defaultFromName}" <${defaultFromEmail}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    ...(mailOptions.text ? { text: mailOptions.text } : {})
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials,
        mailOptions: payloadMailOptions,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.status === false) {
      throw new Error(`Email API error: ${result.error || result.message || 'Unknown error'}`);
    }

    return result;
  } catch (error: any) {
    console.error('Email sending failed via API:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send email trying API first, falling back to SMTP Nodemailer if API fails
 */
export const sendEmail = async (mailOptions: MailOptions) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
  const fromEmail = process.env.EMAIL_USER || process.env.SMTP_USER;

  const fullMailOptions: MailOptions = {
    from: mailOptions.from || `"${fromName}" <${fromEmail}>`,
    ...mailOptions,
  };

  try {
    return await sendEmailViaAPI(fullMailOptions);
  } catch (apiError) {
    console.warn('API email delivery failed, attempting fallback via Nodemailer SMTP:', apiError);
    const transporter = createTransporter();
    return await transporter.sendMail(fullMailOptions);
  }
};

/**
 * Send Welcome Email
 */
export const sendWelcomeEmail = async (email: string, userName = 'User') => {
  try {
    const welcomeContent = `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${userName}! 🎉</h2>
      <p>We are thrilled to have you join our platform. Your account has been created and is ready to use.</p>
      <p style="margin-top: 24px;">If you have any questions or need assistance getting started, feel free to reach out to our team.</p>
      <p style="margin-top: 24px; font-weight: 600;">Best regards,<br>Softpage Team</p>
    `;

    const mailOptions: MailOptions = {
      from: `"Softpage Team" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Softpage!',
      html: emailUITemplate(welcomeContent, 'Softpage')
    };

    const response = await sendEmailViaAPI(mailOptions);
    return { success: true, message: 'Welcome email sent successfully', ...response };
  } catch (error: any) {
    console.error('Send welcome email error:', error);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
};

export const sendAdminCredentials = async (
  toEmail: string,
  adminName: string,
  password: string
) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
  const fromEmail = process.env.EMAIL_USER || process.env.SMTP_USER;

  const mailOptions: MailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: 'Your SRF Platform Admin Account Has Been Created',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 22px; margin: 0 0 6px; }
          .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
          .body { padding: 40px; }
          .body p { color: #475569; font-size: 15px; line-height: 1.6; }
          .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .cred-row:last-child { border-bottom: none; }
          .cred-label { font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
          .cred-value { font-size: 15px; font-weight: 600; color: #1e293b; font-family: monospace; }
          .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 16px; }
          .footer { text-align: center; padding: 20px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🏛️ SRF Platform</h1>
            <p>States' Startup Ranking Framework</p>
          </div>
          <div class="body">
            <p>Dear <strong>${adminName}</strong>,</p>
            <p>Your Admin account on the <strong>SRF Platform</strong> has been created by the Super Administrator. You can now log in using the credentials below.</p>
            
            <div class="cred-box">
              <div class="cred-row">
                <span class="cred-label">LOGIN EMAIL</span>
                <span class="cred-value">${toEmail}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">TEMPORARY PASSWORD</span>
                <span class="cred-value">${password}</span>
              </div>
            </div>

            <div class="warning">
              ⚠️ <strong>Important:</strong> This is a temporary password. Please log in immediately and change it from your profile settings for security.
            </div>
            
            <p style="margin-top: 24px;">If you have any questions, please contact the Super Administrator directly.</p>
          </div>
          <div class="footer">
            This is an automated message from the SRF Platform. Do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await sendEmail(mailOptions);
};

export const sendUserCredentials = async (
  toEmail: string,
  userName: string,
  password: string
) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
  const fromEmail = process.env.EMAIL_USER || process.env.SMTP_USER;

  const mailOptions: MailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: 'Your SRF Platform User Account Has Been Created',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #059669, #10b981); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 22px; margin: 0 0 6px; }
          .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
          .body { padding: 40px; }
          .body p { color: #475569; font-size: 15px; line-height: 1.6; }
          .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .cred-row:last-child { border-bottom: none; }
          .cred-label { font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
          .cred-value { font-size: 15px; font-weight: 600; color: #1e293b; font-family: monospace; }
          .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 16px; }
          .footer { text-align: center; padding: 20px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🏛️ SRF Platform</h1>
            <p>States' Startup Ranking Framework</p>
          </div>
          <div class="body">
            <p>Dear <strong>${userName}</strong>,</p>
            <p>Your State User account on the <strong>SRF Platform</strong> has been created by the Super Administrator. You can now log in using the credentials below.</p>
            <div class="cred-box">
              <div class="cred-row">
                <span class="cred-label">LOGIN EMAIL</span>
                <span class="cred-value">${toEmail}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">TEMPORARY PASSWORD</span>
                <span class="cred-value">${password}</span>
              </div>
            </div>
            <div class="warning">
              ⚠️ <strong>Important:</strong> This is a temporary password. Please log in immediately and change it from your profile settings for security.
            </div>
            <p style="margin-top: 24px;">If you have any questions, please contact the Super Administrator directly.</p>
          </div>
          <div class="footer">
            This is an automated message from the SRF Platform. Do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await sendEmail(mailOptions);
};

export const sendOtpEmail = async (toEmail: string, otp: string) => {
  const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
  const fromEmail = process.env.EMAIL_USER || process.env.SMTP_USER;

  const mailOptions: MailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: 'Your Password Reset OTP - SRF Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 22px; margin: 0 0 6px; }
          .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
          .body { padding: 40px; text-align: center; }
          .body p { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b; margin: 0 auto 24px; max-width: 250px; }
          .warning { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400e; }
          .footer { text-align: center; padding: 20px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🏛️ SRF Platform</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="body">
            <p>You requested to change your password. Use the following One-Time Password (OTP) to proceed:</p>
            <div class="otp-box">
              ${otp}
            </div>
            <div class="warning">
              ⚠️ <strong>Note:</strong> This OTP is valid for 10 minutes. If you did not request this, please ignore this email.
            </div>
          </div>
          <div class="footer">
            This is an automated message from the SRF Platform. Do not reply to this email.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await sendEmail(mailOptions);
};
