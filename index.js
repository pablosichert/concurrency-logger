import colors from 'ansi-256-colors';

const SPACER = colors.fg.getRgb(1, 1, 1) + '┈' + colors.reset;
const GET_LEVEL = responseTime => Math.floor(responseTime / 50) - 1;

function colorize(level = 0, character) {
    if (level <= 0) {
        return character;
    }

    let green = 6 - level;

    if (green < 0) {
        green = 0;
    }

    return colors.fg.getRgb(5, green, 0) + character + colors.reset;
}

export default function createLogger(options = {}) {
    const {
        minSlots = 3,
        getLevel = GET_LEVEL
    } = options;

    const slots = new Array(minSlots).fill(null);
    const colorizer = responseTime => {
        const level = getLevel(responseTime);

        return colorize.bind(null, level);
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

        let method = context.method;
        method = method.substr(0, 4);

        if (method.length < 4) {
            method += new Array(5 - method.length).join(SPACER);
        }

        // eslint-disable-next-line no-console
        console.log(`⟶   ${method} ${new Array(6).join(SPACER)} ${openSlot.join(SPACER)} ${context.originalUrl}`);

        await next();

        const end = Date.now();
        const responseTime = end - start;
        const timeColorize = colorizer(responseTime);

        let time = `${responseTime}ms`;

        if (time.length < 5) {
            time = new Array(6 - time.length).join(SPACER) + time;
        }

        time = timeColorize(time);

        const closeSlot = slots.map(slot => slot ? colorizer(end - slot)('│') : SPACER);
        closeSlot[slot] = timeColorize('┴');
        slots[slot] = null;

        // eslint-disable-next-line no-console
        console.log(`${context.status} ${method} ${time} ${closeSlot.join(SPACER)} ${context.originalUrl}`);
    };
}
