const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveUser(chatId, username) {
    // Check if the user already exists in the database
    const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', chatId)
        .single();

    // If the user already exists, return early
    if (data) {
        console.log(`User with ID ${chatId} already exists.`);
        return;
    }

    // If the user does not exist, insert a new record
    const { insertData, insertError } = await supabase
        .from('users')
        .insert([{ user_id: chatId, start_date: new Date(), total_messages: 0 }]);

    if (insertError) {
        console.error('Error saving user:', insertError);
    } else {
        console.log(`User with ID ${chatId} saved successfully.`);
    }
}

async function incrementMessageCount(chatId) {
    const { data, error } = await supabase
        .from('users')
        .select('total_messages, last_message_date')
        .eq('user_id', chatId)
        .single();

    const today = new Date().toISOString().split('T')[0];

    if (!data) {
        // If no data, it means the user doesn't exist in the database, so return a default response
        return { canSend: false, totalMessages: 0 };
    }

    let newMessageCount = data.total_messages;

    // Handle case where last_message_date is null
    if (data.last_message_date === null || data.last_message_date.split('T')[0] !== today) {
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
