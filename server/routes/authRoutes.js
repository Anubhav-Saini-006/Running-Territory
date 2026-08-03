import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { sendVerificationEmail } from '../utils/email.js';

const router = express.Router();

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'running_territory_super_secret_jwt_key_2026';
  return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user and send Gmail OTP verification code
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      if (!existingEmail.isVerified) {
        // Resend code if account registered previously but not yet verified
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        existingEmail.verificationToken = otpCode;
        existingEmail.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await existingEmail.save();

        const emailResult = await sendVerificationEmail(existingEmail.email, existingEmail.username, otpCode);

        return res.status(200).json({
          requiresVerification: true,
          email: existingEmail.email,
          demoCode: emailResult.sent ? null : otpCode,
          message: emailResult.sent
            ? `A 6-digit verification code has been sent to ${existingEmail.email}.`
            : `Account unverified. Verification Code: ${otpCode}`
        });
      }
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken: otpCode,
      verificationTokenExpires: tokenExpires
    });

    const emailResult = await sendVerificationEmail(user.email, user.username, otpCode);

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      demoCode: emailResult.sent ? null : otpCode,
      message: emailResult.sent
        ? `Registration successful! A 6-digit verification code was sent to ${user.email}.`
        : `Registration successful! Verification Code: ${otpCode}`
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

    const user = await User.findOne({ email });
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This email account is already verified' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationToken = otpCode;
    user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const emailResult = await sendVerificationEmail(user.email, user.username, otpCode);

    res.json({
      demoCode: emailResult.sent ? null : otpCode,
      message: emailResult.sent
        ? `A new 6-digit verification code has been sent to ${user.email}.`
        : `New Verification Code: ${otpCode}`
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error resending verification code' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & check verification status
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      const otpCode = user.verificationToken || Math.floor(100000 + Math.random() * 900000).toString();
      if (!user.verificationToken) {
        user.verificationToken = otpCode;
        user.verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
      }

      const emailResult = await sendVerificationEmail(user.email, user.username, otpCode);

      return res.status(400).json({
        requiresVerification: true,
        email: user.email,
        demoCode: emailResult.sent ? null : otpCode,
        message: emailResult.sent
          ? 'Your email is not verified yet. A verification code was sent to your email.'
          : `Verification Code Required: ${otpCode}`
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
