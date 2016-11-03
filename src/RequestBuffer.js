const uuid = require('uuid');
const stream = require('stream');
const { Readable: ReadableStream } = stream;

class RequestBuffer extends ReadableStream {
    constructor(options = {}) {
        options.objectMode = true;
        super(options);

        this.pending = {};
        this.buffered = [];
    }

    add() {
        const start = new Date();
        const id = uuid.v1();
        this.pending[id] = {
            id,
            start
        };
        return id;
    }

    end(id) {
        const end = new Date();
        const request = this.pending[id];

        if (!request) {
            this.emit('error', new Error(`Request id '${id}' not found`));
            return;
        }

        request.end = end;
        request.duration = end - request.start;

        this._stream(request);

        delete this.pending[id];
    }

    _stream(request) {
        if (this.flowing) {
            this.push(request);
        } else {
            this.buffered.push(request);
        }
    }

    _read() {
        if (this.flowing) {
            return;
        }

        if (this.buffered.length) {
            this.buffered.forEach(request => this.push(request));
        }

        this.buffered = undefined;
        this.flowing = true;
    }
}

module.exports = RequestBuffer;
