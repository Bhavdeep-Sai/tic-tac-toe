const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  messages: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    message: {
      type: String,
      required: true,
      maxlength: 200
    },
    type: {
      type: String,
      enum: ['message', 'emote', 'system'],
      default: 'message'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);