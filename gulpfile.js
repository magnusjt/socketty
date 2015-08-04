var gulp = require('gulp');

var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var merge = require('utils-merge');

var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');

var gutil = require('gulp-util');
var chalk = require('chalk');
var prettyHrtime = require('pretty-hrtime');

// Configuration options
var distFilePath = './client/dist';
var targetFileName = 'app.js';
var targetFileNameMin = 'app.min.js';
var appFilePath = './client/app.js';
var babelifyOpts = {stage: 0}; // Enable all experimental features
var browserifyTransformOpts = {};

function logError(err){
    gutil.log(
        gutil.colors.red("Browserify"),
        gutil.colors.red(err.name),
        ' ',
        gutil.colors.yellow(err.message),
        "\n\t",
        gutil.colors.cyan("in file"),
        err.filename
    );
}

function bundleDev(bundler){
    return bundler.bundle()
        .on('error', logError)
        .pipe(source(targetFileName))
        .pipe(buffer())
        .pipe(gulp.dest(distFilePath))
        .pipe(rename(targetFileNameMin))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(distFilePath))
}

function bundleDist(bundler){
    return bundler.bundle()
        .on('error', logError)
        .pipe(source(targetFileName))
        .pipe(buffer())
        .pipe(rename(targetFileNameMin))
        .pipe(uglify())
        .pipe(gulp.dest(distFilePath))
}

gulp.task('watchify', function () {
    var args = merge(watchify.args, {debug: true});
    var bundler = watchify(browserify(appFilePath, args)).transform(babelify.configure(babelifyOpts), browserifyTransformOpts);
    bundleDev(bundler);

    bundler.on('update', function (){
        gutil.log('Watchify updating...');
        var startTime = process.hrtime();
        bundleDev(bundler);
        gutil.log('Watchify complete in ' + prettyHrtime(process.hrtime(startTime)));
    })
});
gulp.task('browserify', function () {
    var bundler = browserify(appFilePath, {debug: true}).transform(babelify.configure(babelifyOpts), browserifyTransformOpts);
    return bundleDev(bundler)
});
gulp.task('build', function () {
    var bundler = browserify(appFilePath).transform(babelify.configure(babelifyOpts), browserifyTransformOpts);
    return bundleDist(bundler);
});