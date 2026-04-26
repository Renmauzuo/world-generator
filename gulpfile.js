const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const promisedDel = require('promised-del');
const sass = require('sass');
const postcssCombineSelectors = require('postcss-combine-duplicated-selectors');
const postcssImport = require('postcss-import');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const { rollup: rollupBuild } = require('rollup');
const rollupTypescript = require('rollup-plugin-typescript2');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const $ = gulpLoadPlugins();

const development = $.environments.development;
const production = $.environments.production;

const clean = () => promisedDel('docs/');
const cleanCSS = () => promisedDel('docs/**/*.css');
const cleanHTML = () => promisedDel('docs/**/*.html');
const cleanJS = () => promisedDel('docs/**/*.js');
const cleanJSON = () => promisedDel('docs/**/*.json');

const html = () =>
	gulp.src('src/pages/**/*.pug', { base: 'src/pages/' })
		.pipe($.pug())
		.pipe(development($.htmlBeautify({
			'indent_size': 1,
			'indent_char': '	',
			'wrap_line_length': 0,
			'end_with_newline': true
		})))
		.pipe(production($.htmlmin({ collapseWhitespace: true })))
		.pipe(production($.eol()))
		.pipe(gulp.dest('docs'));

const cacheBusting = () =>
    gulp.src('docs/**/*.html', {base: 'docs'})
        .pipe(require('through2').obj(function(file, enc, cb) {
            let html = file.contents.toString();
            html = html.replace(/(src|href)="([^"]+\.(js|css))"/g, (match, attr, filePath) => {
                const absPath = path.join('docs', filePath);
                try {
                    const hash = crypto.createHash('md5').update(fs.readFileSync(absPath)).digest('hex');
                    return `${attr}="${filePath}?v=${hash}"`;
                } catch (e) {
                    return match;
                }
            });
            file.contents = Buffer.from(html);
            cb(null, file);
        }))
		.pipe(gulp.dest('docs'));

const css = () =>
	gulp.src('src/**/*.scss', { base: 'src' })
		.pipe(development($.sourcemaps.init()))
		.pipe($.sass(sass)({
			indentType: 'space',
			indentWidth: 2
		}).on('error', $.sass(sass).logError))
		.pipe($.postcss([
			postcssImport({ path: ['node_modules'] }),
			postcssCombineSelectors({ removeDuplicatedProperties: true }),
			autoprefixer({ grid: true }),
			cssnano({ autoprefixer: false })
		]))
		.pipe($.rename((path) => {
			path.basename += '.min'
		}))
		.pipe(development($.sourcemaps.write('.')))
		.pipe($.eol())
		.pipe(gulp.dest('docs'));


const js = async () => {
	const { nodeResolve } = await import('@rollup/plugin-node-resolve');
	const commonjs = (await import('@rollup/plugin-commonjs')).default;

	const isDev = process.env.NODE_ENV !== 'production';

	const bundle = await rollupBuild({
		input: 'src/scripts/scripts.ts',
		treeshake: false, //No treeshaking because some of the constants aren't used until runtime
		plugins: [
			nodeResolve({ browser: true, preferBuiltins: false }),
			commonjs(),
			rollupTypescript({ tsconfig: './tsconfig.json' })
		]
	});

	await bundle.write({
		file: 'docs/scripts/scripts.min.js',
		format: 'iife',
		sourcemap: isDev
	});

	await bundle.close();
};

const json = () =>
    gulp.src('src/**/*.json', { base: 'src' })
        .pipe(gulp.dest('docs'));

const build = gulp.series(gulp.parallel(css, js, html, json), cacheBusting);

const watch = () => {
	gulp.watch('src/**/*.scss', gulp.series(cleanCSS, css));
	gulp.watch('src/**/*.pug', gulp.series(cleanHTML, html, cacheBusting));
	gulp.watch('src/**/*.ts', gulp.series(cleanJS, js));
	gulp.watch('src/**/*.json', gulp.series(cleanJSON, json));
};
		

exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.rebuild = gulp.series(clean, build);
exports.default = gulp.series(clean, build, watch);
