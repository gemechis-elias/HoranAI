require('dotenv').config();
const axios = require('axios');
const { correctGrammar } = require('./helpers');

// Inline Translation Handler
async function handleInlineTranslation(query) {
    const userText = query.query;
    if (!userText) return;

    try {
        const response = await axios.get(`${process.env.TRANSLATE_API_URL}?q=${encodeURIComponent(userText)}&target=am`);
        const translatedText = decodeURIComponent(response.data.translatedText);

        query.bot.answerInlineQuery(query.id, [
            {
                type: 'article',
                id: '1',
                title: 'Translate to Amharic',
                input_message_content: {
                    message_text: `${translatedText}`
                }
            }
        ]);
    } catch (error) {
        console.error('Error in inline translation:', error);
    }
}

// Inline Grammar Fix Handler
async function handleInlineGrammarFix(query) {
    const userText = query.query;
    if (!userText) return;

    try {
        const correctedText = await correctGrammar(userText);

        query.bot.answerInlineQuery(query.id, [
            {
                type: 'article',
                id: '2',
                title: 'Grammar Fix',
                input_message_content: {
                    message_text: `${correctedText}`
                }
            }
        ]);
    } catch (error) {
        console.error('Error in inline grammar fix:', error);
    }
}

module.exports = { handleInlineTranslation, handleInlineGrammarFix };
