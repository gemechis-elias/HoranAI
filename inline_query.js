require('dotenv').config();
const axios = require('axios');
const { correctGrammar } = require('./helpers');

// Inline Translation Handler
async function handleInlineTranslation(bot, query) {
    const userText = query.query;
    if (!userText) return;

    try {
        const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(userText)}&target=am`);
        const translatedText = decodeURIComponent(response.data.translatedText);

        bot.answerInlineQuery(query.id, [
            {
                type: 'article',
                id: '1',
                title: 'Translate to Amharic',
                description: `${translatedText}`,
                input_message_content: {
                    message_text: `<b>Translation:</b>\n${translatedText}`,
                    parse_mode: 'HTML'  // Ensure proper formatting
                }
            }
        ]);
    } catch (error) {
        console.error('Error in inline translation:', error);
    }
}

// Inline Grammar Fix Handler
async function handleInlineGrammarFix(bot, query) {
    const userText = query.query;
    if (!userText) return;

    try {
        const correctedText = await correctGrammar(userText);

        bot.answerInlineQuery(query.id, [
            {
                type: 'article',
                id: '2',
                title: 'Grammar Fix',
                input_message_content: {
                    message_text: `<b>Corrected Text:</b>\n${correctedText}`,
                    parse_mode: 'HTML'  // Ensure proper formatting
                }
            }
        ]);
    } catch (error) {
        console.error('Error in inline grammar fix:', error);
    }
}

module.exports = { handleInlineTranslation, handleInlineGrammarFix };
