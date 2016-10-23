# concurrency-logger
[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Coverage status][coveralls-image]][coveralls-url]
[![Dependency status][david-dm-image]][david-dm-url]
[![Dev dependency status][david-dm-dev-image]][david-dm-dev-url]

HTTP logging middleware especially useful to unwind concurrent operations without losing the request context

## Install
```bash
$ npm install concurrency-logger
```

## Usage
### With [koa](https://github.com/koajs/koa)
```js
import Koa from 'koa';
import createLogger from 'concurrency-logger';

const app = new Koa;

const logger = createLogger(/* options */);

// Basic logger
app.use(logger);

// Log something in context to a specific request to trace it back easily,
// even when there are multiple concurrent requests
app.use(async (context, next) => {
    context.log('Log!');
    context.log.info('Info!');
    context.log.error('Error!');

    await next();
});

// ...
```

## API
| Option | Type | Default | Description | Example |
| ---- | ---- | ------- | ----------- | ------- |
| minSlots | integer | `1` | Amount of space that is provisioned to display concurrent request lanes. Number of lanes will automatically scale up as the number of concurrent requests grow. | `3`
| getLevel | integer: function(responseTime: integer) | `responseTime => Math.floor(responseTime / 50) - 1` | Map response time to alert level. Alert levels go from 0 (default color) to 6 (dark red). By default that means `<100ms: 0`, `<150ms: 1` `<200ms: 2`, ..., `>=350ms: 6`. | `responseTime => Math.floor(responseTime / 100)`
| width | integer, boolean(`false`) | `undefined` | If no width is provided, it will be dynamically read from `process.stdout.columns`. Pass in an integer to break all lines according to the specified fixed (terminal character) width. Pass in `false` if you want the lines not to break at all. | `80`, `132`, `false`
| timestamp | boolean | `false` | Print localized timestamp for every requests. | `true`, `false`
| slim | boolean | `false` | "Slim mode": don't use an extra character between request lanes to shrink width, but make them harder to separate visually. | `true`, `false`
| reporter | function(line: string) | `console.log.bind(console)` | Specify a function that handles the output lines. Write to terminal or stream to a log file, for example. Note that the log contains ANSI color codes, so you might need a program that can read those. E.g. `less -r requests.log` | `line => logStream.write(line + '\n')`
| req | any: function(context: object) | `context => context.originalUrl` | Attach additional information to the request log line. | `context => context.originalUrl + '\n' + context.get('User-Agent')`
| res | any: function(context: object) | `context => context.originalUrl` | Attach additional information to the response log line. | `context => context.originalUrl + '\n' + context.get('User-Agent')`

## Developing
Install development dependencies
```
npm install
```

Run tests
```
npm test
```

Run code linter
```
npm run lint
```

Compile to ES5 from /src to /lib
```
npm run compile
```

[npm-url]: https://npmjs.org/package/concurrency-logger
[npm-image]: https://badge.fury.io/js/concurrency-logger.svg
[travis-url]: https://travis-ci.org/PabloSichert/concurrency-logger
[travis-image]: http://img.shields.io/travis/PabloSichert/concurrency-logger.svg
[coveralls-url]:https://coveralls.io/r/PabloSichert/concurrency-logger
[coveralls-image]:https://coveralls.io/repos/PabloSichert/concurrency-logger/badge.svg
[david-dm-url]:https://david-dm.org/PabloSichert/concurrency-logger
[david-dm-image]:https://david-dm.org/PabloSichert/concurrency-logger.svg
[david-dm-dev-url]:https://david-dm.org/PabloSichert/concurrency-logger#info=devDependencies
[david-dm-dev-image]:https://david-dm.org/PabloSichert/concurrency-logger/dev-status.svg
