import nodemailer from 'nodemailer';

const sendEmailWrapper = async ({ email, username, subject, htmlContent }) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = (
    process.env.SENDER_EMAIL ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    'behindthespecs.2026@gmail.com'
  ).trim();

  if (!brevoApiKey) {
    console.error('❌ BREVO_API_KEY is not configured in environment variables.');
    return { sent: false, reason: 'BREVO_API_KEY missing' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey.trim(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Running Territory', email: senderEmail },
        to: [{ email, name: username }],
        subject,
        htmlContent
      })
    });

    if (response.ok || response.status === 201) {
      console.log(`✅ Brevo API email successfully dispatched to ${email}`);
      return { sent: true };
    } else {
      const errorData = await response.json();
      console.error('❌ Brevo API error response:', errorData);
      return { sent: false, error: errorData.message || 'Brevo API error' };
    }
  } catch (err) {
    console.error('❌ Brevo API request exception:', err.message);
    return { sent: false, error: err.message };
  }
};

export const sendVerificationEmail = async (email, username, code) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #2563eb; text-align: center; margin-top: 0;">🏃‍♂️ Running Territory</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${username}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">Thank you for signing up! Use the 6-digit verification code below to activate your account:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 12px 24px; border-radius: 10px; border: 2px dashed #2563eb; display: inline-block;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">This code will expire in 15 minutes.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this code, please ignore this email.</p>
    </div>
  `;

  return await sendEmailWrapper({
    email,
    username,
    subject: '🔐 Verify Your Running Territory Account',
    htmlContent
  });
};

export const sendPasswordResetEmail = async (email, username, code) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #2563eb; text-align: center; margin-top: 0;">🏃‍♂️ Running Territory</h2>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${username}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">We received a request to reset your password. Use the 6-digit reset code below to create a new password:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 10px; border: 2px dashed #dc2626; display: inline-block;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">This code will expire in 15 minutes.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request a password reset, your account is secure and you can safely ignore this email.</p>
    </div>
  `;

  return await sendEmailWrapper({
    email,
    username,
    subject: '🔑 Reset Your Running Territory Password',
    htmlContent
  });
};
