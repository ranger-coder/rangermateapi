const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    lowercase: true,
    trim: true
  },
  studentName: {
    type: String,
    default: 'Student'
  },
  databaseName: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

pointSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Point', pointSchema, 'points');
