import fs from 'fs';
import { resolve } from 'path';
import browserify from 'browserify';
import babelify from 'babelify';
import es2015 from 'babel-preset-es2015';

(browserify([
    'node_modules/babel-polyfill',
    resolve(__dirname, '../src')
])
    .transform(babelify.configure({
        presets: [es2015]
    }))
    .bundle()
    .pipe(fs.createWriteStream(resolve(__dirname, '../dist/bundle.js')))
);
