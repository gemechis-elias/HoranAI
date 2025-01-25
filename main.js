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
    bot.sendMessage(
        chatId,
        `👋 Hello, *${msg.chat.first_name}*! Welcome to *Horan AI*! 🚀\n\nHere’s what I can do for you:\n\n` +
        `📜 *Text*: Send me any text to fix grammar or translate it.\n` +
        `🔗 *Link*: Share a YouTube link to download it as MP3.\n` +
        `🖼️ *Image*: Upload an image, and I’ll extract text from it using OCR.\n\n` +
        `⚙️ Tap *Settings* below to customize your experience.`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚙️ Settings', callback_data: 'settings' }]
                ]
            }
        }
    );
    
});

// if message is '/settings' call back user settings
bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username? msg.chat.username : msg.chat.first_name);
    bot.sendMessage(
        chatId,
        `⚙️ Tap *Settings* below to customize your experience.`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚙️ Settings', callback_data: 'settings' }]
                ]
            }
        }
    );

});

// Inline Query for Translation
bot.on('inline_query', (query) => handleInlineContent(bot, query));



// Check for YouTube video links and handle MP3 download first
bot.on('message', async (msg) => {


    if (!msg.photo && msg.text.startsWith('/')) {
        return;
    }

    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username? msg.chat.username : msg.chat.first_name);

    console.log('Received message:', msg.text);


    // Handle images
    if (msg.photo) {
        console.log('Processing image:', msg.photo);

        try {
            // Get the highest resolution photo
            const fileId = msg.photo[msg.photo.length - 1].file_id;

            // Get the file URL
            const fileUrl = await bot.getFileLink(fileId);
            console.log('File URL:', fileUrl);

            // Inform the user that the image is being processed
            await bot.sendMessage(chatId, "Processing the image to extract text...");

            // Call the OCR handler
            const extractedText = await extractTextFromImage(fileUrl);
            console.log('Extracted text:', extractedText);

            // Send the extracted text back to the user
            // await bot.sendMessage(chatId, `Extracted text:\n\n`);

            await bot.sendMessage(
                chatId,
                `${extractedText}`,
                {
                    reply_to_message_id: msg.message_id,
                    
                }
            );

        } catch (error) {
            console.error('Error processing image:', error);
            await bot.sendMessage(chatId, "Failed to process the image. Please try again.");
        }
        return;
    }
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+)/;
    const match = msg.text.match(youtubeRegex);

    if (match) {
        try {
            // Send an initial message and get its message ID
            const processingMessage = await bot.sendMessage(chatId, "Processing your YouTube video for MP3 download...");
    
            // Start a "progress simulation" loop
            let progress = 0;
            const progressInterval = setInterval(async () => {
                progress += 10;
                const progressText = `Downloading: [${'▬'.repeat(progress / 10)}${' '.repeat(10 - progress / 10)}] ${progress}%`;
                await bot.editMessageText(progressText, {
                    chat_id: chatId,
                    message_id: processingMessage.message_id
                });
    
                // Stop the progress when it reaches 100%
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    await bot.editMessageText("Converting format please wait...", {
                        chat_id: chatId,
                        message_id: processingMessage.message_id
                    });
                }
            }, 1000); // Update every second
    
            // Call the handleYoutubeDownload function
            const mp3Path = await handleYoutubeDownload(match[0]);
    
            // Stop the progress simulation and delete the "Converting format..." message
            clearInterval(progressInterval);
            await bot.editMessageText("✅ Download complete. Sending MP3 file...", {
                chat_id: chatId,
                message_id: processingMessage.message_id
            });
    
            // Send the MP3 file to the user
            await bot.sendDocument(chatId, mp3Path);
            // await bot.sendMessage(chatId, "🎵 Here is your MP3 file:");
    
            // Delete the file after successfully sending it
            try {
                fs.unlinkSync(mp3Path);
                console.log(`Deleted file: ${mp3Path}`);
            } catch (deleteError) {
                console.error(`Error deleting file: ${mp3Path}`, deleteError);
            }
        } catch (error) {
            console.error('Error handling YouTube download:', error);
            bot.sendMessage(chatId, "❌ An error occurred while processing the YouTube video.");
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
        const defaultLanguage = await db.getUserDefaultLanguage(chatId);

        if (query.data.startsWith('translate:')) {
            try {
                const message = query.message.reply_to_message;

                const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(message.text)}&target=${defaultLanguage}`);
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

    // Handle the "settings" button callback
    if (query.data === 'settings') {
        try {
            // Fetch user info from the database
            const userInfo = await db.getUserSettings(chatId);
            if (!userInfo) {
                return bot.sendMessage(chatId, 'No user data found.');
            }

            // Get user's profile picture URL
            let profilePicUrl = null;
            try {
                const photos = await bot.getUserProfilePhotos(chatId, { limit: 1 });
                if (photos.total_count > 0) {
                    const fileId = photos.photos[0][0].file_id; // Use the first photo
                    profilePicUrl = await bot.getFileLink(fileId);
                }
            } catch (error) {
                console.error('Error fetching profile picture:', error.message);
            }

            // Fallback to default placeholder if no profile picture
            if (!profilePicUrl) {
                profilePicUrl = 'assets/profile.jpg';
            }

            // Generate the settings message
            const settingsMessage = `👤 *Your Settings*:\n\n` +
                `🔹 *Username*: ${userInfo.username || 'N/A'}\n` +
                `🔹 *Is Premium*: ${userInfo.is_premium ? 'Yes 🌟' : 'No'}\n` +
                `🔹 *Subscription Date*: ${userInfo.subscription_date || 'Not Subscribed'}\n` +
                `🔹 *Today's Messages*: ${userInfo.total_messages || 0}\n` +
                `🔹 *Default Language*: ${userInfo.default_language || 'en'}\n\n` +
                `Use the buttons below to change settings.`;

            // Send the profile picture and settings
            await bot.sendPhoto(chatId, profilePicUrl, {
                caption: settingsMessage,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🌐 Change Default Language', callback_data: 'change_language' }],
                        [{ text: '🔒 Subscribe (Coming Soon)', callback_data: 'subscribe' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Error handling settings callback:', error.message);
            bot.sendMessage(chatId, 'Failed to load settings. Please try again.');
        }
    }

    // Handle "change language" callback
    if (query.data === 'change_language') {
        bot.sendMessage(chatId, '🌐 Select your default language:', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'English', callback_data: 'set_language_en' },
                        { text: 'Amharic', callback_data: 'set_language_am' }
                    ],
                    [
                        { text: 'Oromo', callback_data: 'set_language_or' },
                        { text: 'Tigrinya', callback_data: 'set_language_ti' }
                    ],
                    [
                        { text: 'Somali', callback_data: 'set_language_so' },
                        { text: 'Arabic', callback_data: 'set_language_ar' }
                    ],
                    [
                        { text: 'French', callback_data: 'set_language_fr' },
                        { text: 'Spanish', callback_data: 'set_language_es' }
                    ]
                ]
            }
        });
    }

    // Handle setting a specific language
    if (query.data.startsWith('set_language_')) {
        const selectedLanguage = query.data.replace('set_language_', '');
        try {
            const success = await db.updateUserLanguage(chatId, selectedLanguage);
            if (!success) {
                return bot.sendMessage(chatId, 'Failed to update your default language. Please try again.');
            }

            bot.sendMessage(chatId, `✅ Your default language has been updated to *${selectedLanguage}*.`, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Error updating language:', error.message);
            bot.sendMessage(chatId, 'An error occurred while updating your language. Please try again.');
        }
    }

 

});



console.log("LisanBot is running!");
