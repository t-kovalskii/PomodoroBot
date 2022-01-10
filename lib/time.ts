export const formatMilliseconds = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(Math.floor(milliseconds / 1000) / 60);

    return `${minutes} minutes ${seconds} seconds`;
}

export const toMills = (minutes: number) => minutes * 60 * 1000;
