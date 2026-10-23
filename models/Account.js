const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    default: 'Rangermate Academy'
  },
  appName: {
    type: String,
    default: 'mcode'
  },
  logoUrl: {
    type: String,
    default: ''
  },
  faviconUrl: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'Institution / School'
  },
  databaseName: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

accountSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Account', accountSchema, 'accounts');
