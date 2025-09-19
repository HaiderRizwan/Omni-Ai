// Test script for document converter
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3000/api';

async function testDocumentConverter() {
  console.log('Testing Document Converter API...\n');

  try {
    // Test 1: Get supported conversions
    console.log('1. Testing supported conversions endpoint...');
    const supportedResponse = await axios.get(`${API_BASE_URL}/documents/supported`);
    console.log('[OK] Supported conversions:', supportedResponse.data.data.conversions.length, 'types');
    console.log('[OK] Supported file types:', Object.keys(supportedResponse.data.data.fileTypes).join(', '));

    // Test 2: Try to convert CSV to JSON
    console.log('\n2. Testing CSV to JSON conversion...');
    if (fs.existsSync('./temp/sample.csv')) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream('./temp/sample.csv'));
      formData.append('conversionType', 'csv-to-json');

      try {
        const csvResponse = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });

        console.log('[OK] CSV to JSON conversion successful!');
        console.log('Headers:', csvResponse.data.data.headers);
        console.log('Row count:', csvResponse.data.data.count);
        console.log('Sample data:', JSON.stringify(csvResponse.data.data.data[0], null, 2));
      } catch (error) {
        console.error('[ERROR] CSV conversion failed:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('[SKIP] Sample CSV file not found, skipping CSV test');
    }

    // Test 3: Try to convert JSON to CSV
    console.log('\n3. Testing JSON to CSV conversion...');
    if (fs.existsSync('./temp/sample.json')) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream('./temp/sample.json'));
      formData.append('conversionType', 'json-to-csv');

      try {
        const jsonResponse = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });

        console.log('[OK] JSON to CSV conversion successful!');
        console.log('CSV Content:');
        console.log(jsonResponse.data.data.content.substring(0, 200) + '...');
        console.log('Row count:', jsonResponse.data.data.rowCount);
      } catch (error) {
        console.error('[ERROR] JSON conversion failed:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('[SKIP] Sample JSON file not found, skipping JSON test');
    }

    // Test 4: Try to convert text to PDF
    console.log('\n4. Testing text to PDF conversion...');
    if (fs.existsSync('./temp/sample.txt')) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream('./temp/sample.txt'));
      formData.append('conversionType', 'text-to-pdf');

      try {
        const pdfResponse = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });

        console.log('[OK] Text to PDF conversion successful!');
        console.log('Filename:', pdfResponse.data.data.filename);
        console.log('Content type:', pdfResponse.data.data.mimeType);
        console.log('Base64 content length:', pdfResponse.data.data.content.length);

        // Save the PDF to verify it worked
        const pdfBuffer = Buffer.from(pdfResponse.data.data.content, 'base64');
        fs.writeFileSync('./temp/test-output.pdf', pdfBuffer);
        console.log('[SAVE] PDF saved as test-output.pdf for verification');
      } catch (error) {
        console.error('[ERROR] Text to PDF conversion failed:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('[SKIP] Sample text file not found, skipping PDF test');
    }

    // Test 5: Test error handling with invalid file type
    console.log('\n5. Testing error handling with invalid file type...');
    const invalidFormData = new FormData();
    invalidFormData.append('file', Buffer.from('test content'), {
      filename: 'test.invalid',
      contentType: 'application/octet-stream'
    });
    invalidFormData.append('conversionType', 'pdf-to-text');

    try {
      await axios.post(`${API_BASE_URL}/documents/convert`, invalidFormData, {
        headers: {
          ...invalidFormData.getHeaders(),
        },
      });
      console.log('[WARN] Should have failed but didn\'t');
    } catch (error) {
      console.log('[OK] Error handling working correctly:', error.response?.data?.message || 'Request failed');
    }

    console.log('\n[SUCCESS] Document converter testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDocumentConverter();
