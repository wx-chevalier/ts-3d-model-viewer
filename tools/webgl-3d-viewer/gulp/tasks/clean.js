import gulpMain from 'gulp';
import gulpHelp from 'gulp-help';
import del from 'del';

const gulp = gulpHelp(gulpMain);


gulp.task('clean:build', false, (cb)=>{

  let files = [
    'build/**/*.*',
    'build/*.*',
    'build/.*',
    'build/*'
  ];

  return del(files, cb);
});


gulp.task('clean:dist', false, (cb)=>{

  let files = [
    'dist/**/*.*',
    'dist/*.*',
    'dist/.*',
    'dist/*'
  ];

  return del(files, cb);
});
