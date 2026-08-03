import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, username, code) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  console.log('\n---------------------------------------------------------');
  console.log(`✉️  EMAIL VERIFICATION OTP FOR ${username} (${email}): [ ${code} ]`);
  console.log('---------------------------------------------------------\n');

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

  // Option 1: Brevo HTTP API (Port 443 HTTPS - Works 100% on Render Free Tier to ANY email)
  if (brevoApiKey) {
    try {
      console.log(`Attempting email dispatch via Brevo HTTP API (Port 443) to ${email}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Running Territory', email: smtpUser || 'noreply@runningterritory.com' },
          to: [{ email: email, name: username }],
          subject: '🔐 Verify Your Running Territory Account',
          htmlContent: htmlContent
        })
      });

      if (response.ok || response.status === 201) {
        console.log(`✅ Brevo HTTP API verification email successfully sent to ${email}`);
        return { sent: true };
      } else {
        const errorData = await response.json();
        console.error('❌ Brevo API error response:', errorData);
      }
    } catch (err) {
      console.error('❌ Brevo API request exception:', err.message);
    }
  }

  // Option 2: Resend HTTP API (Port 443 HTTPS)
  if (resendApiKey) {
    try {
      console.log(`Attempting email dispatch via Resend HTTP API to ${email}...`);
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
          html: htmlContent
        })
      });

      if (response.ok) {
        console.log(`✅ Resend API verification email successfully sent to ${email}`);
        return { sent: true };
      } else {
        const errorData = await response.json();
        console.error('❌ Resend API error response:', errorData);
      }
    } catch (err) {
      console.error('❌ Resend API error:', err.message);
    }
  }

  // Option 3: Nodemailer Direct SMTP (May be blocked by Render free firewall on Ports 465/587)
  if (smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes('gmail') || (smtpUser && smtpUser.endsWith('@gmail.com'));
      console.log(`Attempting email dispatch via Nodemailer ${isGmail ? 'Gmail Service' : `SMTP (${smtpHost}:${smtpPort})`} to ${email}...`);

      const transportOptions = isGmail
        ? {
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000
          };

      const transporter = nodemailer.createTransport(transportOptions);

      const mailOptions = {
        from: `"Running Territory" <${smtpUser}>`,
        to: email,
        subject: '🔐 Verify Your Running Territory Account',
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Nodemailer SMTP verification email successfully sent to ${email}`);
      return { sent: true };
    } catch (err) {
      console.error('❌ Nodemailer SMTP Error (Port block detected):', err.message);
      return { sent: false, error: err.message };
    }
  }

  console.log('❌ No working email credentials configured.');
  return { sent: false, reason: 'No email credentials configured.' };
};
