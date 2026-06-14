#!/bin/bash
# Build an unsigned IPA for real device sideloading (AltStore, Sideloadly, etc.)
# Run this on a Mac with Xcode installed.
# Usage: ./build-unsigned.sh [version]

set -e

VERSION=${1:-"0.1.0"}
PROJECT="Voxa.xcodeproj"
SCHEME="Voxa"
ARCHIVE_PATH="build/Voxa.xcarchive"
PAYLOAD_DIR="build/Payload"
IPA_NAME="Voxa-unsigned-${VERSION}.ipa"

echo "==> Cleaning previous build..."
rm -rf build/
mkdir -p build/

echo "==> Archiving for real device (arm64, unsigned)..."
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_ALLOWED=NO \
  PRODUCT_BUNDLE_IDENTIFIER="lol.voxa.app"

echo "==> Packaging IPA..."
mkdir -p "$PAYLOAD_DIR"
cp -r "$ARCHIVE_PATH/Products/Applications/Voxa.app" "$PAYLOAD_DIR/"

cd build
zip -r "$IPA_NAME" Payload
cd ..

echo ""
echo "==> Done! Unsigned IPA created at: ios/build/$IPA_NAME"
echo "    Sideload with AltStore, Sideloadly, or similar tool."
