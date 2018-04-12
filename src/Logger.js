const stream = require('stream');
const { Transform: TransformStream } = stream;

class Logger extends TransformStream {
    constructor(options = {}) {
        options.writableObjectMode = true;
        super(options);
    }

    _write(request, encoding, next) {
        this.push(`${request.id} ${request.duration}\n`);
        next();
    }
}

module.exports = Logger;
