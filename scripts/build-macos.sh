#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
APP="$PWD/build/Bieltructor.app"
if [ -d "$APP" ]; then
  mkdir -p build/archive
  mv "$APP" "build/archive/Bieltructor-$(date +%Y%m%d-%H%M%S)-$$.app"
fi
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/Web"
cp -R dist/. "$APP/Contents/Resources/Web/"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>Bieltructor</string><key>CFBundleDisplayName</key><string>Bieltructor</string><key>CFBundleIdentifier</key><string>dev.ividi.bieltructor</string><key>CFBundleExecutable</key><string>Bieltructor</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>1.0.0</string><key>CFBundleVersion</key><string>1</string><key>LSMinimumSystemVersion</key><string>13.0</string><key>NSHighResolutionCapable</key><true/><key>CFBundleIconFile</key><string>AppIcon</string><key>NSHumanReadableCopyright</key><string>Developed by David Arsénio Martins</string></dict></plist>
PLIST
xcrun swiftc macos/Bieltructor.swift shared/LocalAssets.swift -o "$APP/Contents/MacOS/Bieltructor" -target "$(uname -m)-apple-macosx13.0" -module-cache-path /tmp/bieltructor-swift-cache -framework Cocoa -framework WebKit -O
if [ -f macos/AppIcon.icns ]; then cp macos/AppIcon.icns "$APP/Contents/Resources/"; fi
codesign --force --sign - "$APP"
printf '\nBuilt: %s\n' "$APP"
