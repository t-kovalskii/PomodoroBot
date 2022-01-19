import bot from './bot';
import { formatMilliseconds, toMills } from "./lib/time";
import { getNextTask, handleTimerRunout } from "./lib/timer";
import { getDB } from "./redis";

import type TelegramBot from 'node-telegram-bot-api';
import type { TimerState } from "./types";

const timerSettings = new Map<number, TimerState>();

const actions: { [key: string]: (msg: TelegramBot.Message) => Promise<string> } = {
    'start': async message => {
        timerSettings.set(message.chat.id, {
            settings: {
                work_task: toMills(25), break_task: toMills(10),
                long_break_task: toMills(30), pomodoros: 4
            },
            pomodoros_done: 0,
            task: 'work_task'
        });

        const db = await getDB();
        if (message.from)
            await db.set({ chat_id: message.chat.id, user: message.from });
        await db.disconnect();

        return `Hello, *${message.from ? message.from.first_name : 'stranger'}* 🍅 \n` +
            'I\'m a pomodoro timer bot created to organize workflow using pomodoro technique. ' +
            'It is a quite simple technique which offers optimal combination of pure focused work and rest. ' +
            'If you don\'t know about the pomodoro technique yet, you can read about it ' +
            '[here](https://en.wikipedia.org/wiki/Pomodoro_Technique).\n\n' +
            'Type /help to get the list of available commands';
    },

    'help': async () => '/set - *changes work, break, long break duration and pomodoros count* `/set 25 10 30 4`\n' +
        "/settings - *current timer settings*\n" + "/info - *current timer state*\n" +
        "/go - *start current task*\n" + "/pause - *pause current task*\n" +
        "/skip - *skip current task*\n" + "/cancel - *cancel current task*",

    'set': async message => {
        const { timer } = timerSettings.get(message.chat.id) as TimerState;

        if (timer?.timeout)
            clearTimeout(timer.timeout);

        const settings = message.text!.split(' ').slice(1);
        const parsed = settings.map(s => parseInt(s));

        if (parsed.some(n => isNaN(n)) || parsed.length < 4)
            return 'Type the command in the following format:\n' +
                '`/set %work %break %long_break %pomodoros`';

        const [
            work_minutes, break_minutes, long_break_minutes, pomodoros
        ] = parsed;

        timerSettings.set(message.chat.id, {
            settings: {
                work_task: toMills(Math.floor(work_minutes)), break_task: toMills(Math.floor(break_minutes)),
                long_break_task: toMills(Math.floor(long_break_minutes)), pomodoros: Math.floor(pomodoros)
            },
            pomodoros_done: 0,
            task: 'work_task'
        });

        return 'Timer settings have been changed';
    },

    'settings': async message => {
        const { settings } = timerSettings.get(message.chat.id) as TimerState;

        return `Work: *${formatMilliseconds(settings!.work_task)}*\n` +
            `Break: *${formatMilliseconds(settings!.break_task)}*\n` +
            `Long break: *${formatMilliseconds(settings!.long_break_task)}*\n` +
            `Pomodoros before long break: *${settings!.pomodoros}*`;
    },

    'info': async message => {
        const { timer, task } = timerSettings.get(message.chat.id) as TimerState;

        if (timer) {
            const remaining = timer.timeout ?
                timer.initial_duration - (new Date().getTime() - timer.startTime.getTime()) :
                timer.pause_remaining;

            const remainingStr = formatMilliseconds(remaining);

            return `${timer.timeout ? 'Timer is running' : 'Timer paused'}\n` +
                `Current task: *${task}*\n` +
                `Time remaining: *${remainingStr}*`;
        }

        return 'Timer is not running\n' + `Current task: *${task}*`;
    },

    'go': async message => {
        const {
            timer, settings, pomodoros_done, task
        } = timerSettings.get(message.chat.id) as TimerState;

        if (timer && timer.timeout)
            return 'Timer is already running';

        timerSettings.set(message.chat.id, {
            settings, timer: {
                startTime: new Date(),
                timeout: setTimeout(
                    () => handleTimerRunout(message.chat.id, bot, timerSettings),
                    timer ? timer.pause_remaining : settings[task]
                ),
                initial_duration: timer ? timer.pause_remaining : settings[task],
                pause_remaining: 0
            },
            pomodoros_done, task
        });

        return `Timer has been started\n` + `Current task: *${task}*\n` +
            `*${formatMilliseconds(timer ? timer.pause_remaining : settings[task])}* remaining`;
    },

    'pause': async message => {
        const {
            timer, settings, task, pomodoros_done
        } = timerSettings.get(message.chat.id) as TimerState;

        if (!timer?.timeout)
            return 'Timer is not running';

        clearTimeout(timer.timeout);
        timerSettings.set(message.chat.id, {
            timer: {
                startTime: timer.startTime,
                timeout: null,
                initial_duration: timer.initial_duration,
                pause_remaining: timer.initial_duration - (new Date().getTime() - timer.startTime.getTime())
            },
            pomodoros_done, task, settings
        });

        return 'Timer paused';
    },

    'skip': async message => {
        const { settings, task, pomodoros_done, timer } = timerSettings.get(message.chat.id) as TimerState;

        if (timer?.timeout)
            clearTimeout(timer.timeout);

        const [new_task, new_pomodoros_done] = getNextTask(task, pomodoros_done, settings.pomodoros);
        timerSettings.set(message.chat.id, {
            settings, task: new_task, pomodoros_done: new_pomodoros_done
        });

        return `Task *${task}* skipped\n` + '*Type /go to start the next task*';
    },

    'cancel': async message => {
        const { settings, task, pomodoros_done, timer } = timerSettings.get(message.chat.id) as TimerState;

        if (timer?.timeout)
            clearTimeout(timer.timeout);

        timerSettings.set(message.chat.id, { settings, task, pomodoros_done });

        return 'Task cancelled';
    },

    'rate': async () => 'You can rate the bot [here](https://t.me/dailychannelsbot?start=p_timer_bot)',

    'sus': async () => `\
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⣤⣤⣤⣤⣶⣦⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⡿⠛⠉⠙⠛⠛⠛⠛⠻⢿⣿⣷⣤⡀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⠋⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⠈⢻⣿⣿⡄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣸⣿⡏⠀⠀⠀⣠⣶⣾⣿⣿⣿⠿⠿⠿⢿⣿⣿⣿⣄⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣿⣿⠁⠀⠀⢰⣿⣿⣯⠁⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣷⡄⠀
⠀⠀⣀⣤⣴⣶⣶⣿⡟⠀⠀⠀⢸⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣷⠀
⠀⢰⣿⡟⠋⠉⣹⣿⡇⠀⠀⠀⠘⣿⣿⣿⣿⣷⣦⣤⣤⣤⣶⣶⣶⣶⣿⣿⣿⠀
⠀⢸⣿⡇⠀⠀⣿⣿⡇⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀
⠀⣸⣿⡇⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠉⠻⠿⣿⣿⣿⣿⡿⠿⠿⠛⢻⣿⡇⠀⠀
⠀⣿⣿⠁⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣧⠀⠀
⠀⣿⣿⠀⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀⠀
⠀⣿⣿⠀⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⠀⠀
⠀⢿⣿⡆⠀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀
⠀⠸⣿⣧⡀⠀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⠃⠀⠀
⠀⠀⠛⢿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⣰⣿⣿⣷⣶⣶⣶⣶⠶⢠⣿⣿⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣿⣿⠀⠀⠀⠀⠀⣿⣿⡇⠀⣽⣿⡏⠁⠀⠀⢸⣿⡇⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣿⣿⠀⠀⠀⠀⠀⣿⣿⡇⠀⢹⣿⡆⠀⠀⠀⣸⣿⠇⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢿⣿⣦⣄⣀⣠⣴⣿⣿⠁⠀⠈⠻⣿⣿⣿⣿⡿⠏⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠈⠛⠻⠿⠿⠿⠿⠋⠁`
};

export const getResponse = async (message: TelegramBot.Message) => {
    const actionName = message.text!.slice(1).split(' ')[0];
    const action = actions[actionName];

    return action ? await action(message) : null;
}
