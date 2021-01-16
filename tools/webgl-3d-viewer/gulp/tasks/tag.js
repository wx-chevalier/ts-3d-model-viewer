import gulpMain from 'gulp';
import gulpHelp from 'gulp-help';
import bump from 'gulp-bump';
import tagVersion from 'gulp-tag-version';
import git from 'gulp-git';
import filter from 'gulp-filter';
import prompt from 'gulp-prompt';

const gulp = gulpHelp(gulpMain);
const version = {type: 'patch'};

gulp.task('tag:create-version', false, function() {

  return gulp.src('*')
    .pipe(prompt.prompt({
      type: 'checkbox',
      name: 'bump',
      message: 'What type of release is it? (Patch: hotfix, Minor: Release, Major: Major release)',
      choices: ['patch', 'minor', 'major']
    }, function(res) {

      if (res.bump && res.bump.length > 0) {
        version.type = res.bump[0];
      }

    }));
});

gulp.task('tag:bump-version', false, function() {

  return gulp.src('./package.json')
    .pipe(bump(version))
    .pipe(gulp.dest('./'))
    .pipe(git.commit('bump package version'))
    .pipe(filter('package.json'))
    .pipe(tagVersion());
});
