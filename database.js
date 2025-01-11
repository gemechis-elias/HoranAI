const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Save user without last_message column
async function saveUser(chatId, username) {
    try {
        const { data, error: selectError } = await supabase
            .from('users')
            .select('user_id')
            .eq('user_id', chatId)
            .single();

        if (selectError && selectError.code !== 'PGRST116') { // Allow "No Rows Found" error
            console.error('Error fetching user:', selectError.message);
            return;
        }

        if (data) {
            console.log('User already exists:', data.user_id);
            return;
        }

        const { error: insertError } = await supabase.from('users').insert([{
            user_id: chatId,
            username: username,
            start_date: new Date(),
            total_messages: 0,
            // last message as yesterday to allow for first message
            last_message_date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0]
        }]);

        if (insertError) {
            console.error('Error inserting user:', insertError.message);
        } else {
            // console.log('User successfully saved:', chatId);
        }
    } catch (error) {
        console.error('Unexpected error while saving user:', error.message);
    }
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
