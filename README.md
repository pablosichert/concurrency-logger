# concurrency-logger
[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Coverage status][coveralls-image]][coveralls-url]
[![Dependency status][david-dm-image]][david-dm-url]
[![Dev dependency status][david-dm-dev-image]][david-dm-dev-url]

HTTP logging middleware especially useful to unwind concurrent operations without losing the request context

<a href="https://pablosichert.github.io/concurrency-logger/">
    <p align="center">
        <img src="https://cloud.githubusercontent.com/assets/4450694/19836607/c60e0ed2-9ea5-11e6-8696-556eed7ea7c9.gif" alt="HTTP logs in a terminal, visualizing server status codes, response times, debug information and errors for concurrent requests" />
        <br />
        Launch demo in your browser
    </p>
</a>

## Install
```
$ npm install concurrency-logger
```

## Usage

### With [koa](https://github.com/koajs/koa)

#### Basic usage
```js
import Koa from 'koa';
import createLogger from 'concurrency-logger';

const app = new Koa;

// Logger is stateful as it contains information about concurrent requests
// Same instance needs to be reused across requests
const logger = createLogger(/* options */);

app.use(logger);
```

#### Log from middleware
```js
// Log something in context to a specific request to trace it back easily -
// also when there are multiple concurrent requests
app.use(async (context, next) => {
    context.log('Log!');
    context.log.info('Info!');
    context.log.error('Error!');

    await next();
});
```

#### Attach more [context](https://github.com/koajs/koa/blob/master/docs/api/context.md#request-aliases) to the log
```js
const logger = createLogger({
    req: context => (
        context.originalUrl + '\n' +
        context.get('User-Agent')
    )
});
```

#### Include localized timestamps
```js
const logger = createLogger({
    timestamp: true
});
```

#### Write log to file
```js
import { createWriteStream } from 'fs';

// To read log use program that interprets ANSI escape codes,
// e.g. cat or less -r
const log = createWriteStream('logs/requests.log');

const logger = createLogger({
    reporter: log
});
```

#### Adjust alert levels per method and response time
```js
const logger = createLogger({
    getLevel: (responseTime, context) => {
        /*
            GET
              0 -  99ms: 0
            100 - 149ms: 1
            150 - 199ms: 2
            200 - 249ms: 3
            250 - 299ms: 4
            300 - 349ms: 5
            > 350ms    : 6

            POST
              0 - 149ms: 0
            150 - 225ms: 1
                   ... : ...
        */

        let threshold = 50; // ms

        if (['POST', 'PUT'].includes(context.method)) {
            threshold *= 1.5;
        }

        return Math.floor(responseTime / threshold) - 1;
    }
});
```

### Standalone
```js
import createLogger from 'concurrency-logger';

const logger = createLogger(/* options */);

(async () => {
    const context = {
        method: 'GET',
        originalUrl: '/'
    };

    const next = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));

        context.status = 200;
    };

    try {
        await logger(context, next);
    } catch (error) {
        // Errors are passed through
    }
})();
```

## API
| Option | Type | Default | Description | Example |
| ---- | ---- | ------- | ----------- | ------- |
| minSlots | integer | `1` | Amount of space that is provisioned to display concurrent request lanes. Number of lanes will automatically scale up as the number of concurrent requests grow. | `3`
| getLevel | integer: function(responseTime: integer) | `responseTime => Math.floor(responseTime / 50) - 1` | Map response time to alert level. Alert levels go from 0 (default color) to 6 (dark red). By default that means `<100ms: 0`, `<150ms: 1` `<200ms: 2`, ..., `>=350ms: 6`. | `responseTime => Math.floor(responseTime / 100)`
| width | integer, boolean(`false`) | `undefined` | If no width is provided, it will be dynamically read from `process.stdout.columns`. Pass in an integer to break all lines according to the specified fixed (terminal character) width. Pass in `false` if you want the lines not to break at all. | `80`, `132`, `false`
| timestamp | boolean | `false` | Print localized timestamp for every requests. | `true`, `false`
| slim | boolean | `false` | "Slim mode": don't use an extra character between request lanes to shrink width, but make them harder to separate visually. | `true`, `false`
| reporter | writable stream | `process.stdout` | Specify a stream that handles the output lines. Write to terminal or stream to a log file, for example. Note that the lines contain ANSI color codes, so when streaming to a file you might need a program that can read those. E.g. `less -r requests.log` | `require('fs').createWriteStream('logs/requests.log')`
| req | any: function(context: object) | `context => context.originalUrl` | Attach additional information to the request log line. | `context => context.originalUrl + '\n' + context.get('User-Agent')`
| res | any: function(context: object) | `context => context.originalUrl` | Attach additional information to the response log line. | `context => context.originalUrl + '\n' + context.get('User-Agent')`

## Developing
Install development dependencies
```
$ npm install
```

Create new fixtures to test against
```
$ npm run create-fixtures
```

Manually review fixtures (you need a program that renders ANSI escape codes)
```
$ less -r test/fixtures/*
```

Run tests
```
$ npm test
```

Run code linter
```
$ npm run lint
```

Compile to ES5 from /src to /lib
```
$ npm run compile
```

Initialize demo project
```
$ git clone git@github.com:PabloSichert/concurrency-logger demo
$ cd demo
demo $ git checkout gh-pages
demo $ npm install
```

Build demo
```
demo $ npm run compile
```

[npm-url]: https://npmjs.org/package/concurrency-logger
[npm-image]: https://badge.fury.io/js/concurrency-logger.svg
[travis-url]: https://travis-ci.org/PabloSichert/concurrency-logger?branch=master
[travis-image]: https://travis-ci.org/PabloSichert/concurrency-logger.svg?branch=master
[coveralls-url]:https://coveralls.io/r/PabloSichert/concurrency-logger?branch=master
[coveralls-image]:https://coveralls.io/repos/PabloSichert/concurrency-logger/badge.svg?branch=master
[david-dm-url]:https://david-dm.org/PabloSichert/concurrency-logger
[david-dm-image]:https://david-dm.org/PabloSichert/concurrency-logger.svg
[david-dm-dev-url]:https://david-dm.org/PabloSichert/concurrency-logger#info=devDependencies
[david-dm-dev-image]:https://david-dm.org/PabloSichert/concurrency-logger/dev-status.svg
