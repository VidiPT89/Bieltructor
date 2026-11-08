#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
mkdir -p build/ios
if [ -d build/ios/Web ]; then
  mkdir -p build/archive
  mv build/ios/Web "build/archive/iOS-Web-$(date +%Y%m%d-%H%M%S)-$$"
fi
cp -R dist build/ios/Web
xcodegen generate
