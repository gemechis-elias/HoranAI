const fs = require("fs");
const { handleTikTokDownload } = require("./tiktok_downloader");
const db = require("../controller");

async function tiktokHandler(bot, chatId, tiktokUrl) {
    try {
        const processingMessage = await bot.sendMessage(
            chatId,
            "Processing your TikTok video. Please wait..."
        );

        // Start a progress simulation
        let progress = 0;
        const progressInterval = setInterval(async () => {
            progress += 5;

            // Ensure valid values for repeat
            const progressBars = Math.min(progress / 5, 10); // Limit the bars to a maximum of 10
            const remainingBars = Math.max(10 - progressBars, 0); // Ensure remaining bars are not negative

            const progressText = `Downloading: [${'▬'.repeat(progressBars)}${' '.repeat(remainingBars)}] ${progress}%`;

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

        // Call the TikTok downloader
        const { videoTitle, videoPath } = await handleTikTokDownload(tiktokUrl);

        // Stop the progress simulation and update the message
        clearInterval(progressInterval);
        await bot.editMessageText("✅ Download complete. Sending video...", {
            chat_id: chatId,
            message_id: processingMessage.message_id,
        });

        const videoStream = fs.createReadStream(videoPath);

        // Send the video file to the user
        await bot.sendVideo(chatId, videoStream, {
            caption: `🎥 @horansoftware `,
            parse_mode: "Markdown",
        });

        // Increment the message count
        await db.incrementMessageCount(chatId);

        // Delete the file after sending
        fs.unlinkSync(videoPath);
    } catch (error) {
        console.error("Error handling TikTok download:", error);
        await bot.sendMessage(chatId, "❌ An error occurred while processing the TikTok video.", error);
    }
}

module.exports = { tiktokHandler };
