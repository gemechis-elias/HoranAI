require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { correctGrammar, getUserInfo } = require('./helpers');
const db = require('./controller');
const { isUserMemberOrSubscribed } = require('./controller');
const { handleInlineContent } = require('./inline_query');
const fs = require('fs');
const { extractTextFromImage } = require('./text_from_image/image_handler.js');
const { createClient } = require('@supabase/supabase-js');
const { handleCallBackQuery, showLanguageOptions, sendHelpMessage } = require('./callback_handler');
const { youtubeHandler } = require('./youtube/youtube_handler');
const { tiktokHandler } = require('./tiktok/tiktok_handler');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });



bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});


// Greet new users with interactive options
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username ? msg.chat.username : msg.chat.first_name);

    // Send greeting message with interactive options
    bot.sendMessage(
        chatId,
        `👋 Hello, *${msg.chat.first_name}*! Welcome to *Horan AI*! 🚀`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '♻️ Refresh' }, { text: '🌐 Change Language' }],
                    [{ text: '❓ Help' }, { text: '📢 Join Channel' }],
                    [{ text: '🏠 Main Menu' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        }
    );

    bot.sendMessage(
        chatId,
        `Here’s what I can do for you:\n\nChoose one of the options below to get started!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📜 Translate', callback_data: 'translate' }, { text: '🔍 Fix Grammar', callback_data: 'grammar_fix' }],
                    [{ text: '🎵 YouTube Downloader', callback_data: 'download_mp3' }],
                    [{ text: '🔗 TikTok Downloader', callback_data: 'download_video' }],
                    [{ text: '🖼️ Extract Text from Image', callback_data: 'extract_text' }],
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


  // Handle the /total_users command
  bot.onText(/\/total_users/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const totalUsers = await db.getTotalUsers();
        await bot.sendMessage(chatId, `👥 Total users: *${totalUsers}*`, {
            parse_mode: 'Markdown',
        });
    } catch (error) {
        console.error('Error fetching total users:', error);
        await bot.sendMessage(chatId, '❌ Unable to fetch total users at the moment.');
    }

});

// Inline Query
bot.on('inline_query', (query) => handleInlineContent(bot, query))

// Handle button clicksx
bot.on('callback_query', async (query) => handleCallBackQuery(bot, query));


bot.on('message', async (msg) => {

    if (!msg.photo &&  /^\/.*/.test(msg.text)) {
        return;
    }

    const chatId = msg.chat.id;
    await db.saveUser(chatId, msg.chat.username? msg.chat.username : msg.chat.first_name);

   

    // handle keyboard text
    switch (msg.text) {
        case '♻️ Refresh':
            bot.sendMessage(
                chatId,
                `The bot is live and ready to assist you! 🚀`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                          
                            [{ text: '⚙️ Settings', callback_data: 'settings' }]
                        ]
                    }
                }
            );
            return;
          
        case '🌐 Change Language':
            await showLanguageOptions(bot, chatId);
            return;
        case '❓ Help':
            await sendHelpMessage(bot, chatId);
            return;
        case '📢 Join Channel':
            bot.sendMessage( chatId, "📢 Join our channel for updates and more exciting features! \n\n👉 [Join Channel](https://t.me/horansoftware)", {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            });
            return;
        case '🏠 Main Menu':
            bot.sendMessage(
                chatId,
                `👋 Hello, *${msg.chat.first_name}*! Welcome to *Horan AI*! 🚀\n\nHere’s what I can do for you:\n\n` +
                `Choose one of the options below to get started!`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📜 Translate', callback_data: 'translate' }, { text: '🔍 Fix Grammar', callback_data: 'grammar_fix' }],
                            [{ text: '🎵 YouTube Downloader', callback_data: 'download_mp3' }],
                            [{ text: '🔗 TikTok Downloader', callback_data: 'download_video' }],
                            [{ text: '🖼️ Extract Text from Image', callback_data: 'extract_text' }],
                            [{ text: '⚙️ Settings', callback_data: 'settings' }]
                        ]
                    }
                }
            );
            return;
        default:
            break;
    }


    // Check if the user is a member of the channel or a premium subscriber
    const isMemberOrSubscribed = await isUserMemberOrSubscribed(bot, chatId);
       // Increment the message count and check if the user can continue
    const { canSend } = await db.checkMessageCount(chatId);
    if (!isMemberOrSubscribed && !canSend) {
        await bot.sendMessage(
            chatId,
            "🚨 Oops! You've reached your daily message limit (10 messages). To use this bot, please follow our channel for updates or subscribe to premium. \n\n👉 [Follow Our Channel](https://t.me/hora_software)",
            {
                parse_mode: "Markdown",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📢 Join Channel", url: "https://t.me/horansoftware" },
                            { text: "🌟 Subscribe to Premium", callback_data: "subscribe" },
                        ],
                    ],
                },
            }
        );
        return;
    }


    // Handle images
    if (msg.photo) {
        try {
            // Get the highest resolution photo
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const fileUrl = await bot.getFileLink(fileId);
            await bot.sendMessage(chatId, "Processing the image to extract text...");

            // Call the OCR handler
            const extractedText = await extractTextFromImage(fileUrl);
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

    // Check for YouTube video links and handle MP3 download
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w\-]+)/;
    const youtubeMatch = msg.text.match(youtubeRegex);
    if (youtubeMatch) {
        await youtubeHandler(bot, chatId, youtubeMatch[0]);
        return;
    }
    

    // Check for TikTok video links and handle download
    const tiktokRegex = /https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+|https?:\/\/vm\.tiktok\.com\/[^\s]+/;
    const tiktokMatch = msg.text.match(tiktokRegex);
    if (tiktokMatch) {
        const tiktokUrl = tiktokMatch[0];
        await tiktokHandler(bot, chatId, tiktokUrl);
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


console.log("HoranBot is running!");