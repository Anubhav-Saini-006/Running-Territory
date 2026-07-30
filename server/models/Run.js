import mongoose from 'mongoose';

const routePointSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const runSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  distance: {
    type: Number, // in meters
    required: true
  },
  averagePace: {
    type: Number, // in minutes per kilometer
    required: true
  },
  route: [routePointSchema]
}, {
  timestamps: true
});

const Run = mongoose.model('Run', runSchema);
export default Run;
