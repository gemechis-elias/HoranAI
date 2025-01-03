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

    // Check if message has text content
    if (!msg.text || msg.text.startsWith('/')) return;

    try {
        const correctedText = await correctGrammar(msg.text);
        
        // Store the user's message ID
        const userMessageId = msg.message_id;

        // Send the corrected message with the Delete button
        const sentMessage = await bot.sendMessage(chatId, `<code>${correctedText}</code>\n \n click to copy`, {
            parse_mode : 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Translate', callback_data: 'translate' }, { text: 'Grammar Fix', callback_data: 'grammar_fix' }],
                    [{ text: 'Delete', callback_data: `delete:${userMessageId}` }]
                ]
            }
        });
    } catch (error) {
        console.error('Error handling message:', error);
        bot.sendMessage(chatId, "An error occurred while processing your message.");
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (query.data.startsWith('delete')) {
        try {
            const [, userMessageId] = query.data.split(':');
            await bot.deleteMessage(chatId, query.message.message_id); // Delete bot's message
            await bot.deleteMessage(chatId, userMessageId); // Delete user's message
        } catch (error) {
            console.error('Error deleting messages:', error);
        }
    }
});


console.log("LisanBot is running!");