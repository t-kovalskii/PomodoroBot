import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';

import { getResponse } from "./actions";

dotenv.config();

const token = process.env.TELEGRAM_API_KEY || '';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', message => {
    if (!message.text || message.text.charAt(0) != '/') return;

    const chatId = message.chat.id;
    const response = getResponse(message);

    if (response)
        bot.sendMessage(chatId, response, { parse_mode: 'Markdown', disable_web_page_preview: true });
    else
        bot.sendMessage(chatId, '*This command does not exist*\n' +
            'Type /help to get the list of available commands', { parse_mode: 'Markdown' });
});

export default bot;
