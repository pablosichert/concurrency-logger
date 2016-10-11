import colors, { fg, reset as colorEnd } from 'ansi-256-colors';

const {
    getRgb: rgb
} = fg;

const SPACER = rgb(1, 1, 1) + '┈' + colorEnd;
const GET_LEVEL = responseTime => Math.floor(responseTime / 50) - 1;

function join(strings, ...values) {
    const indent = strings[0].match(/\n( *)/)[1];

    let result = '';

    for (let i = 0; i < strings.length; i++) {
        const split = strings[i].split(indent);

        result += (split[1] || '') + (values[i] || '');

        if (i !== strings.length - 1) {
            result += ' ';
        }
    }

    return result;
}

function chars(character, num) {
    let string = '';

    for (let i = 0; i < num; i++) {
        string += character;
    }

    return string;
}

function colorize(color = 0) {
    if (typeof color === 'number') {
        if (color <= 0) {
            return character => character;
        }

        let green = 6 - color;

        if (green < 0) {
            green = 0;
        }

        return character => rgb(5, green, 0) + character + colorEnd;
    } else {
        let format;

        if (color === 'info') {
            format = colors.fg.standard[4];
        }

        if (format) {
            return character => format + character + colorEnd;
        } else {
            return character => character;
        }
    }
}

function printToConsole(maxLocaleTimeLength, width, slots, slot, colorizer) {
    return (format, formatLine) => {
        return (...args) => {
            if (!formatLine) {
                if (format) {
                    formatLine = format;
                } else {
                    formatLine = string => string;
                }
            }

            const message = args.map(arg => {
                if (arg instanceof Error) {
                    return arg.stack;
                }

                if (arg instanceof Object) {
                    return JSON.stringify(arg, null, 2).replace(/\\n/g, '\n');
                }

                return arg;
            }).join(' ');

            maxLocaleTimeLength = maxLocaleTimeLength();

            const messageWidth = (
                width - 4 - maxLocaleTimeLength - 6 - slots.length * 2 - 1
            );

            const now = new Date;

            const _slots = slots.map(slot =>
                slot ? colorizer(now - slot)('│') : ' '
            );

            _slots[slot] = (
                format ? format('╎') : _slots[slot].replace('│', '╎')
            );

            for (let i = 0; i < message.length; i = i + messageWidth) {
                let line = message.substr(i, messageWidth);

                const lineBreak = line.indexOf('\n');
                if (lineBreak >= 0) {
                    line = line.substr(0, lineBreak);
                    i = i - messageWidth + lineBreak + 1;
                }

                const meta = chars(' ', 4 + maxLocaleTimeLength + 5);

                // eslint-disable-next-line no-console
                console.log(join`
                    ${meta}
                    ${_slots.join(' ')}
                    ${formatLine(line)}
                `);
            }
        };
    };
}

export default function createLogger(options = {}) {
    const {
        minSlots = 1,
        getLevel = GET_LEVEL,
        width = 80
    } = options;

    const slots = new Array(minSlots).fill(null);

    const colorizer = responseTime => {
        const level = getLevel(responseTime);

        return colorize(level);
    };

    let maxLocaleTimeLength = (new Date).toLocaleTimeString().length;

    return async function logger(context, next) {
        const start = new Date;

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

        const openSlot = slots.map(slot =>
            slot ? colorizer(start - slot)('│') : SPACER
        );

        openSlot[slot] = '┬';
        slots[slot] = +start;

        let method = context.method;
        method = method.substr(0, 4);

        if (method.length < 4) {
            method += chars(SPACER, 4 - method.length);
        }

        let localeTime = start.toLocaleTimeString();

        if (localeTime.length > maxLocaleTimeLength) {
            maxLocaleTimeLength = localeTime.length;
        } else if (localeTime.length < maxLocaleTimeLength) {
            localeTime += (
                chars(SPACER, maxLocaleTimeLength - localeTime.length)
            );
        }

        // eslint-disable-next-line no-console
        console.log(join`
            ⟶   ${localeTime}
            ${method}
            ${openSlot.join(SPACER)}
            ${context.originalUrl}
        `);

        const printer = printToConsole(
            () => maxLocaleTimeLength,
            width,
            slots,
            slot,
            colorizer
        );

        const log = printer();
        log.info = printer(colorize('info'));
        log.error = printer(colorize(6));

        context.log = log;

        try {
            await next();
        } catch(error) {
            context.status = 500;
            log.error(error);
        }

        const end = new Date;
        const responseTime = end - start;
        const timeColorize = colorizer(responseTime);

        let time = `${responseTime}ms`;

        const timeLength = time.length;

        time = timeColorize(time);

        if (timeLength < maxLocaleTimeLength) {
            time = chars(SPACER, maxLocaleTimeLength - timeLength) + time;
        }

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

        const closeSlot = slots.map(slot =>
            slot ? colorizer(end - slot)('│') : SPACER
        );

        closeSlot[slot] = timeColorize('┴');
        slots[slot] = null;

        // eslint-disable-next-line no-console
        console.log(join`
            ${status}
            ${time}
            ${method}
            ${closeSlot.join(SPACER)}
            ${context.originalUrl}
        `);
    };
}
