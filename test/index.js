import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { clone as unexpected } from 'unexpected';
import sinon from 'sinon';
import unexpectedSinon from 'unexpected-sinon';

import createLogger from '../src';

const expect = (unexpected()
    .use(unexpectedSinon)
);

function reporter(context) {
    context.output = '';

    return line => {
        context.output += line + '\n';
    };
}

const fixtures = (readdirSync(resolve(__dirname, './fixtures'))
    .reduce((fixtures, file) => {
        const title = file.replace(/_/g, ' ').split('.log')[0];

        fixtures[title] = readFileSync(
            resolve(__dirname, `./fixtures/${file}`),
            { encoding: 'utf-8' }
        );

        return fixtures;
    }, {})
);

describe('createLogger', () => {
    it('should create a koa compatible middleware', async () => {
        sinon.stub(console, 'log', () => {});

        try {
            const logger = createLogger();

            const method = sinon.spy(() => 'GET');
            const originalUrl = sinon.spy(() => '/');
            const status = sinon.spy(() => 200);

            const context = {
                get method() {
                    return method();
                },
                get originalUrl() {
                    return originalUrl();
                },
                get status() {
                    return status();
                }
            };

            const next = sinon.spy(() => Promise.resolve());

            await logger(context, next);

            expect(method, 'was called');
            expect(originalUrl, 'was called');
            expect(next, 'was called');
        } catch (error) {
            throw error;
        } finally {
            // eslint-disable-next-line no-console
            console.log.restore();
        }
    });
});

describe('logger', () => {
    beforeEach(function () {
        this.clock = sinon.useFakeTimers(+new Date('2000'));
    });

    afterEach(function () {
        this.clock.restore();
    });

    describe('configured with defaults', () => {
        before(function () {
            this.logger = createLogger({
                reporter: reporter(this)
            });
        });

        after(function () {
            delete this.logger;
        });

        it('should log a request and a response', async function () {
            const context = {
                method: 'GET',
                originalUrl: '/'
            };

            const next = () => {
                context.status = 200;
            };

            await this.logger(context, next);

            expect(this.output, 'to equal', fixtures[this.test.fullTitle()]);
        });
    });
});
