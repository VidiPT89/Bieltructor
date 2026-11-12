#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
mkdir -p build/ios
rm -rf build/ios/Web
cp -R dist build/ios/Web
xcodegen generate
