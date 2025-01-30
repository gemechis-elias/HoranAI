require('dotenv').config();
const axios = require('axios');
const db = require('../controller');
const fs = require("fs");
const { handleYoutubeDownload } = require("./youtube_downloader");

// YouTube handler function
async function youtubeHandler(bot, chatId, youtubeUrl) {
    try {
        // Initial processing message
        const processingMessage = await bot.sendMessage(chatId, "Processing your YouTube video for MP3 download...");

        // Progress simulation
        let progress = 0;
        const progressInterval = setInterval(async () => {
            progress += 10;
            const progressText = `Downloading: [${"▬".repeat(progress / 10)}${" ".repeat(10 - progress / 10)}] ${progress}%`;
            try {
                await bot.editMessageText(progressText, {
                    chat_id: chatId,
                    message_id: processingMessage.message_id,
                });
            } catch (editError) {
                console.error("Error updating progress:", editError);
            }

            if (progress >= 100) {
                clearInterval(progressInterval);
                await bot.editMessageText("Converting format, please wait...", {
                    chat_id: chatId,
                    message_id: processingMessage.message_id,
                });
            }
        }, 1000);

        // Call the YouTube download handler
        const { videoTitle, mp3Path, thumbnailUrl } = await handleYoutubeDownload(youtubeUrl);
        console.log(`========= Thumbnail URL: ${thumbnailUrl}`);

        

        clearInterval(progressInterval);

        await bot.editMessageText("✅ Download complete. Sending MP3 file...", {
            chat_id: chatId,
            message_id: processingMessage.message_id,
        });

        // Send the MP3 file
        const mp3Stream = fs.createReadStream(mp3Path);
        await bot.sendAudio(
            chatId,
            mp3Stream,
    
           {
                title: videoTitle,
                caption: `🎵 *${videoTitle}*`,
                parse_mode: "Markdown",
                thumbnail: thumbnailUrl,
            }
        );

        // Increment message count
        await db.incrementMessageCount(chatId);

        // Clean up the file
        fs.unlinkSync(mp3Path);
    } catch (error) {
        console.error("Error handling YouTube download:", error);
        await bot.sendMessage(chatId, "❌ An error occurred while processing the YouTube video.");
    }
}

module.exports = { youtubeHandler };