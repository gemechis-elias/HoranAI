const youtubeDlExec = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const handleYoutubeDownload = async (url) => {
    try {
        // Ensure the downloads folder exists
        const downloadsDir = path.resolve(__dirname, 'downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        // Generate a unique file name with timestamp
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `%(title)s-${timestamp}.%(ext)s`);

        // Run youtube-dl to download the MP3
        await youtubeDlExec(url, {
            output: outputPath,
            extractAudio: true,
            audioFormat: 'mp3',
        });

        // Find the downloaded MP3 file
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find((file) => file.includes(timestamp) && file.endsWith('.mp3'));

        if (!downloadedFile) {
            throw new Error('Failed to find the downloaded MP3 file.');
        }

        return path.join(downloadsDir, downloadedFile);
    } catch (error) {
        console.error('Error during YouTube download:', error);
        throw new Error('Failed to download the YouTube video.');
    }
};

module.exports = { handleYoutubeDownload };
