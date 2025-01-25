const tesseract = require('node-tesseract-ocr');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const extractTextFromImage = async (imageUrl) => {
    try {
        // Download the image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tempImagePath = path.resolve(__dirname, 'temp-image.png');
        fs.writeFileSync(tempImagePath, response.data);

        // OCR Configuration
        const config = {
            lang: 'eng', // Language for OCR
            oem: 1, // Engine mode
            psm: 3, // Page segmentation mode
        };

        // Perform OCR on the image
        const text = await tesseract.recognize(tempImagePath, config);

        // Clean up the temporary file
        fs.unlinkSync(tempImagePath);

        // Return the extracted text
        return text.trim();
    } catch (error) {
        console.error('Error during OCR process:', error);
        throw new Error('Failed to extract text from the image.');
    }
};

module.exports = { extractTextFromImage };
