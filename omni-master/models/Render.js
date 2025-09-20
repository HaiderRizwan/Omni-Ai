const mongoose = require('mongoose');

const renderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  avatar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Avatar',
    required: true
  },
  script: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'tts_done', 'a2e_started', 'rendering', 'compositing', 'succeeded', 'failed'],
    default: 'queued',
    required: true
  },
  tts_url: String,
  provider_job_id: String,
  video_url_master: String,
  video_url_hls: String,
  captions_vtt_url: String,
  error: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Render', renderSchema);


