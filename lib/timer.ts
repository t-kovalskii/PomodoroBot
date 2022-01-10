import TelegramBot from "node-telegram-bot-api";
import { Task, TimerState } from "../types";

export const getNextTask = (task: Task, done: number, pomodoros: number): [Task, number] => {
    if (task === 'work_task')
        return done === pomodoros - 1 ?
            ['long_break_task', 0] : ['break_task', done + 1];

    return ['work_task', done];
}

export const handleTimerRunout = (chat_id: number, bot: TelegramBot, t_settings: Map<number, TimerState>) => {
    const { settings, task, pomodoros_done } = t_settings.get(chat_id) as TimerState;
    const [new_task, new_pomodoros_done] = getNextTask(task, pomodoros_done, settings.pomodoros);

    // deleting timer state
    t_settings.set(chat_id, { settings, task: new_task, pomodoros_done: new_pomodoros_done });

    bot.sendMessage(chat_id, (() => {
        if (task === 'work_task')
            return 'Stop working for a while';
        else if (task === 'break_task')
            return 'Break is over';
        return 'Long break is over';
    })() + '\n*Type /go to start the next task*', { parse_mode: 'Markdown' });
}
