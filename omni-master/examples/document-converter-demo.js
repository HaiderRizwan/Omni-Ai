// Document Converter API Demo
// This file demonstrates how to use the document converter API

const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Example 1: Get supported conversions
async function getSupportedConversions() {
  try {
    console.log('🔍 Getting supported conversions...');
    const response = await axios.get(`${API_BASE_URL}/documents/supported`);
    console.log('✅ Supported conversions:', response.data.data.conversions);
    console.log('📁 Supported file types:', response.data.data.fileTypes);
    console.log('📏 File size limits:', response.data.data.sizeLimits);
  } catch (error) {
    console.error('❌ Error getting supported conversions:', error.message);
  }
}

// Example 2: Convert CSV to JSON
async function convertCsvToJson() {
  try {
    console.log('\n📊 Converting CSV to JSON...');

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./temp/sample.csv'));
    formData.append('conversionType', 'csv-to-json');

    const response = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ CSV to JSON conversion successful!');
    console.log('📋 Headers:', response.data.data.headers);
    console.log('📊 Row count:', response.data.data.count);
    console.log('📄 Sample data:', JSON.stringify(response.data.data.data.slice(0, 2), null, 2));

  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error.response?.data || error.message);
  }
}

// Example 3: Convert JSON to CSV
async function convertJsonToCsv() {
  try {
    console.log('\n📋 Converting JSON to CSV...');

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./temp/sample.json'));
    formData.append('conversionType', 'json-to-csv');

    const response = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ JSON to CSV conversion successful!');
    console.log('📄 CSV Content:');
    console.log(response.data.data.content);
    console.log('📊 Row count:', response.data.data.rowCount);

  } catch (error) {
    console.error('❌ Error converting JSON to CSV:', error.response?.data || error.message);
  }
}

// Example 4: Convert text to PDF
async function convertTextToPdf() {
  try {
    console.log('\n📝 Converting text to PDF...');

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./temp/sample.txt'));
    formData.append('conversionType', 'text-to-pdf');

    const response = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ Text to PDF conversion successful!');
    console.log('📄 Filename:', response.data.data.filename);
    console.log('📏 Content type:', response.data.data.mimeType);
    console.log('📊 Base64 content length:', response.data.data.content.length);

    // Save PDF to file (optional)
    const pdfBuffer = Buffer.from(response.data.data.content, 'base64');
    fs.writeFileSync('./temp/converted-document.pdf', pdfBuffer);
    console.log('💾 PDF saved as converted-document.pdf');

  } catch (error) {
    console.error('❌ Error converting text to PDF:', error.response?.data || error.message);
  }
}

// Example 5: Convert text to HTML
async function convertTextToHtml() {
  try {
    console.log('\n🌐 Converting text to HTML...');

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./temp/sample.txt'));
    formData.append('conversionType', 'text-to-html');

    const response = await axios.post(`${API_BASE_URL}/documents/convert`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('✅ Text to HTML conversion successful!');
    console.log('📄 Filename:', response.data.data.filename);
    console.log('📏 Content type:', response.data.data.mimeType);
    console.log('📄 HTML Content:');
    console.log(response.data.data.content);

  } catch (error) {
    console.error('❌ Error converting text to HTML:', error.response?.data || error.message);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Document Converter API Demo\n');

  await getSupportedConversions();
  await convertCsvToJson();
  await convertJsonToCsv();
  await convertTextToPdf();
  await convertTextToHtml();

  console.log('\n✨ Demo completed! The document converter is working perfectly.');
}

// Export functions for individual testing
module.exports = {
  getSupportedConversions,
  convertCsvToJson,
  convertJsonToCsv,
  convertTextToPdf,
  convertTextToHtml,
  runAllExamples
};

// Run demo if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
