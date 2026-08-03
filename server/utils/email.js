import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, username, code) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  console.log('\n---------------------------------------------------------');
  console.log(`✉️  EMAIL VERIFICATION OTP FOR ${username} (${email}): [ ${code} ]`);
  console.log('---------------------------------------------------------\n');

  // Method 1: Resend API (HTTPS Port 443)
  if (resendApiKey) {
    try {
      console.log(`Attempting email dispatch via Resend API to ${email}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Running Territory <onboarding@resend.dev>',
          to: [email],
          subject: '🔐 Verify Your Running Territory Account',
          html: `
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
          `
        })
      });

      if (response.ok) {
        console.log(`✅ Resend API verification email successfully sent to ${email}`);
        return { sent: true };
      } else {
        const errorData = await response.json();
        console.warn('⚠️  Resend API warning/error (falling back to Nodemailer SMTP):', errorData.message || errorData);
      }
    } catch (err) {
      console.warn('⚠️  Resend API request exception (falling back to Nodemailer SMTP):', err.message);
    }
  }

  // Method 2: Nodemailer SMTP (Gmail / Custom SMTP)
  if (smtpUser && smtpPass) {
    try {
      console.log(`Attempting email dispatch via Nodemailer SMTP (${smtpHost}:${smtpPort}) to ${email}...`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for 587
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });

      const mailOptions = {
        from: `"Running Territory" <${smtpUser}>`,
        to: email,
        subject: '🔐 Verify Your Running Territory Account',
        html: `
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
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Nodemailer SMTP verification email successfully sent to ${email}`);
      return { sent: true };
    } catch (err) {
      console.error('❌ Nodemailer SMTP Error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  console.log('❌ Neither Resend API nor Nodemailer SMTP could send the email.');
  return { sent: false, reason: 'No working email credentials configured.' };
};
