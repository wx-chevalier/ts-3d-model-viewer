import gulpMain from 'gulp';
import gulpHelp from 'gulp-help';
import runSequence from 'run-sequence';
import uglify from 'gulp-uglify';

const gulp = gulpHelp(gulpMain);

gulp.task('release:viewer', false, () => {

  let files = [
    'build/viewer/**/*.*',
    'build/viewer/*.*'
  ];

  return gulp.src(files)
    .pipe(gulp.dest('dist/viewer'));
});

gulp.task('release:compress', false, () => {

  return gulp.src('build/example/main.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist/example'));
});

gulp.task('release:example', false, () => {

  let files = [
    'build/example/**/*.*',
    'build/example/*.*',
    '!build/example/main.js'
  ];

  return gulp.src(files)
    .pipe(gulp.dest('dist/example'));
});

gulp.task('release:build', false, (cb)=>{
  return runSequence(['release:compress', 'release:viewer', 'release:example'], cb);
});
