const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Save user without last_message column
async function saveUser(chatId, username) {
    const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', chatId)
        .single();

    if (data) return;

    await supabase.from('users').insert([{
        user_id: chatId,
        username: username,
        start_date: new Date(),
        total_messages: 0,
        last_message_date: ''  // This field tracks the last message date for rate limiting
    }]);
}

// Increment message count
async function incrementMessageCount(chatId) {
    const { data, error } = await supabase
        .from('users')
        .select('total_messages, last_message_date')
        .eq('user_id', chatId)
        .single();

    const today = new Date().toISOString().split('T')[0];  

    if (!data) {
        // If no data is found, return default (user doesn't exist yet).
        return { canSend: false, totalMessages: 0 };
    }

    let newMessageCount = data.total_messages;

    // Handle case where last_message_date is null or it's not today
    if (!data.last_message_date || data.last_message_date.split('T')[0] !== today) {
        // Update the message count to 1 if it's a new day
        await supabase.from('users')
            .update({ total_messages: 1, last_message_date: today })
            .eq('user_id', chatId);
        newMessageCount = 1;
    } else if (data.total_messages < 10) {
        // If the user has sent less than 10 messages, increment the count
        await supabase.from('users')
            .update({ total_messages: data.total_messages + 1 })
            .eq('user_id', chatId);
        newMessageCount = data.total_messages + 1;
    } else {
        // If the user has reached the daily message limit, return false
        return { canSend: false, totalMessages: 10 };
    }

    return { canSend: true, totalMessages: newMessageCount };
}


async function getMessageCount(chatId) {
    const { data } = await supabase
        .from('users')
        .select('total_messages')
        .eq('user_id', chatId)
        .single();
    return data ? data.total_messages : 0;
}

module.exports = { saveUser, incrementMessageCount, getMessageCount };
