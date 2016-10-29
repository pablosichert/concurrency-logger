import { readFileSync, createWriteStream } from 'fs';
import { resolve } from 'path';
import browserify from 'browserify';
import babelify from 'babelify';
import es2015 from 'babel-preset-es2015';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

(browserify([
    'node_modules/babel-polyfill',
    resolve(__dirname, '../src')
])
    .transform(babelify.configure({
        presets: [es2015]
    }))
    .bundle()
    .pipe(createWriteStream(resolve(__dirname, '../dist/bundle.js')))
);

(postcss([ autoprefixer ])
    .process(readFileSync(resolve(__dirname, '../src/style.css')))
    .then(result => {
        const file = createWriteStream(resolve(__dirname, '../dist/style.css'));
        file.write(result.css);
    })
);
