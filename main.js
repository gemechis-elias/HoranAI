require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { correctGrammar, getUserInfo } = require('./helpers');
const db = require('./database');
const { handleInlineContent } = require('./inline_query');
const { handleYoutubeDownload } = require('./youtubeDownloader');
const fs = require('fs');
const { extractTextFromImage } = require('./imageHandler');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});


// Greet new users
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username? msg.chat.username : msg.chat.first_name);
    bot.sendMessage(chatId, `Hello ${msg.chat.first_name}! Welcome to Horan AI.\nSend me any text or image`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Settings', callback_data: 'settings' }]
            ]
        }
    });
});

// Inline Query for Translation
bot.on('inline_query', (query) => handleInlineContent(bot, query));



// Check for YouTube video links and handle MP3 download first
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username? msg.chat.username : msg.chat.first_name);

    if (!msg.text || msg.text.startsWith('/')) return;

    

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+)/;
    const match = msg.text.match(youtubeRegex);

    if (match) {
        try {
            await bot.sendMessage(chatId, "Processing your YouTube video for MP3 download...");

            // Call the handleYoutubeDownload function
            const mp3Path = await handleYoutubeDownload(match[0]);

            // Send the MP3 file to the user
            await bot.sendDocument(chatId, mp3Path);
            await bot.sendMessage(chatId, "Here is your MP3 file:");

            // Delete the file after successfully sending it
            try {
                fs.unlinkSync(mp3Path);
                console.log(`Deleted file: ${mp3Path}`);
            } catch (deleteError) {
                console.error(`Error deleting file: ${mp3Path}`, deleteError);
            }

        } catch (error) {
            console.error('Error handling YouTube download:', error);
            bot.sendMessage(chatId, "An error occurred while processing the YouTube video.");
        }
        return;
    }

    // Handle images
    if (msg.photo) {
        try {
            const fileId = msg.photo[msg.photo.length - 1].file_id; // Get the highest resolution photo
            const fileUrl = await bot.getFileLink(fileId);

            // Inform the user the image is being processed
            await bot.sendMessage(chatId, "Processing the image to extract text...");

            // Call the OCR handler
            const extractedText = await extractTextFromImage(fileUrl);

            // Send the extracted text back to the user
            await bot.sendMessage(chatId, `Extracted text:\n\n${extractedText}`);
        } catch (error) {
            console.error('Error processing image:', error);
            await bot.sendMessage(chatId, "Failed to process the image. Please try again.");
        }
        return;
    }
    

    // Existing grammar and translation functionality
    try {
        const correctedText = await correctGrammar(msg.text);
        await bot.sendMessage(
            chatId,
            `What do you want to do with this message?`,
            {
                reply_to_message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Translate', callback_data: `translate:${msg.message_id}` }, { text: 'Grammar Fix', callback_data: `grammar_fix:${msg.message_id}` }]
                    ]
                }
            }
        );
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, "An error occurred while processing your message.");
    }
});




// Handle button clicks for translation and grammar fix
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;



    if (query.data.startsWith('delete:')) {
        try {
            const messageIdToDelete = query.message.message_id;
            await bot.deleteMessage(chatId, messageIdToDelete);

            const userMessageId = query.message.reply_to_message ? query.message.reply_to_message.message_id : null;
            if (userMessageId) {
                await bot.deleteMessage(chatId, userMessageId);
            }

          

        } catch (error) {
            console.error('Error deleting messages:', error);
        }
    }

    if (query.message.reply_to_message) {
        const userMessageId = query.message.reply_to_message.message_id;

        if (query.data.startsWith('translate:')) {
            try {
                const message = query.message.reply_to_message;

                const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(message.text)}&target=am`);
                const translatedText = decodeURIComponent(response.data.translatedText);

                // Increment message count for both translation and grammar fix buttons
            const { canSend, totalMessages } = await db.incrementMessageCount(chatId);
            if (!canSend) {
                return bot.sendMessage(chatId, 
                    "🚨 Oops! You've reached your daily message limit (10 messages). 😔\n\nBut don't worry! You can continue using the bot by buying more credits! 💳✨\n\n👉 Click below to check out your subscription options and get more credits to keep chatting!\n\n🛒 /subscription\n\n💰 <b>Daily Credits Left</b>: 0",
                    {
                        parse_mode: 'HTML'
                    }
                );
                
                
            }

                await bot.sendMessage(
                    chatId, 
                    `<code>${translatedText}</code>\n\n💰 Daily Credits Left: ${10 - totalMessages}`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Delete', callback_data: `delete:${query.message.message_id}` }]
                            ]
                        }
                    }
                );

            
            } catch (error) {
                console.error('Translation error:', error);
                bot.sendMessage(chatId, "Error while translating the text.");
            }
        }

        if (query.data.startsWith('grammar_fix:')) {
            try {
                const message = query.message.reply_to_message;

                const correctedText = await correctGrammar(message.text);

                // Increment message count for both translation and grammar fix buttons
            const { canSend, totalMessages } = await db.incrementMessageCount(chatId);
            if (!canSend) {
                return bot.sendMessage(chatId, 
                    "🚨 Oops! You've reached your daily message limit (10 messages). 😔\n\nBut don't worry! You can continue using the bot by buying more credits! 💳✨\n\n👉 Click below to check out your subscription options and get more credits to keep chatting!\n\n🛒 /subscription\n\n💰 <b>Daily Credits Left</b>: 0",
                    {
                        parse_mode: 'HTML'
                    }
                );
                
                
            }

                await bot.sendMessage(
                    chatId, 
                    `<code>${correctedText}</code>\n\n💰 Daily Credits Left: ${10 - totalMessages}`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Delete', callback_data: `delete:${query.message.message_id}` }]
                            ]
                        }
                    }
                );
            } catch (error) {
                console.error('Grammar correction error:', error);
                bot.sendMessage(chatId, "Error while correcting grammar.");
            }
        }
    }
});



console.log("LisanBot is running!");
