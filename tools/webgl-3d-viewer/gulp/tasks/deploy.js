import gulpMain from 'gulp';
import gulpHelp from 'gulp-help';
import ghPages from 'gulp-gh-pages';

const gulp = gulpHelp(gulpMain);

gulp.task('deploy-to-gh-pages', false,  function() {

  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});
