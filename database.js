const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gaexwodpzfivlcycxzgf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveUser(chatId, username) {
    const { data, error } = await supabase
        .from('users')
        .insert([{ user_id: chatId, start_date: new Date(), total_messages: 0 }]);
    if (error) console.error('Error saving user:', error);
}

async function incrementMessageCount(chatId) {
    const { data, error } = await supabase
        .from('users')
        .select('total_messages, last_message_date')
        .eq('user_id', chatId)
        .single();

    const today = new Date().toISOString().split('T')[0];

    if (!data) return { canSend: false, totalMessages: 0 };

    let newMessageCount = data.total_messages;
    
    if (data.last_message_date.split('T')[0] !== today) {
        await supabase.from('users')
            .update({ total_messages: 1, last_message_date: new Date() })
            .eq('user_id', chatId);
        newMessageCount = 1;
    } else if (data.total_messages < 10) {
        await supabase.from('users')
            .update({ total_messages: data.total_messages + 1, last_message_date: new Date() })
            .eq('user_id', chatId);
        newMessageCount = data.total_messages + 1;
    } else {
        return { canSend: false, totalMessages: 10 };
    }

    return { canSend: true, totalMessages: newMessageCount };
}

module.exports = { saveUser, incrementMessageCount };
