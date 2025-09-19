const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const PDFKit = require('pdfkit');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const puppeteer = require('puppeteer');

// Supported conversions
const SUPPORTED_CONVERSIONS = [
  'pdf-to-text',
  'text-to-pdf',
  'csv-to-json',
  'json-to-csv',
  'html-to-pdf',
  'text-to-html'
];

// Supported file types
const SUPPORTED_FILE_TYPES = {
  'pdf': ['application/pdf'],
  'txt': ['text/plain'],
  'csv': ['text/csv', 'application/csv'],
  'json': ['application/json'],
  'html': ['text/html']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  'pdf': 10 * 1024 * 1024,    // 10MB
  'txt': 5 * 1024 * 1024,     // 5MB
  'csv': 5 * 1024 * 1024,     // 5MB
  'json': 5 * 1024 * 1024,    // 5MB
  'html': 5 * 1024 * 1024     // 5MB
};

// @desc    Get supported conversions
// @route   GET /api/documents/supported
// @access  Public
const getSupportedConversions = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        conversions: SUPPORTED_CONVERSIONS,
        fileTypes: SUPPORTED_FILE_TYPES,
        sizeLimits: FILE_SIZE_LIMITS
      }
    });
  } catch (error) {
    console.error('Get supported conversions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported conversions',
      error: error.message
    });
  }
};

// @desc    Convert document
// @route   POST /api/documents/convert
// @access  Public
const convertDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { conversionType } = req.body;

    if (!conversionType || !SUPPORTED_CONVERSIONS.includes(conversionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported conversion type',
        supportedTypes: SUPPORTED_CONVERSIONS
      });
    }

    // Validate file size
    const fileSize = req.file.size;
    const fileExtension = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    if (fileExtension && FILE_SIZE_LIMITS[fileExtension] && fileSize > FILE_SIZE_LIMITS[fileExtension]) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit for ${fileExtension} files`,
        limit: FILE_SIZE_LIMITS[fileExtension],
        fileSize
      });
    }

    let result;

    // Perform conversion based on type
    switch (conversionType) {
      case 'pdf-to-text':
        result = await convertPdfToText(req.file.path);
        break;
      case 'text-to-pdf':
        result = await convertTextToPdf(req.file.path);
        break;
      case 'csv-to-json':
        result = await convertCsvToJson(req.file.path);
        break;
      case 'json-to-csv':
        result = await convertJsonToCsv(req.file.path);
        break;
      case 'html-to-pdf':
        result = await convertHtmlToPdf(req.file.path);
        break;
      case 'text-to-html':
        result = await convertTextToHtml(req.file.path);
        break;
      default:
        throw new Error('Unsupported conversion type');
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      data: result,
      conversionType,
      originalFile: req.file.originalname
    });

  } catch (error) {
    console.error('Document conversion error:', error);

    // Clean up uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Document conversion failed',
      error: error.message
    });
  }
};

// Helper function: PDF to Text
const convertPdfToText = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      content: data.text,
      pages: data.numpages,
      info: data.info,
      metadata: data.metadata
    };
  } catch (error) {
    throw new Error(`PDF to text conversion failed: ${error.message}`);
  }
};

// Helper function: Text to PDF
const convertTextToPdf = async (filePath) => {
  try {
    const textContent = fs.readFileSync(filePath, 'utf8');
    const outputPath = path.join(__dirname, '../temp', `output_${Date.now()}.pdf`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const doc = new PDFKit();
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // Add content to PDF
    doc.fontSize(12);
    const lines = textContent.split('\n');

    lines.forEach((line, index) => {
      if (doc.y > 700) { // New page if near bottom
        doc.addPage();
      }
      doc.text(line);
    });

    doc.end();

    // Wait for PDF creation to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Read the created PDF
    const pdfBuffer = fs.readFileSync(outputPath);

    // Clean up temp file
    fs.unlinkSync(outputPath);

    return {
      content: pdfBuffer.toString('base64'),
      encoding: 'base64',
      mimeType: 'application/pdf',
      filename: 'converted.pdf'
    };
  } catch (error) {
    throw new Error(`Text to PDF conversion failed: ${error.message}`);
  }
};

// Helper function: CSV to JSON
const convertCsvToJson = async (filePath) => {
  try {
    const results = [];
    const headers = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          headers: false
        }))
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve({
            headers,
            data: results,
            count: results.length
          });
        })
        .on('error', reject);
    });
  } catch (error) {
    throw new Error(`CSV to JSON conversion failed: ${error.message}`);
  }
};

// Helper function: JSON to CSV
const convertJsonToCsv = async (filePath) => {
  try {
    const jsonContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(jsonContent);

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('JSON must contain an array of objects');
    }

    // Get headers from first object
    const headers = Object.keys(jsonData[0]).map(key => ({
      id: key,
      title: key
    }));

    const outputPath = path.join(__dirname, '../temp', `output_${Date.now()}.csv`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: headers
    });

    await csvWriter.writeRecords(jsonData);

    // Read the created CSV
    const csvContent = fs.readFileSync(outputPath, 'utf8');

    // Clean up temp file
    fs.unlinkSync(outputPath);

    return {
      content: csvContent,
      filename: 'converted.csv',
      rowCount: jsonData.length
    };
  } catch (error) {
    throw new Error(`JSON to CSV conversion failed: ${error.message}`);
  }
};

// Helper function: HTML to PDF
const convertHtmlToPdf = async (filePath) => {
  try {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const outputPath = path.join(__dirname, '../temp', `output_${Date.now()}.pdf`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Launch browser and convert HTML to PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({ path: outputPath, format: 'A4' });

    await browser.close();

    // Read the created PDF
    const pdfBuffer = fs.readFileSync(outputPath);

    // Clean up temp file
    fs.unlinkSync(outputPath);

    return {
      content: pdfBuffer.toString('base64'),
      encoding: 'base64',
      mimeType: 'application/pdf',
      filename: 'converted.pdf'
    };
  } catch (error) {
    throw new Error(`HTML to PDF conversion failed: ${error.message}`);
  }
};

// Helper function: Text to HTML
const convertTextToHtml = async (filePath) => {
  try {
    const textContent = fs.readFileSync(filePath, 'utf8');

    // Convert text to basic HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <pre>${textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

    return {
      content: htmlContent,
      filename: 'converted.html',
      mimeType: 'text/html'
    };
  } catch (error) {
    throw new Error(`Text to HTML conversion failed: ${error.message}`);
  }
};

module.exports = {
  getSupportedConversions,
  convertDocument,
  convertPdfToText,
  convertCsvToJson
};
