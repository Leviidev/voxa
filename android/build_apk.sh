#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$HOME/.voxa-build"
GRADLE_VERSION="8.5"
SDK_VERSION="11076708"
ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"

export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "╔══════════════════════════════════════════╗"
echo "║      Voxa Android APK Builder             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

mkdir -p "$BUILD_DIR" "$ANDROID_HOME"

# ──────────────────────────────────────────────
# 1. Java 17
# ──────────────────────────────────────────────
if ! java -version 2>/dev/null | grep -q "17\|21"; then
  echo "→ Installing JDK 17 via Nix..."
  nix-env -iA nixpkgs.jdk17 2>/dev/null || {
    echo "→ Trying adoptopenjdk..."
    nix-env -iA nixpkgs.adoptopenjdk-hotspot-bin-17 2>/dev/null || true
  }
  export JAVA_HOME="$(nix-env -q --out-path jdk17 2>/dev/null | head -1)" || true
fi
echo "✓ Java: $(java -version 2>&1 | head -1)"

# ──────────────────────────────────────────────
# 2. Gradle 8.5
# ──────────────────────────────────────────────
GRADLE_DIR="$BUILD_DIR/gradle-${GRADLE_VERSION}"
GRADLE_BIN="$GRADLE_DIR/bin/gradle"

if [ ! -f "$GRADLE_BIN" ]; then
  echo "→ Downloading Gradle ${GRADLE_VERSION}..."
  curl -fsSL -o "$BUILD_DIR/gradle.zip" \
    "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
  unzip -q "$BUILD_DIR/gradle.zip" -d "$BUILD_DIR"
  rm "$BUILD_DIR/gradle.zip"
  echo "✓ Gradle installed"
fi
export PATH="$GRADLE_DIR/bin:$PATH"

# ──────────────────────────────────────────────
# 3. Android SDK command-line tools
# ──────────────────────────────────────────────
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

if [ ! -f "$SDKMANAGER" ]; then
  echo "→ Downloading Android SDK command-line tools..."
  curl -fsSL -o "$BUILD_DIR/sdk-tools.zip" \
    "https://dl.google.com/android/repository/commandlinetools-linux-${SDK_VERSION}_latest.zip"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  unzip -q "$BUILD_DIR/sdk-tools.zip" -d "$ANDROID_HOME/cmdline-tools"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest" 2>/dev/null || true
  rm "$BUILD_DIR/sdk-tools.zip"
  echo "✓ Android SDK tools installed"
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# ──────────────────────────────────────────────
# 4. Accept licenses + install SDK components
# ──────────────────────────────────────────────
echo "→ Accepting SDK licenses..."
yes 2>/dev/null | "$SDKMANAGER" --licenses > /dev/null 2>&1 || true

echo "→ Installing SDK components (this takes a few minutes)..."
"$SDKMANAGER" \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "platform-tools" \
  2>&1 | grep -v "^\[=" || true

echo "✓ SDK components installed"

# ──────────────────────────────────────────────
# 5. Generate a release keystore if not present
# ──────────────────────────────────────────────
KEYSTORE_FILE="${KEYSTORE_FILE:-$SCRIPT_DIR/voxa-release.keystore}"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-voxa_release}"
KEY_ALIAS="${KEY_ALIAS:-voxa}"
KEY_PASSWORD="${KEY_PASSWORD:-voxa_release}"

export KEYSTORE_FILE KEYSTORE_PASSWORD KEY_ALIAS KEY_PASSWORD

if [ ! -f "$KEYSTORE_FILE" ]; then
  echo ""
  echo "→ Generating release keystore (no existing keystore found)..."
  keytool -genkeypair \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Voxa, OU=Mobile, O=Voxa, L=Unknown, ST=Unknown, C=US" \
    -noprompt 2>&1
  echo "✓ Keystore generated at: $KEYSTORE_FILE"
  echo "  ⚠ For production releases, replace this with a real keystore and store it securely."
  echo "  Set KEYSTORE_FILE, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD env vars in CI."
fi

# ──────────────────────────────────────────────
# 6. Build APK
# ──────────────────────────────────────────────
echo ""
echo "→ Building Voxa APK (signed)..."
cd "$SCRIPT_DIR"

gradle \
  -p . \
  --no-daemon \
  assembleRelease \
  2>&1

APK_PATH="$SCRIPT_DIR/app/build/outputs/apk/release/app-release.apk"
APK_UNSIGNED="$SCRIPT_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"

if [ -f "$APK_PATH" ]; then
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✅  APK built and signed successfully!   ║"
  echo "╚══════════════════════════════════════════╝"
  echo "→ Path: $APK_PATH"
  SIZE=$(du -sh "$APK_PATH" | cut -f1)
  echo "→ Size: $SIZE"
elif [ -f "$APK_UNSIGNED" ]; then
  echo "→ Found unsigned APK, signing manually..."
  BUILD_TOOLS="$ANDROID_HOME/build-tools/34.0.0"
  "$BUILD_TOOLS/apksigner" sign \
    --ks "$KEYSTORE_FILE" \
    --ks-key-alias "$KEY_ALIAS" \
    --ks-pass "pass:$KEYSTORE_PASSWORD" \
    --key-pass "pass:$KEY_PASSWORD" \
    --out "$SCRIPT_DIR/app/build/outputs/apk/release/app-release.apk" \
    "$APK_UNSIGNED"
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✅  APK signed successfully!             ║"
  echo "╚══════════════════════════════════════════╝"
  echo "→ Path: $SCRIPT_DIR/app/build/outputs/apk/release/app-release.apk"
else
  echo "❌ APK not found at expected path."
  exit 1
fi
