// CSS build pipeline for the braun-hugo theme.
// Mirrors the Ghost Casper-style flow that produced the original bundle:
//   assets/css/screen.css (entrypoint with @imports)
//     → postcss-easy-import (resolves @imports, including @tryghost/shared-theme-assets)
//     → postcss-custom-properties (kept for parity with old pipeline)
//     → autoprefixer
//     → cssnano (minify)
//     → assets/built/screen.css (+ .map)

const { src, dest, watch, series } = require('gulp');
const postcss = require('gulp-postcss');
const easyImport = require('postcss-easy-import');
const customProperties = require('postcss-custom-properties');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const sourcemaps = require('gulp-sourcemaps');

function css() {
  const processors = [
    easyImport(),
    customProperties({ preserve: true }),
    autoprefixer(),
    cssnano(),
  ];
  return src('assets/css/screen.css', { sourcemaps: true })
    .pipe(sourcemaps.init())
    .pipe(postcss(processors))
    .pipe(sourcemaps.write('.'))
    // Hugo serves /static/assets/built/* at /assets/built/* via the repo-root
    // static directory. That's the canonical home for the built bundle —
    // the theme-local assets/built/ path is not served.
    .pipe(dest('../../static/assets/built/'));
}

function watchCss() {
  watch('assets/css/**/*.css', css);
}

exports.css = css;
exports.watch = series(css, watchCss);
exports.default = css;
