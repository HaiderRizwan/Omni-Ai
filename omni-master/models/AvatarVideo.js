const mongoose = require('mongoose');

const avatarVideoSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  script: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  videoUrl: {
    type: String, // A2E video URL - not stored locally
    default: null
  },
  error: {
    type: String,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  metadata: {
    a2eAnchorId: {
      type: String,
      required: true
    },
    audioMode: {
      type: String,
      enum: ['tts', 'upload'],
      required: true
    },
    voiceId: String, // For TTS mode
    audioFileName: String, // For upload mode
    audioSize: Number, // For upload mode
    audioUrl: String, // Generated TTS or uploaded audio URL
    a2eVideoTaskId: String, // A2E task ID for polling
    options: {
      skipSmartMotion: {
        type: Boolean,
        default: true
      },
      enableCaptions: {
        type: Boolean,
        default: false
      },
      resolution: {
        type: Number,
        enum: [720, 1080],
        default: 1080
      },
      captionOptions: {
        language: {
          type: String,
          default: 'en-US'
        },
        color: {
          type: String,
          default: '#FFFFFF'
        },
        outlineColor: {
          type: String,
          default: '#000000'
        },
        fontSize: {
          type: Number,
          default: 50
        },
        position: {
          type: Number,
          default: 0.3
        },
        font: {
          type: String,
          default: 'Arial'
        }
      }
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
avatarVideoSchema.index({ user: 1, createdAt: -1 });
avatarVideoSchema.index({ user: 1, status: 1 });
avatarVideoSchema.index({ 'metadata.a2eVideoTaskId': 1 });

module.exports = mongoose.model('AvatarVideo', avatarVideoSchema);
