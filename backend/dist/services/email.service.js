"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUserCredentials = exports.sendAdminCredentials = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create reusable transporter using Gmail SMTP
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS, // Gmail App Password (not regular password)
        },
    });
};
const sendAdminCredentials = async (toEmail, adminName, password) => {
    const transporter = createTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
    const fromEmail = process.env.SMTP_USER;
    const mailOptions = {
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
    await transporter.sendMail(mailOptions);
};
exports.sendAdminCredentials = sendAdminCredentials;
const sendUserCredentials = async (toEmail, userName, password) => {
    const transporter = createTransporter();
    const fromName = process.env.SMTP_FROM_NAME || 'SRF Platform';
    const fromEmail = process.env.SMTP_USER;
    const mailOptions = {
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
    await transporter.sendMail(mailOptions);
};
exports.sendUserCredentials = sendUserCredentials;
