const Render = require('../models/Render');

// @desc    Create a new render job
// @route   POST /api/renders
// @access  Private (Premium)
const createRender = async (req, res) => {
  try {
    const { avatarId, script } = req.body;

    if (!avatarId || !script) {
      return res.status(400).json({ success: false, message: 'Avatar ID and script are required.' });
    }

    // For now, we will add the job directly to the DB.
    // In a real implementation, this would be pushed to a BullMQ queue.
    const render = await Render.create({
      user: req.user._id,
      avatar: avatarId,
      script: script,
      status: 'queued'
    });
    
    // Kick off the background process (we'll simulate this for now)
    // In a real app, this would be handled by the queue worker.
    require('../controllers/videoController').processRenderJob(render._id);

    res.status(202).json({
      success: true,
      message: 'Render job created successfully.',
      data: { renderId: render._id, status: render.status }
    });

  } catch (error) {
    console.error('Error creating render job:', error);
    res.status(500).json({ success: false, message: 'Failed to create render job.' });
  }
};

// @desc    Get the status of a render job
// @route   GET /api/renders/:id
// @access  Private
const getRender = async (req, res) => {
    try {
        const render = await Render.findOne({ _id: req.params.id, user: req.user._id });
        if (!render) {
            return res.status(404).json({ success: false, message: 'Render job not found' });
        }
        res.json({ success: true, data: render });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching render status' });
    }
};

module.exports = {
  createRender,
  getRender
};


