#!/bin/bash
# Archives the Mac app and signs it with your Developer ID.
# Notarization sends the app to Apple, so it only runs when you ask for it:
#   NOTARY_PROFILE=bieltructor scripts/release-macos.sh --notarize
# (create the profile once with: xcrun notarytool store-credentials bieltructor)
# Needs Xcode signed in to your Apple Developer account and TEAM_ID set.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${TEAM_ID:?Set TEAM_ID to your Apple Developer team ID (Xcode > Settings > Accounts)}"
npm run prepare:ios
mkdir -p build/release
xcodebuild -project Bieltructor.xcodeproj -scheme Bieltructor-macOS -configuration Release \
  -archivePath build/release/Bieltructor-macOS.xcarchive \
  DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates archive
cat > build/release/ExportOptions-macOS.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>developer-id</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
</dict></plist>
PLIST
xcodebuild -exportArchive -archivePath build/release/Bieltructor-macOS.xcarchive \
  -exportOptionsPlist build/release/ExportOptions-macOS.plist -exportPath build/release/macos \
  -allowProvisioningUpdates
APP="build/release/macos/Bieltructor.app"
codesign --verify --deep --strict "$APP"
if [ "${1:-}" = "--notarize" ]; then
  : "${NOTARY_PROFILE:?Set NOTARY_PROFILE to a notarytool keychain profile}"
  ditto -c -k --keepParent "$APP" build/release/Bieltructor-macOS.zip
  xcrun notarytool submit build/release/Bieltructor-macOS.zip --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$APP"
  printf '\nNotarized: %s\n' "$PWD/$APP"
else
  printf '\nSigned with Developer ID (not notarized yet): %s\nRun again with --notarize to send it to Apple.\n' "$PWD/$APP"
fi
