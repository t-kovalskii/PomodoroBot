import type TelegramBot from 'node-telegram-bot-api';

const actions: { [key: string]: (msg: TelegramBot.Message) => string } = {
    'start': message => `Hello, *${message.from ? message.from.first_name : 'stranger'}* 🍅 \n` +
        'I\'m a pomodoro timer bot created to organize workflow using pomodoro technique. ' +
        'It is a quite simple technique which offers optimal combination of pure focused work and rest. ' +
        'If you don\'t know about the pomodoro technique yet, you can read about it ' +
        '[here](https://en.wikipedia.org/wiki/Pomodoro_Technique).\n\n' +
        'Type /help to get the list of available commands',

    'help': () => '/set - *changes work, break, long break duration and pomodoros count* `/set 25 10 30 4`\n' +
        "/settings - *current timer settings*\n" + "/info - *current timer state*\n" +
        "/go - *start current task*\n" + "/pause - *pause current task*\n" +
        "/skip - *skip current task*\n" + "/cancel - *cancel current task*"
};

export const getResponse = (message: TelegramBot.Message) => {
    const actionName = message.text!.slice(1);
    const action = actions[actionName];

    return action ? action(message) : null;
}
