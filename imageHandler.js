require('dotenv').config();
const { ocrSpace } = require('ocr-space-api-wrapper');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const extractTextFromImage = async (imageUrl) => {
    try {
        // Download the image
        console.log('Downloading image from URL:', imageUrl);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tempImagePath = path.resolve(__dirname, 'temp-image.png');
        fs.writeFileSync(tempImagePath, response.data);

        console.log('Image downloaded and saved to:', tempImagePath);

        // Call OCR Space API to extract text
        const apiKey = process.env.OCR_API_KEY; // Ensure this is set in your .env file
        const result = await ocrSpace(tempImagePath, { apiKey });

        // Clean up the temporary file
        fs.unlinkSync(tempImagePath);
        console.log('Temporary file deleted:', tempImagePath);

        // Extract text from the API response
        const extractedText = result.ParsedResults[0].ParsedText || '';
        console.log('Extracted Text:', extractedText);

        // Return the extracted text
        return extractedText.trim();
    } catch (error) {
        console.error('Error during OCR process:', error);
        throw new Error('Failed to extract text from the image.');
    }
};

module.exports = { extractTextFromImage };
