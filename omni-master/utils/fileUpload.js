const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  contentType: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FileUpload', fileUploadSchema);
