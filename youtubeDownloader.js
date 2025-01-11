const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const handleYoutubeDownload = async (url) => {
    try {
        const videoId = ytdl.getURLVideoID(url);
        const info = await ytdl.getInfo(videoId);
        const title = info.videoDetails.title.replace(/[<>:"\/\\|?*]/g, ""); // Remove invalid filename characters

        const outputPath = path.resolve(__dirname, 'downloads', `${title}.mp3`);

        // Ensure the downloads folder exists
        if (!fs.existsSync(path.resolve(__dirname, 'downloads'))) {
            fs.mkdirSync(path.resolve(__dirname, 'downloads'));
        }

        const audioStream = ytdl(videoId, { filter: 'audioonly' });
        const writeStream = fs.createWriteStream(outputPath);

        audioStream.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(outputPath));
            writeStream.on('error', (error) => reject(error));
        });
    } catch (error) {
        throw new Error('Failed to download the YouTube video.');
    }
};

module.exports = { handleYoutubeDownload };
