#!/bin/bash
# Archives the iPad/iPhone app and exports an .ipa ready for TestFlight.
# It never uploads anything: upload the .ipa yourself with Transporter, or
#   xcrun altool --upload-app -f build/release/ios/Bieltructor.ipa -t ios --apiKey KEY --apiIssuer ISSUER
# Needs Xcode signed in to your Apple Developer account and TEAM_ID set.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${TEAM_ID:?Set TEAM_ID to your Apple Developer team ID (Xcode > Settings > Accounts)}"
npm run prepare:ios
mkdir -p build/release
xcodebuild -project Bieltructor.xcodeproj -scheme Bieltructor-iOS -configuration Release \
  -destination "generic/platform=iOS" -archivePath build/release/Bieltructor-iOS.xcarchive \
  DEVELOPMENT_TEAM="$TEAM_ID" -allowProvisioningUpdates archive
cat > build/release/ExportOptions-iOS.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
</dict></plist>
PLIST
xcodebuild -exportArchive -archivePath build/release/Bieltructor-iOS.xcarchive \
  -exportOptionsPlist build/release/ExportOptions-iOS.plist -exportPath build/release/ios \
  -allowProvisioningUpdates
printf '\nReady for TestFlight (not uploaded): %s\n' "$PWD/build/release/ios/Bieltructor.ipa"
