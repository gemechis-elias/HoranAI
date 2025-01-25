require("dotenv").config();
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const handleTikTokDownload = async (url) => {

    try {
        // Ensure the downloads folder exists
        const downloadsDir = path.resolve(__dirname, "downloads");
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir);
        }

        // Call the Python API
        const response = await axios.post(
            process.env.TIKTOK_DOWNLOADER_API_URL,
            { url },
            { responseType: "stream" }
        );

        // Extract the video title from the response headers
        const encodedTitle = response.headers["x-video-title"] || "Unknown Video";
        let videoTitle = Buffer.from(encodedTitle, "base64").toString("utf-8");

        // Sanitize the video title for use as a filename
        let sanitizedTitle = videoTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
        const timestamp = Date.now();

        // If the sanitized title is empty, use a fallback
        if (!sanitizedTitle) {
            sanitizedTitle = `undefined_${timestamp}`;
        }

        // Generate the video file path
        const videoPath = path.join(downloadsDir, `${sanitizedTitle}_${timestamp}.mp4`);

        // Save the video file
        const writer = fs.createWriteStream(videoPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve({ videoTitle, videoPath }));
            writer.on("error", (error) => {
                console.error("Error writing video file:", error);
                reject(new Error("Failed to save the downloaded video."));
            });
        });
    } catch (error) {
        console.error("Error during TikTok download:", error);
        throw new Error("Failed to download the TikTok video.");
    }
};

module.exports = { handleTikTokDownload };
