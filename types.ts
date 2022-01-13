import type { Message }  from 'node-telegram-bot-api';

type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
type User = PropType<Message, 'from'>;

export type Task = 'work_task' | 'break_task' | 'long_break_task';

export interface DbRow {
    chat_id: number,
    user: NonNullable<User>
}

export interface IDatabase {
    set: (row: DbRow) => Promise<void>,
    disconnect: () => Promise<void>
}

export interface TimerState {
    timer?: {
        startTime: Date,
        timeout: NodeJS.Timeout | null,
        initial_duration: number,
        pause_remaining: number
    },

    pomodoros_done: number,
    task: Task,

    settings: {
        work_task: number,
        break_task: number,
        long_break_task: number,
        pomodoros: number
    }
}