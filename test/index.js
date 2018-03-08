import { readdirSync, readFileSync, createWriteStream } from 'fs';
import { resolve } from 'path';
import { fg, reset as colorEnd } from 'ansi-256-colors';
import { clone as unexpected } from 'unexpected';
import sinon from 'sinon';
import unexpectedSinon from 'unexpected-sinon';
import { Writable } from 'stream';

import createLogger, { colorize } from '../src';

const expect = (unexpected()
    .use(unexpectedSinon)
);

const _process = process;

Object.defineProperty(process.stdout, 'columns', {
    get: () => 80
});

const fixturesDir = 'fixtures';

function createReporter(context, testTitle) {
    let reporter;

    if (process.env.CREATE_FIXTURES) {
        const title = testTitle.replace(/\s/g, '_');
        const fileName = `${title}.log`;

        print(fg.getRgb(0, 5, 0) + '+' + colorEnd, fileName);

        reporter = createWriteStream(
            resolve(__dirname, `${fixturesDir}/${fileName}`)
        );
    } else {
        context.output = '';
        reporter = new Writable({
            write(chunk, encoding, next) {
                context.output += chunk.toString();
                next();
            }
        });
    }

    return reporter;
}

let fixtures;

if (process.env.CREATE_FIXTURES) {
    fixtures = {};

    /* eslint-disable no-console */
    const log = console.log.bind(console);

    console.log = () => {};
    /* eslint-enable */

    log(`Writing to ${resolve('/test', fixturesDir)}`);

    global.print = log;
} else {
    fixtures = (readdirSync(resolve(__dirname, fixturesDir))
        .reduce((fixtures, file) => {
            let title = file.replace(/_/g, ' ');
            title = title.substr(0, title.lastIndexOf('.'));

            fixtures[title] = readFileSync(
                resolve(__dirname, `${fixturesDir}/${file}`),
                { encoding: 'utf-8' }
            );

            return fixtures;
        }, {})
    );
}

describe('createLogger', () => {
    it('should create a koa compatible middleware', async () => {
        sinon.stub(process.stdout, 'write', () => {});

        try {
            const logger = createLogger();

            const context = {
                method: 'GET',
                originalUrl: '/',
                status: 500
            };

            const next = sinon.spy(() => {
                context.status = 200;
            });

            await logger(context, next);

            expect(next, 'was called');
        } catch (error) {
            throw error;
        } finally {
            process.stdout.write.restore();
        }
    });
});

describe('logger', () => {
    before(function () {
        this.createLogger = title => opts => {
            const logger = createLogger({
                ...opts,
                reporter: createReporter(this, title)
            });

            return logger;
        };
    });

    after(function () {
        delete this.createLogger;
    });

    beforeEach(function () {
        this.clock = sinon.useFakeTimers(+new Date('2000'));
    });

    afterEach(function () {
        this.clock.restore();
    });

    it('should log a request and a response', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should pass on errors', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const error = new Error();
        error.stack = 'Error\n    at stack';

        const next = () => {
            throw error;
        };

        await expect(logger(context, next), 'to be rejected with', error);
    });

    describe('status codes', () => {
        const types = {
            '1xx (Informational)': [
                100, 101, 102
            ],
            '2xx (Success)': [
                200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
            ],
            '3xx (Redirection)': [
                300, 301, 302, 303, 304, 305, 306, 307, 308,
            ],
            '4xx (Client error)': [
                400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 420, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 444, 449,
            ],
            '5xx (Server error)': [
                500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511
            ]
        };

        for (const type of Object.keys(types)) {
            it(`should format ${type}`, async function () {
                const title = this.test.fullTitle();
                const createLogger = this.createLogger(title);

                const logger = createLogger();

                for (const status of types[type]) {
                    const context = {
                        method: 'GET',
                        originalUrl: '/'
                    };

                    const next = () => {
                        context.status = status;
                    };

                    await logger(context, next);
                }

                expect(this.output, 'to equal', fixtures[title]);
            });
        }
    });

    it('should format response time', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        for (const responseTime of [
            0, 100, 1000, 10000, 100000, 1000000
        ]) {
            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                this.clock.tick(responseTime);

                context.status = 200;
            };

            await logger(context, next);
        }

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should color response time', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const resolvers = [];
        const loggers = [];

        for (let i = 0; i < 8; i++) {
            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = async () => {
                await new Promise(resolve => {
                    resolvers.push(resolve);
                });

                context.status = 200;
            };

            loggers.push(logger(context, next));
        }

        while (resolvers.length) {
            resolvers.pop()();
            await loggers.pop();
            this.clock.tick(50);
        }

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should log an unhandled error', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            const error = new Error();
            error.stack = 'Error\n    at stack';

            throw error;
        };

        try {
            await logger(context, next);
        } catch (error) {
            // Not interested in this one
        }

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should expose context.log method', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.log('Log!');

            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should expose context.log.info method', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.log.info('Info!');

            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should expose context.log.error method', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.log.error('Error!');

            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should pretty print functions', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.log(Function);

            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should pretty print objects', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger();

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.log({ foo: 123 });

            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should show timestamp', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger({
            timestamp: true
        });

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should use custom colorizer', async function () {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        const logger = createLogger({
            colorizer: () => string => `${fg.getRgb(5, 0, 0)}${string}${colorEnd}`
        });

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.status = 200;
        };

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    it('should expand when timestamp needs more space', async function() {
        const title = this.test.fullTitle();
        const createLogger = this.createLogger(title);

        this.clock.tick(1 * 60 * 60 * 1000);

        const logger = createLogger({
            timestamp: true
        });

        const context = {
            method: 'GET',
            originalUrl: '/'
        };

        const next = () => {
            context.status = 200;
        };

        await logger(context, next);

        this.clock.tick(10 * 60 * 60 * 1000);

        await logger(context, next);

        this.clock.tick(14 * 60 * 60 * 1000);

        await logger(context, next);

        expect(this.output, 'to equal', fixtures[title]);
    });

    describe('width', () => {
        it('reads from process.stdout.columns by default', async function() {
            const createLogger = this.createLogger();

            const spy = sinon.spy();

            const _stdout = _process.stdout;

            const stdout = Proxy.revocable(_stdout, {
                get: (target, name) => {
                    if (name === 'columns') {
                        return spy();
                    } else {
                        return target[name];
                    }
                }
            });

            const process = Proxy.revocable(_process, {
                get: (target, name) => {
                    if (name === 'stdout') {
                        return stdout.proxy;
                    } else {
                        return target[name];
                    }
                }
            });

            global.process = process.proxy;

            try {
                const logger = createLogger();

                const context = {
                    method: 'GET',
                    originalUrl: '/'
                };

                const next = () => {};

                await logger(context, next);

                expect(spy, 'was called');
            } catch (error) {
                throw error;
            } finally {
                stdout.revoke();
                process.revoke();

                global.process = _process;
            }
        });

        it('should not break lines when set to false', async function() {
            const title = this.test.fullTitle();
            const createLogger = this.createLogger(title);

            const logger = createLogger({
                width: false
            });

            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                context.log(Array(50).join('log'));

                context.status = 200;
            };

            await logger(context, next);

            expect(this.output, 'to equal', fixtures[title]);
        });

        it('should break at specific column', async function() {
            const title = this.test.fullTitle();
            const createLogger = this.createLogger(title);

            const logger = createLogger({
                width: 80
            });

            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                context.log(Array(50).join('log'));

                context.status = 200;
            };

            await logger(context, next);

            expect(this.output, 'to equal', fixtures[title]);
        });

        it('can be provided as function', async function() {
            const title = this.test.fullTitle();
            const createLogger = this.createLogger(title);

            const logger = createLogger({
                width: () => 80
            });

            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                context.log(Array(50).join('log'));

                context.status = 200;
            };

            await logger(context, next);

            expect(this.output, 'to equal', fixtures[title]);
        });
    });

    describe('getLevel', () => {
        it('has access to responseTime and context', async function() {
            const createLogger = this.createLogger();
            const getLevel = sinon.spy();

            const logger = createLogger({
                getLevel
            });

            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                this.clock.tick(50);
                context.status = 200;
            };

            await logger(context, next);

            expect(getLevel, 'was called with', 50, context);
        });
    });
});

describe('colorize', () => {
    it('returns an identity function if unknow color is provided', () => {
        const string = 'foo';

        expect(colorize('')(string), 'to be', string);
    });
});
