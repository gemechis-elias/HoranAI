const axios = require("axios");
const path = require("path");
const fs = require("fs");
const youtubeThumbnail = require('youtube-thumbnail');
const handleYoutubeDownload = async (url) => {
    try {
        // Ensure the downloads folder exists
        const downloadsDir = path.resolve(__dirname, "downloads");
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        // Call the Python API
        const response = await axios.post(process.env.YOUTUBE_DOWNLOADER_API_URL, { url }, { responseType: "stream" });

        // Extract the video title from the response headers
        const encodedTitle = response.headers["x-video-title"] || "Unknown Track";
        let videoTitle = Buffer.from(encodedTitle, "base64").toString("utf-8");

        // Sanitize the video title for use as a filename
        let sanitizedTitle = videoTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
        const timestamp = Date.now();

        // If the sanitized title is empty, use a fallback
        if (!sanitizedTitle) {
            sanitizedTitle = `undefined_${timestamp}`;
        }

        // Generate the MP3 file path
        const mp3Path = path.join(downloadsDir, `${sanitizedTitle}_${timestamp}.mp3`);

        // Save the MP3 file
        const writer = fs.createWriteStream(mp3Path);
        response.data.pipe(writer);

        const thumbnail = youtubeThumbnail(url);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve({ videoTitle, mp3Path, thumbnail }));
            writer.on("error", (error) => {
                console.error("Error writing MP3 file:", error);
                reject(new Error("Failed to save the downloaded MP3."));
            });
        });
    } catch (error) {
        console.error("Error during YouTube download:", error);
        throw new Error("Failed to download the YouTube video.");
    }
};

module.exports = { handleYoutubeDownload };
