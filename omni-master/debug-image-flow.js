require('dotenv').config();
const mongoose = require('mongoose');
const Image = require('./models/Image');

async function debugImageFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/express_app');
    console.log('Connected to MongoDB');

    // Find the most recent image
    const recentImage = await Image.findOne().sort({ createdAt: -1 });
    
    if (recentImage) {
      console.log('=== MOST RECENT IMAGE DEBUG ===');
      console.log('ID:', recentImage._id);
      console.log('Prompt:', recentImage.prompt);
      console.log('Content Type:', recentImage.contentType);
      console.log('Size:', recentImage.size, 'bytes');
      console.log('Width:', recentImage.width, 'Height:', recentImage.height);
      console.log('Buffer length:', recentImage.imageData.length);
      console.log('Buffer start (hex):', recentImage.imageData.slice(0, 10).toString('hex'));
      
      // Test the public URL
      const publicUrl = `http://localhost:3001/api/images/public/${recentImage._id}`;
      console.log('Public URL:', publicUrl);
      
      // Check if it's a valid image
      const isPNG = recentImage.imageData[0] === 0x89 && 
                   recentImage.imageData[1] === 0x50 && 
                   recentImage.imageData[2] === 0x4E && 
                   recentImage.imageData[3] === 0x47;
      const isJPEG = recentImage.imageData[0] === 0xFF && 
                    recentImage.imageData[1] === 0xD8 && 
                    recentImage.imageData[2] === 0xFF;
      
      console.log('Is PNG:', isPNG);
      console.log('Is JPEG:', isJPEG);
      console.log('Stored Content Type:', recentImage.contentType);
      
      // Test if we can access the image via HTTP
      console.log('\n=== TESTING HTTP ACCESS ===');
      try {
        const response = await fetch(publicUrl);
        console.log('HTTP Status:', response.status);
        console.log('Content-Type Header:', response.headers.get('content-type'));
        console.log('Content-Length Header:', response.headers.get('content-length'));
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          console.log('Downloaded size:', buffer.byteLength);
          console.log('Downloaded start (hex):', Buffer.from(buffer.slice(0, 10)).toString('hex'));
        } else {
          console.log('HTTP Error:', response.statusText);
        }
      } catch (fetchError) {
        console.log('Fetch Error:', fetchError.message);
      }
      
    } else {
      console.log('No images found in database');
    }

    // Check all images
    const allImages = await Image.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n=== ALL IMAGES SUMMARY ===');
    console.log('Total images:', allImages.length);
    allImages.forEach((img, index) => {
      console.log(`${index + 1}. ID: ${img._id}, Type: ${img.contentType}, Size: ${img.size} bytes`);
    });

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugImageFlow();


