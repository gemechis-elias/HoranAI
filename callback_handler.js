require('dotenv').config();
const axios = require('axios');
const db = require('./controller');
const { correctGrammar } = require('./helpers');


async function handleCallBackQuery(bot, query) {
    const chatId = query.message.chat.id;

    try {
        // Handle "Delete" callback
        if (query.data.startsWith('delete:')) {
            await deleteMessage(bot, chatId, query.message);
            return;
        }

        // Handle actions requiring reply to a message
        if (query.message.reply_to_message) {
            const userMessageId = query.message.reply_to_message.message_id;
            const defaultLanguage = await db.getUserDefaultLanguage(chatId);

            // Translation handler
            if (query.data.startsWith('translate:')) {
                await handleTranslation(bot, chatId, query, defaultLanguage);
                return;
            }

            // Grammar Fix handler
            if (query.data.startsWith('grammar_fix:')) {
                await handleGrammarFix(bot, chatId, query);
                return;
            }
        }

        // Handle "Settings" callback
        if (query.data === 'settings') {
            await showSettings(bot, chatId);
            return;
        }

        // Handle "Change Language" callback
        if (query.data === 'change_language') {
            await showLanguageOptions(bot, chatId);
            return;
        }

        // Handle specific language selection
        if (query.data.startsWith('set_language_')) {
            await setLanguage(bot, chatId, query.data);
            return;
        }

        // Handle different feature options
        if (query.data.startsWith('translate')) {
            bot.sendMessage(chatId, '📜 Okay, send me the text you want to translate.');
        } else if (query.data.startsWith('grammar_fix')) {
            bot.sendMessage(chatId, '🔍 Okay, send me the text you want to fix.');
        } else if (query.data.startsWith('download_mp3')) {
            bot.sendMessage(chatId, '🎵 Okay, send me the YouTube video link you want to download as MP3.');
        } else if (query.data.startsWith('download_video')) {
            bot.sendMessage(chatId, '🔗 Okay, send me the TikTok video link you want to download.');
        } else if (query.data.startsWith('extract_text')) {
            bot.sendMessage(chatId, '🖼️ Okay, send me the image you want to extract text from.');
        }

    } catch (error) {
        console.error('Error handling callback query:', error.message);
        bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
    }
}

// Helper to delete messages
async function deleteMessage(bot, chatId, message) {
    try {
        const messageIdToDelete = message.message_id;
        await bot.deleteMessage(chatId, messageIdToDelete);

        const userMessageId = message.reply_to_message ? message.reply_to_message.message_id : null;
        if (userMessageId) {
            await bot.deleteMessage(chatId, userMessageId);
        }
    } catch (error) {
        console.error('Error deleting messages:', error.message);
    }
}

// Handle Translation
async function handleTranslation(bot, chatId, query, defaultLanguage) {
    try {
        const message = query.message.reply_to_message;
        const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(message.text)}&target=${defaultLanguage}`);
        const translatedText = decodeURIComponent(response.data.translatedText);

        const { canSend, totalMessages } = await checkDailyLimit(chatId);
        if (!canSend) return sendLimitReached(bot, chatId);

        await bot.sendMessage(
            chatId,
            `<code>${translatedText}</code>\n\n💰 Daily Credits Left: ${10 - totalMessages}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: 'Delete', callback_data: `delete:${query.message.message_id}` }]],
                },
            }
        );
    } catch (error) {
        console.error('Translation error:', error.message);
        bot.sendMessage(chatId, 'Error while translating the text.');
    }
}

// Handle Grammar Fix
async function handleGrammarFix(bot, chatId, query) {
    try {
        const message = query.message.reply_to_message;
        const correctedText = await correctGrammar(message.text);

        const { canSend, totalMessages } = await checkDailyLimit(chatId);
        if (!canSend) return sendLimitReached(bot, chatId);

        await bot.sendMessage(
            chatId,
            `<code>${correctedText}</code>\n\n💰 Daily Credits Left: ${10 - totalMessages}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: 'Delete', callback_data: `delete:${query.message.message_id}` }]],
                },
            }
        );
    } catch (error) {
        console.error('Grammar correction error:', error.message);
        bot.sendMessage(chatId, 'Error while correcting grammar.');
    }
}

// Show Settings
async function showSettings(bot, chatId) {
    try {
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



        const settingsMessage = `👤 *Your Settings*:\n\n` +
            `🔹 *Username*: ${userInfo.username || 'N/A'}\n` +
            `🔹 *Is Premium*: ${userInfo.is_premium ? 'Yes 🌟' : 'No'}\n` +
            `🔹 *Subscription Date*: ${userInfo.subscription_date || 'Not Subscribed'}\n` +
            `🔹 *Today's Messages*: ${userInfo.total_messages || 0}\n` +
            `🔹 *Default Language*: ${userInfo.default_language || 'en'}\n\n` +
            `Use the buttons below to change settings.`;

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
        console.error('Error fetching user settings:', error.message);
        bot.sendMessage(chatId, 'Failed to load settings. Please try again.');
    }
}

// Show Language Options
async function showLanguageOptions(bot, chatId) {
    bot.sendMessage(chatId, '🌐 Select your default output language:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'English', callback_data: 'set_language_en' },
                    { text: 'Amharic', callback_data: 'set_language_am' },
                ],
                [
                    { text: 'Oromo', callback_data: 'set_language_or' },
                    { text: 'Tigrinya', callback_data: 'set_language_ti' },
                ],
                [
                    { text: 'Somali', callback_data: 'set_language_so' },
                    { text: 'Arabic', callback_data: 'set_language_ar' },
                ],
                [
                    { text: 'French', callback_data: 'set_language_fr' },
                    { text: 'Spanish', callback_data: 'set_language_es' },
                ],
            ],
        },
    });
}

// Set User Language
async function setLanguage(bot, chatId, callbackData) {
    const selectedLanguage = callbackData.replace('set_language_', '');
    try {
        const success = await db.updateUserLanguage(chatId, selectedLanguage);
        if (!success) {
            return bot.sendMessage(chatId, 'Failed to update your default language. Please try again.');
        }
        bot.sendMessage(chatId, `✅ Your default language has been updated to *${selectedLanguage}*.`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error updating language:', error.message);
        bot.sendMessage(chatId, 'An error occurred while updating your language. Please try again.');
    }
}

// Check daily limit
async function checkDailyLimit(chatId) {
    const { canSend, totalMessages } = await db.incrementMessageCount(chatId);
    return { canSend, totalMessages };
}

// Send limit reached message
function sendLimitReached(bot, chatId) {
    bot.sendMessage(
        chatId,
        "🚨 Oops! You've reached your daily message limit (10 messages). 😔\n\n" +
            "But don't worry! You can continue using the bot by buying more credits! 💳✨\n\n" +
            "👉 Click below to check out your subscription options and get more credits to keep chatting!\n\n" +
            "🛒 /subscription\n\n💰 <b>Daily Credits Left</b>: 0",
        { parse_mode: 'HTML' }
    );
}

// show help  how to use the bot 
function sendHelpMessage (bot, chatId) {
    bot.sendMessage(chatId, '📚 *How to Use the Bot*:\n\n' +
        '1. Send me any text message you want to translate or correct grammar.\n\n' +
        '2. Use the buttons below to choose an option.\n\n' +
        '3. You can also send me YouTube video links to download as MP3 files.\n\n' +
        '4. Send me Tiktok video links to download the video.\n\n' +
        '5. Upload images to extract text from them.\n\n' +
        '🔍 *Available Commands*:\n\n' +
        '/help - Show this help message\n' +
        '/settings - Show your user settings\n' +
        '/subscription - Check subscription options\n' +
        '/about - Show bot information\n\n' +
        '@horansoftware\n\n',
        { parse_mode: 'Markdown' }
    );
}
    


module.exports = { handleCallBackQuery, deleteMessage, handleTranslation, handleGrammarFix, showSettings, showLanguageOptions, setLanguage, checkDailyLimit, sendLimitReached, sendHelpMessage };
