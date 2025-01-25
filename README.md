# HoranAI

![Node.js Version](https://img.shields.io/badge/Node.js-20.18-green)
![OpenAI](https://img.shields.io/badge/OpenAI-4.77-orange)
![Telegram Bot API](https://img.shields.io/badge/Telegram_Bot_API-latest-blue)
![GitHub Stars](https://img.shields.io/github/stars/gemechis-elias/HoranAI?style=social)

HoranAI is a Node.js-powered Telegram bot designed for All in one Tool using the OpenAI API and an external translation service. This bot allows users to send messages for grammar correction and supports inline message editing for easy interaction within chats.

## Features

- **Grammar Correction:** Fix grammatical errors using OpenAI's language model.
- **Translation:** Translate messages.
- **Inline Message Support:** Perform corrections and translations directly in any chat using inline mode.
- **User Interaction:** Greet users on first start with a welcome message.
- **Youtube Video Download:** Download Youtube videos by sending the video link.
- **Tiktok Video Download:** Download Tiktok videos by sending the video link.
- **OCR:** Extract text from images using Optical Character Recognition.
- **Inline Buttons:**
  - `Translate`: Translates the corrected message.
  - `Grammar Fix`: Fixes grammatical errors again.
  - `Delete`: Deletes the bot's message and the user's last message.
  - `Settings`: Displays user profile information.
  - `Help`: Provides guidance on how to use the bot.

## Getting Started

### Prerequisites
Ensure you have the following installed:
- Node.js v20.18+
- Telegram Bot Token from BotFather
- OpenAI API Key

### Installation
```bash
# Clone the repository
git clone https://github.com/gemechis-elias/HoranAI.git

# Navigate into the project directory
cd HoranAI

# Install dependencies
npm install
```

### Environment Variables
Create a `.env` file in the root directory with the following keys:
```plaintext
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=your-openai-model
TRANSLATE_API_URL=your-translation-api-url
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-
YOUTUBE_DOWNLOADER_API_URL=your-youtube-downloader-api-url
TIKTOK_DOWNLOADER_API_URL=your-tiktok-downloader-api-url
OCR_API_KEY=your-ocr-api-key
```

### Running the Bot
```bash
node bot.js
```
HoranAI Bot will start polling for messages and respond to commands.

## Usage
1. **Start the Bot:** Use `/start` to begin interacting with the bot.
2. **Grammar Correction:** Send a message, and the bot will return the corrected version with buttons.
3. **Inline Mode:** Mention the bot's username in any chat and provide a message for inline grammar correction.
4. **Translation:** Click `Translate` to get a translated version.
5. **Settings:** Click `Settings` to view your profile info.
6. **Help:** Click `Help` for usage instructions.

## Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.

## License
This project is open-source and available under the [MIT License](LICENSE).

---

⭐️ Star this repository to show your support!

