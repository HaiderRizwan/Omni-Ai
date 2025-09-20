const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE_URL = 'http://localhost:3001/api';
const authToken = 'your_auth_token'; // Replace with a valid auth token

const testA2EImageToVideo = async () => {
  try {
    const imagePath = path.join(__dirname, 'test-image.jpg'); // Replace with a path to your test image
    if (!fs.existsSync(imagePath)) {
      console.error('Test image not found at:', imagePath);
      return;
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    console.log('Sending request to A2E image-to-video endpoint...');
    const response = await axios.post(`${API_BASE_URL}/images/a2e/image-to-video`, formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error testing A2E image-to-video:', error.response ? error.response.data : error.message);
  }
};

testA2EImageToVideo();
