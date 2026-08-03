import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const router = express.Router();

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'running_territory_super_secret_jwt_key_2026';
  return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

// Helper function to escape special regex characters safely
const escapeRegex = (text) => text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// @route   POST /api/auth/register
// @desc    Register a new user and send Gmail OTP verification code
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      if (!existingEmail.isVerified) {
        // Resend code if account registered previously but not yet verified
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        existingEmail.verificationToken = otpCode;
        existingEmail.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await existingEmail.save();

        const emailResult = await sendVerificationEmail(existingEmail.email, existingEmail.username, otpCode);

        if (!emailResult.sent) {
          return res.status(500).json({
            message: emailResult.error || 'Failed to send verification email. Please check server email settings.'
          });
        }

        return res.status(200).json({
          requiresVerification: true,
          email: existingEmail.email,
          message: `A 6-digit verification code has been sent to ${existingEmail.email}.`
        });
      }
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const existingUsername = await User.findOne({ username: new RegExp(`^${escapeRegex(normalizedUsername)}$`, 'i') });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password consistently
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: false,
      verificationToken: otpCode,
      verificationTokenExpires: tokenExpires
    });

    const emailResult = await sendVerificationEmail(user.email, user.username, otpCode);

    if (!emailResult.sent) {
      console.error('Email dispatch failed during registration:', emailResult);
    }

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: `Registration successful! A 6-digit verification code was sent to ${user.email}. Please check your email inbox.`
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify 6-digit email OTP code
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Please provide email and verification code' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedEmail },
        { email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (user.isVerified) {
      const token = generateToken(user._id);
      return res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    }

    if (user.verificationToken !== code.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check your email.' });
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please click Resend Code.' });
    }

    // Activate user account
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend 6-digit email verification OTP
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedEmail },
        { email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User account not found. Please register first.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This email account is already verified' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = otpCode;
    user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const emailResult = await sendVerificationEmail(user.email, user.username, otpCode);

    if (!emailResult.sent) {
      return res.status(500).json({
        message: emailResult.error || 'Failed to send verification email. Please check server email settings.'
      });
    }

    res.json({
      message: `A new 6-digit verification code has been sent to ${user.email}.`
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error resending verification code' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request a 6-digit password reset OTP email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please enter your registered email address or username' });
    }

    const identifier = email.trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
        { email: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
        { username: new RegExp(`^${escapeRegex(identifier)}$`, 'i') }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address or username' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    const emailResult = await sendPasswordResetEmail(user.email, user.username, resetCode);

    if (!emailResult.sent) {
      return res.status(500).json({
        message: emailResult.error || 'Failed to send password reset email. Please try again.'
      });
    }

    res.json({
      email: user.email,
      message: `A 6-digit password reset code has been sent to ${user.email}.`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error requesting password reset' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using 6-digit OTP code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Please fill in all fields (email, code, and new password)' });
    }

    const cleanPassword = newPassword.trim();
    if (cleanPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const identifier = email.trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
        { email: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
        { username: new RegExp(`^${escapeRegex(identifier)}$`, 'i') }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== code.trim()) {
      return res.status(400).json({ message: 'Invalid password reset code' });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Password reset code has expired. Please request a new code.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user by email OR username & check verification status
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    const identifier = email.trim();
    const cleanPassword = password.trim();

    // Flexible lookup matching email OR username (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
        { email: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
        { username: new RegExp(`^${escapeRegex(identifier)}$`, 'i') }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials. User account not found.' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password. Please try again.' });
    }

    if (!user.isVerified) {
      const otpCode = user.verificationToken || Math.floor(100000 + Math.random() * 900000).toString();
      if (!user.verificationToken) {
        user.verificationToken = otpCode;
        user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
      }

      await sendVerificationEmail(user.email, user.username, otpCode);

      return res.status(400).json({
        requiresVerification: true,
        email: user.email,
        message: 'Your email is not verified yet. A 6-digit verification code was sent to your email.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
