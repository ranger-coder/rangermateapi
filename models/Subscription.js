const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
    required: true
  },
  planType: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'canceled'],
    default: 'active'
  },
  restrictions: {
    productivityToolsAllowed: {
      type: Boolean,
      default: false // restricted for free, true for paid
    },
    maxNotes: {
      type: Number,
      default: 5 // 5 for free, unlimited (-1) for paid
    },
    maxHomeworks: {
      type: Number,
      default: 10
    },
    aiAssistantQuota: {
      type: Number,
      default: 10 // prompts per day for free, unlimited (-1) for paid
    }
  },
  updatedBy: {
    type: String,
    default: 'registration'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema, 'subscriptions');
