import colors from 'ansi-256-colors';

const SPACER = colors.fg.getRgb(1, 1, 1) + '┈' + colors.reset;

export default function createLogger() {
    const slots = new Array(3).fill(null);

    const getShade = function (start, now) {
        const time = now - start;
        const alertLevel = Math.floor((time - 50) / 50);

        if (alertLevel <= 0) {
            return '';
        }

        return colors.fg.getRgb(5, Math.max(6 - alertLevel, 0), 0);
    };

    return async function logger(context, next) {
        const start = Date.now();

        let slot;
        for (let i = 0; i < slots.length; i++) {
            if (!slots[i]) {
                slot = i;
                break;
            }
        }

        if (slot === undefined) {
            slots.push(null);
            slot = slots.length - 1;
        }

        const openSlot = slots.map(slot => slot ? getShade(slot, start) + '│' + colors.reset : SPACER);
        openSlot[slot] = '┬';
        slots[slot] = start;

        // eslint-disable-next-line no-console
        console.log(`${new Array(4).join(SPACER)} ⇾ ${context.method} ${new Array(6).join(SPACER)} ${openSlot.join(SPACER)} ${context.originalUrl}`);

        await next();

        const end = Date.now();

        let time = `${end - start}ms`;

        if (time.length < 5) {
            time = new Array(6 - time.length).join(SPACER) + time;
        }

        const closeSlot = slots.map(slot => slot ? getShade(slot, end) + '│' + colors.reset : SPACER);
        closeSlot[slot] = getShade(slots[slot], end) + '┴' + colors.reset;
        slots[slot] = null;

        // eslint-disable-next-line no-console
        console.log(`${context.status} ⇽ ${context.method} ${time} ${closeSlot.join(SPACER)} ${context.originalUrl}`);
    };
}
