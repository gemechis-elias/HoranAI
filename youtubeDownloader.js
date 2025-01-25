require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const handleYoutubeDownload = async (url) => {
    try {
        // Ensure the downloads folder exists
        const downloadsDir = path.resolve(__dirname, 'downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        // Send the request to the Python API
        const response = await axios.post(
            process.env.YOUTUBE_DOWNLOADER_API_URL,
            { url }, // Send the URL as JSON payload
            { responseType: 'stream' } // Stream the MP3 response
        );

        // Extract video title from response headers
        const videoTitle = response.headers['x-video-title'] || 'youtube_audio';

        // Generate a file name using the video title
        const sanitizedTitle = videoTitle.replace(/[^a-zA-Z0-9-_ ]/g, ''); // Remove invalid characters
        const mp3Path = path.join(downloadsDir, `${sanitizedTitle}.mp3`);

        // Save the streamed MP3 to a file
        const writer = fs.createWriteStream(mp3Path);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(mp3Path));
            writer.on('error', (error) => {
                console.error('Error writing MP3 file:', error);
                reject(new Error('Failed to save the downloaded MP3.'));
            });
        });
    } catch (error) {
        console.error('Error during YouTube download:', error);
        throw new Error('Failed to download the YouTube video.');
    }
};

module.exports = { handleYoutubeDownload };
