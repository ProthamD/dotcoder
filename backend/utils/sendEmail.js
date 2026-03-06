import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: `".coder" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
    });
};

export const sendVerificationEmail = async (user, token) => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; background: #0d0d0d; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 32px; font-weight: 900; margin: 0;">. <span style="background: linear-gradient(135deg, #ff9843, #ffdd95); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">coder</span></h1>
            </div>
            <h2 style="text-align: center; color: #ffffff; margin-bottom: 16px;">Verify Your Email</h2>
            <p style="color: #b4b4b4; text-align: center; margin-bottom: 32px;">
                Hi ${user.name}, please verify your email address to complete your account setup.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ff9843, #ffdd95); color: #0d0d0d; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Verify Email
                </a>
            </div>
            <p style="color: #737373; text-align: center; font-size: 14px;">
                This link expires in 24 hours. If you didn't create an account, ignore this email.
            </p>
        </div>
    `;

    await sendEmail({
        to: user.email,
        subject: 'Verify your .coder email',
        html
    });
};

export const sendOTPEmail = async (email, otp) => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; background: #0d0d0d; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 32px; font-weight: 900; margin: 0;">. <span style="background: linear-gradient(135deg, #ff9843, #ffdd95); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">coder</span></h1>
            </div>
            <h2 style="text-align: center; color: #ffffff; margin-bottom: 16px;">Your Verification Code</h2>
            <p style="color: #b4b4b4; text-align: center; margin-bottom: 32px;">
                Use the code below to verify your email and create your .coder account.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; padding: 16px 40px; background: #1a1a1a; border: 2px solid rgba(255, 152, 67, 0.3); border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #ff9843;">
                    ${otp}
                </div>
            </div>
            <p style="color: #737373; text-align: center; font-size: 14px;">
                This code expires in 10 minutes. If you didn't request this, ignore this email.
            </p>
        </div>
    `;

    await sendEmail({
        to: email,
        subject: 'Your .coder verification code',
        html
    });
};

export default sendEmail;
