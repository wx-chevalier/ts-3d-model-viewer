pushd %~dp0\..

call tools\build_wasm_win_release.bat || goto :error
echo Build Succeeded.

call set TEST_CONFIG=Release
call npm run test || goto :error

mkdir dist
copy build_wasm\Release\assimpjs.js dist\assimpjs.js || goto :error
copy build_wasm\Release\assimpjs.wasm dist\assimpjs.wasm || goto :error
copy assimp\LICENSE dist\license.assimp.txt || goto :error
copy LICENSE.md dist\license.assimpjs.txt || goto :error
xcopy dist\*.* docs\dist\*.* /K /D /H /Y

popd
echo Distribution Succeeded.

exit /b 0

:error
echo Distribution Failed with Error %errorlevel%.
popd
popd
exit /b 1
