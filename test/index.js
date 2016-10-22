import { clone as unexpected } from 'unexpected';
import sinon from 'sinon';
import unexpectedSinon from 'unexpected-sinon';

import createLogger from '../src';

const expect = (unexpected()
    .use(unexpectedSinon)
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
