const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  render: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Render',
    required: true
  },
  url_master: {
    type: String,
    required: true
  },
  url_hls: {
    type: String
  },
  captions_vtt_url: {
    type: String
  },
  provider: {
    type: String,
    required: true,
    default: 'a2e'
  },
  duration: {
    type: Number
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Video', videoSchema);
