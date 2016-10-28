import createLogger from '../../src';
import Convert from 'ansi-to-html';
import { useFakeTimers } from 'sinon';

function $(selector) {
    return document.querySelector(selector);
}

const convert = new Convert;
const toHtml = convert.toHtml.bind(convert);

const $terminal = $('#terminal');

const log = message => {
    const div = document.createElement('div');
    div.innerHTML = message;
    $terminal.appendChild(div);
};

const prompt = toHtml('[38;5;59mapp[0m') + (
    ' <span style="color: #00A0FF;">$</span>'
);

log(`${prompt} npm start`);
log('&nbsp;');
log('Waiting for requests.');
log('&nbsp;');

let last = 0;
let scrollFrame;
let autoScroll = true;

const scroll = now => {
    const {
        scrollTop,
        scrollHeight,
        clientHeight
    } = $terminal;

    const abs = scrollHeight - (scrollTop + clientHeight);

    const factor = (now - last) / 100;
    let add = factor * abs;

    if (add < 1) {
        add = 1;
    }

    $terminal.scrollTop = scrollTop + add;

    last = now;

    if (autoScroll) {
        scrollFrame = requestAnimationFrame(scroll);
    }
};

scrollFrame = requestAnimationFrame(scroll);

const $scroll = $('#scroll');

const resumeScroll = () => {
    autoScroll = true;
    last = performance.now();
    scrollFrame = requestAnimationFrame(scroll);
    $scroll.className = '';
};

$scroll.addEventListener('click', resumeScroll);

let lastScrollTop = 0;

$terminal.addEventListener('scroll', event => {
    const {
        scrollTop,
        scrollHeight,
        clientHeight
    } = event.target;

    if (scrollTop < lastScrollTop) {
        if (autoScroll) {
            autoScroll = false;
            cancelAnimationFrame(scrollFrame);
            $scroll.className = 'active';
        }
    } else if (scrollHeight - scrollTop - clientHeight < 100) {
        if (!autoScroll) {
            resumeScroll();
        }
    }

    lastScrollTop = scrollTop;
});

const logger = createLogger({
    width: 80,
    reporter: {
        write: line => {
            requestAnimationFrame(() => {
                log(toHtml(line.replace(/\s/g, '&nbsp;')));
            });
        }
    }
});

const clock = useFakeTimers(+new Date, 'Date');
const timeFactor = 0.01;

setInterval(() => {
    clock.tick(1);
}, 1 / timeFactor);

setInterval(() => {
    const context = {
        method: 'GET',
        originalUrl: '/'
    };

    const next = async () => {
        await new Promise(resolve =>
            setTimeout(resolve, Math.random() * 105 / timeFactor)
        );
        context.status = 200;
    };

    logger(context, next);
}, 1000);

$('#redirect').addEventListener('click', () => {
    const context = {
        method: 'GET',
        originalUrl: '/redirect'
    };

    const next = async () => {
        context.log('\nWill get a redirect\n\n');
        await new Promise(resolve => setTimeout(resolve, 10 / timeFactor));
        context.status = 301;
    };

    logger(context, next);
});

$('#not-found').addEventListener('click', () => {
    const context = {
        method: 'GET',
        originalUrl: '/not-found'
    };

    const next = async () => {
        context.log('\nThe resource will not be found\n\n');
        await new Promise(resolve => setTimeout(resolve, 10 / timeFactor));
        context.status = 404;
    };

    logger(context, next);
});

$('#error').addEventListener('click', async () => {
    const context = {
        method: 'GET',
        originalUrl: '/faulty'
    };

    const next = async () => {
        context.log('\nThis one will throw an error\n\n');
        await new Promise(resolve => setTimeout(resolve, 25 / timeFactor));
        const error = new Error;
        throw error.stack;
    };

    try {
        await logger(context, next);
    } catch (error) {
        // Not handling that one
    }
});

$('#long').addEventListener('click', () => {
    const context = {
        method: 'POST',
        originalUrl: '/intensive'
    };

    const next = async () => {
        context.log('\nThis is going to be a long request\n\n');
        await new Promise(resolve => setTimeout(resolve, 350 / timeFactor));
        context.status = 200;
    };

    logger(context, next);
});

const $requests = $('#requests');
const $method = $('#method');
const $originalUrl = $('#url');
const $status = $('#status');
const $ms = $('#ms');

$('#custom').addEventListener('click', async () => {
    const method = $method.value;
    const originalUrl = $originalUrl.value;
    const status = $status.value;
    const ms = parseInt($ms.value);

    const context = {
        method,
        originalUrl
    };

    const next = async () => {
        const div = document.createElement('div');

        div.innerHTML = (
            `<span>${method} ${originalUrl} ${status} ${ms}ms</span>`
        );

        const buttons = document.createElement('div');

        const log = document.createElement('button');
        log.innerHTML = 'Log';

        log.addEventListener('click', () => {
            context.log('\nLog during a request\n\n');
        });

        buttons.appendChild(log);

        let reject = () => {};

        const error = document.createElement('button');
        error.innerHTML = 'Error';

        error.addEventListener('click', () => {
            const error = new Error;

            reject(error.stack);
        });

        buttons.appendChild(error);

        div.appendChild(buttons);

        $requests.appendChild(div);

        try {
            await new Promise((resolve, _reject) => {
                const timeout = setTimeout(resolve, ms / timeFactor);
                reject = (...args) => {
                    clearTimeout(timeout);
                    _reject(...args);
                };
            });

            context.status = status;
        } finally {
            $requests.removeChild(div);
        }
    };

    try {
        await logger(context, next);
    } catch (error) {
       // User triggered error!
    }
});
