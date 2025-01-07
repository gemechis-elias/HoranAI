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
    const { data } = await supabase
        .from('users')
        .select('total_messages, last_message_date')
        .eq('user_id', chatId)
        .single();

    const today = new Date().toISOString().split('T')[0];
    if (!data) return { canSend: false, totalMessages: 0 };

    if (data.last_message_date !== today) {
        await supabase.from('users').update({ total_messages: 1, last_message_date: new Date() }).eq('user_id', chatId);
        return { canSend: true, totalMessages: 1 };
    } else if (data.total_messages < 10) {
        await supabase.from('users').update({ total_messages: data.total_messages + 1 }).eq('user_id', chatId);
        return { canSend: true, totalMessages: data.total_messages + 1 };
    } else {
        return { canSend: false, totalMessages: 10 };
    }
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
