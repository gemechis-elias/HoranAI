require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { correctGrammar, getUserInfo } = require('./helpers');
const db = require('./database');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Greet new users
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username);
    bot.sendMessage(chatId, `Hello ${msg.chat.first_name}! Welcome to HoranAI!\nSend me any text or image`, {
        reply_markup: {
            inline_keyboard: [
               
                [{ text: 'Settings', callback_data: 'settings' }]
            ]
        }
    });
});

// Help Button
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'help') {
        bot.sendMessage(chatId, "You can send a message to fix its grammar or translate it!");
    } else if (query.data === 'settings') {
        const userInfo = await getUserInfo(chatId);
        bot.sendPhoto(chatId, userInfo.profilePicUrl, {
            caption: `User ID: ${chatId}\nUsername: ${userInfo.username}`
        });
    }
});

// Grammar and Translation
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text || msg.text.startsWith('/')) return;

    const { canSend, totalMessages } = await db.incrementMessageCount(chatId);
    const messagesLeft = 10 - totalMessages;

    if (!canSend) {
        return bot.sendMessage(chatId, "You've reached your daily message limit (10 messages). Upgrade to premium for unlimited usage.");
    }

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


bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;

    if (query.data.startsWith('delete:')) {
        try {
            // Get the message ID of the message to delete (the one that contains the inline buttons)
            const messageIdToDelete = query.message.message_id;

            // Delete the message that contains the inline buttons
            await bot.deleteMessage(chatId, messageIdToDelete);
            
            // Optionally, you can also delete the original message that the user replied to
            const userMessageId = query.message.reply_to_message ? query.message.reply_to_message.message_id : null;
            if (userMessageId) {
                await bot.deleteMessage(chatId, userMessageId);
            }
        } catch (error) {
            console.error('Error deleting messages:', error);
        }
    }

    // Handle translation and grammar fix as before
    if (query.message.reply_to_message) {
        const userMessageId = query.message.reply_to_message.message_id;  // Get the replied message ID

        if (query.data.startsWith('translate:')) {
            try {
                // Get the original message that the user replied to
                const message = query.message.reply_to_message;

                const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(message.text)}&target=am`);
                const translatedText = decodeURIComponent(response.data.translatedText);

                await bot.sendMessage(
                    chatId, 
                    `<code>${translatedText}</code>\n\n💰 Daily Credits Left: ${10 - await db.getMessageCount(chatId)}`,
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
                // Get the original message that the user replied to
                const message = query.message.reply_to_message;

                const correctedText = await correctGrammar(message.text);

                await bot.sendMessage(
                    chatId, 
                    `<code>${correctedText}</code>\n\n💰 Daily Credits Left: ${10 - await db.getMessageCount(chatId)}`,
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
    } else {
        // bot.sendMessage(chatId, "No message was replied to. Please reply to a message to perform this action.");
    }
});





console.log("LisanBot is running!");
