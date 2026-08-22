import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  bio: {
    type: String,
    default: 'Runner exploring territories one kilometer at a time.'
  },
  profilePicture: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  },
  totalDistance: {
    type: Number, // in meters
    default: 0
  },
  totalRuns: {
    type: Number,
    default: 0
  },
  longestRun: {
    type: Number, // in meters
    default: 0
  },
  averagePace: {
    type: Number, // min/km
    default: 0
  },
  currentStreak: {
    type: Number, // consecutive days
    default: 1
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null,
    index: { expires: 0 } // MongoDB TTL index: Automatically deletes unverified accounts when expiration time passes
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
export default User;
