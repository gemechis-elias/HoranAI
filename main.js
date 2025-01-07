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
    bot.sendMessage(chatId, `Hello ${msg.chat.first_name}! Welcome to LisanBot!`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Help', callback_data: 'help' }],
                [{ text: 'Settings', callback_data: 'settings' }]
            ]
        }
    });
});

// Help Button
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data === 'help') {
        bot.sendMessage(chatId, "You can send a message to fix its grammar or translate it! Thank you");
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
        const userMessageId = msg.message_id;
        await bot.sendMessage(
            chatId, 
            `<code>${correctedText}</code>\n\n✅ Messages Sent: ${totalMessages}/10\n🕰️ Messages Left: ${messagesLeft}`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Translate', callback_data: `translate:${encodeURIComponent(msg.text)}` }, { text: 'Grammar Fix', callback_data: 'grammar_fix' }],
                        [{ text: 'Delete', callback_data: `delete:${userMessageId}` }] 
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

    if (query.data.startsWith('delete')) {
        try {
            const [, userMessageId] = query.data.split(':');
            await bot.deleteMessage(chatId, query.message.message_id); 
            await bot.deleteMessage(chatId, userMessageId); 
        } catch (error) {
            console.error('Error deleting messages:', error);
        }
    }

    if (query.data.startsWith('translate')) {
        try {
            const [, textToTranslate] = query.data.split(':');
            const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(textToTranslate)}&target=am`);
            bot.sendMessage(chatId, `Translated: ${response.data.translatedText}`);
        } catch (error) {
            console.error('Translation error:', error);
            bot.sendMessage(chatId, "Error while translating the text.");
        }
    }
});

console.log("LisanBot is running!");