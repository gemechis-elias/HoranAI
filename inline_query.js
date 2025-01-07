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
        const correctedText = await correctGrammar(userText);

        
        bot.answerInlineQuery(query.id, [
            {
                type: 'article',
                id: '1',
                title: 'Amharic Translation',
                description: `${translatedText}`,
                input_message_content: {
                    message_text: `${translatedText}`,
                    parse_mode: 'HTML'  
                }
            },
            {
                type: 'article',
                id: '2',
                title: 'Corrected Grammar',
                description: `${correctedText}`,
                input_message_content: {
                    message_text: `${correctedText}`,
                    parse_mode: 'HTML'  
                }
            }
        ]);
        
    } catch (error) {
        console.error('Error in inline translation:', error);
    }
}


module.exports = { handleInlineContent };
