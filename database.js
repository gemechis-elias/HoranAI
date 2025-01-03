const users = {}; // Simple in-memory storage for demonstration

async function saveUser(chatId, username) {
    users[chatId] = { username };
    console.log(`User saved: ${chatId}`);
}

module.exports = { saveUser };
