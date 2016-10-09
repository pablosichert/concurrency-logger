import colors from 'ansi-256-colors';

const SPACER = colors.fg.getRgb(1, 1, 1) + '┈' + colors.reset;
const GET_LEVEL = responseTime => Math.floor(responseTime / 50) - 1;

function colorize(color = 0) {
    if (typeof color === 'number') {
        if (color <= 0) {
            return character => character;
        }

        let green = 6 - color;

        if (green < 0) {
            green = 0;
        }

        return character => colors.fg.getRgb(5, green, 0) + character + colors.reset;
    } else {
        let format;

        if (color === 'info') {
            format = colors.fg.standard[4];
        }

        if (format) {
            return character => format + character + colors.reset;
        } else {
            return character => character;
        }
    }
}

export default function createLogger(options = {}) {
    const {
        minSlots = 3,
        getLevel = GET_LEVEL,
        width = 80
    } = options;

    const slots = new Array(minSlots).fill(null);
    const colorizer = responseTime => {
        const level = getLevel(responseTime);

        return colorize(level);
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

        const logger = (format, formatLine = format) => (...args) => {
            const message = args.map(arg => {
                if (arg instanceof Error) {
                    return JSON.stringify(arg, Object.getOwnPropertyNames(arg));
                }

                if (arg instanceof Object) {
                    return JSON.stringify(arg);
                }

                return arg;
            }).join(' ');

            const metaLength = 14;
            const messageWidth = width - metaLength - slots.length * 2 - 1;

            const now = Date.now();
            const _slots = slots.map(slot => slot ? colorizer(now - slot)('│') : SPACER);
            _slots[slot] = format('│');

            for (let i = 0; i < message.length; i = i + messageWidth) {
                const line = message.substr(i, messageWidth);

                // eslint-disable-next-line no-console
                console.log(`${new Array(metaLength + 1).join(' ')} ${_slots.join(SPACER)} ${formatLine(line)}`);
            }
        };

        context.log = logger(colorize('info'), string => string);
        context.info = logger(colorize('info'));
        context.error = logger(colorize(6));

        await next();

        const end = Date.now();
        const responseTime = end - start;
        const timeColorize = colorizer(responseTime);

        let time = `${responseTime}ms`;

        if (time.length < 5) {
            time = new Array(6 - time.length).join(SPACER) + time;
        }

        time = timeColorize(time);

        let status = context.status;

        if (status >= 100 && status < 200) {
            status = colorize('info')(status);
        } else if (status < 300) {
            // Success
        } else if (status >= 300 && status < 400) {
            status = colorize(1)(status);
        } else if (status < 500) {
            status = colorize(4)(status);
        } else {
            status = colorize(6)(status);
        }

        const closeSlot = slots.map(slot => slot ? colorizer(end - slot)('│') : SPACER);
        closeSlot[slot] = timeColorize('┴');
        slots[slot] = null;

        // eslint-disable-next-line no-console
        console.log(`${status} ${method} ${time} ${closeSlot.join(SPACER)} ${context.originalUrl}`);
    };
}
