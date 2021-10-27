#!/bin/bash
set -ex

(cd ./packages/webgl && yarn lint)
