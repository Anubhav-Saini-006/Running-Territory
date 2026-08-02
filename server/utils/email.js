import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, username, code) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log('\n---------------------------------------------------------');
  console.log(`✉️  EMAIL VERIFICATION OTP FOR ${username} (${email}): [ ${code} ]`);
  console.log('---------------------------------------------------------\n');

  // Option 1: Resend API (HTTPS Port 443 - Recommended for Render/Vercel)
  if (resendApiKey) {
    try {
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
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #2563eb; text-align: center;">🏃‍♂️ Running Territory</h2>
              <p>Hello <strong>${username}</strong>,</p>
              <p>Thank you for registering! Please use the following 6-digit verification code to complete your registration:</p>
              <div style="text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 10px 20px; border-radius: 8px; border: 1px dashed #2563eb;">${code}</span>
              </div>
              <p style="font-size: 13px; color: #64748b;">This code will expire in 15 minutes.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this email, please ignore it.</p>
            </div>
          `
        })
      });

      if (response.ok) {
        console.log(`✅ Resend API verification email dispatched to ${email}`);
        return { sent: true };
      } else {
        const errorData = await response.json();
        console.error('Resend API error response:', errorData);
      }
    } catch (err) {
      console.error('Resend API error:', err.message);
    }
  }

  // Option 2: Nodemailer SMTP
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3000
      });

      const mailOptions = {
        from: `"Running Territory" <${user}>`,
        to: email,
        subject: '🔐 Verify Your Running Territory Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">🏃‍♂️ Running Territory</h2>
            <p>Hello <strong>${username}</strong>,</p>
            <p>Thank you for registering! Please use the following 6-digit verification code to complete your registration:</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 10px 20px; border-radius: 8px; border: 1px dashed #2563eb;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">This code will expire in 15 minutes.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this email, please ignore it.</p>
          </div>
        `
      };

      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timeout (3s limit reached)')), 3000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ Real verification email dispatched to ${email}`);
      return { sent: true };
    } catch (err) {
      console.error('Nodemailer SMTP dispatch warning/error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  return { sent: false, reason: 'No SMTP or Resend credentials configured in .env' };
};
