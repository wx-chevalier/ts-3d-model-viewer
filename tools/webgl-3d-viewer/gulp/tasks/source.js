import gulpMain    from 'gulp';
import gulpHelp    from 'gulp-help';
import runSequence from 'run-sequence';
import gutil       from 'gulp-util';
import babel       from 'gulp-babel';
import webpack     from 'webpack';

const gulp = gulpHelp(gulpMain);

gulp.task('source:webpack', false, function(callback) {

  const config = require('./../../webpack.config.js');

  webpack(config, function(err, stats) {

    if (err) {
      throw new gutil.PluginError('webpack', err);
    }

    gutil.log('[webpack]', stats.toString({}));

    callback();
  });
});

gulp.task('source:es6', false, function() {

  let files = [
    'src/viewer/**/*.*',
    'src/viewer/*.*'
  ];

  return gulp.src(files)
    .pipe(babel())
    .pipe(gulp.dest('build/viewer'));
});


gulp.task('source:static', false, ()=>{

  let files = [
    '!src/viewer/*.js',
    '!src/viewer/**/*.js',
    '!src/example/main.js',
    'src/**/*(*.js|*.html|*.stl|*.json|*.xml|*.png|*.jpg|*.svg|*.jpeg|*.gif|*.css)',
    'src/*(*.js|*.html|*.stl|*.json|*.xml|*.png|*.jpg|*.svg|*.jpeg|*.gif|*.css)'
  ];

  return gulp.src(files)
    .pipe(gulp.dest('build/'));
});

gulp.task('source', false, (cb)=>{
  return runSequence(['source:es6', 'source:webpack', 'source:static'], cb);
});
