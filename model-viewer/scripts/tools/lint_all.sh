#!/bin/bash
set -ex

(cd ./packages/rtw-core && yarn lint)
(cd ./packages/rtw-bootstrap && yarn lint)
(cd ./packages/rtw-components && yarn lint)
(cd ./packages/rtw-host-app && yarn lint)

