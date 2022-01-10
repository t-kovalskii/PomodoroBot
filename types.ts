export type Task = 'work_task' | 'break_task' | 'long_break_task';

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