import colors from 'ansi-256-colors';

const SPACER = colors.fg.getRgb(1, 1, 1) + '┈' + colors.reset;
const GET_LEVEL = responseTime => Math.floor(responseTime / 50) - 1;

export default function createLogger(options = {}) {
    const {
        minSlots = 3,
        getLevel = GET_LEVEL
    } = options;

    const slots = new Array(minSlots).fill(null);
    const colorizer = responseTime => character => {
        const level = getLevel(responseTime);

        if (level <= 0) {
            return character;
        }

        let green = 6 - level;

        if (green < 0) {
            green = 0;
        }

        return colors.fg.getRgb(5, green, 0) + character + colors.reset;
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

        const openSlot = slots.map(slot => slot ? colorizer(start - slot)('│') : SPACER);
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

        const closeSlot = slots.map(slot => slot ? colorizer(end - slot)('│') : SPACER);
        closeSlot[slot] = colorizer(end - slots[slot])('┴');
        slots[slot] = null;

        // eslint-disable-next-line no-console
        console.log(`${context.status} ⇽ ${context.method} ${time} ${closeSlot.join(SPACER)} ${context.originalUrl}`);
    };
}
