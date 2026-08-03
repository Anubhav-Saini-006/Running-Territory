import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, username, code) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  console.log('\n---------------------------------------------------------');
  console.log(`✉️  GMAIL SMTP OTP FOR ${username} (${email}): [ ${code} ]`);
  console.log('---------------------------------------------------------\n');

  if (smtpUser && smtpPass) {
    try {
      const isGmail = smtpHost.includes('gmail') || (smtpUser && smtpUser.endsWith('@gmail.com'));

      console.log(`Attempting email dispatch via Nodemailer ${isGmail ? 'Gmail Service' : `SMTP (${smtpHost}:${smtpPort})`} to ${email}...`);

      const transportOptions = isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          };

      const transporter = nodemailer.createTransport(transportOptions);

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

  console.log('❌ No SMTP_USER and SMTP_PASS configured in .env');
  return { sent: false, reason: 'No SMTP credentials configured.' };
};
