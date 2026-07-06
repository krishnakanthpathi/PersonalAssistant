#!/bin/bash
set -e

# Define directories
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$FRONTEND_DIR"

APP_NAME="SiriAssistant"
APP_BUNDLE="${APP_NAME}.app"
CONTENTS_DIR="${APP_BUNDLE}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"

echo "🧹 Cleaning previous build..."
rm -rf "$APP_BUNDLE"
rm -f "$APP_NAME"

echo "🔨 Compiling main.swift..."
SDK_PATH=$(xcrun --show-sdk-path --sdk macosx)
swiftc -parse-as-library -o "$APP_NAME" -sdk "$SDK_PATH" -target arm64-apple-macosx14.0 main.swift

echo "📦 Creating macOS App Bundle..."
mkdir -p "$MACOS_DIR"
mv "$APP_NAME" "$MACOS_DIR/"

echo "📝 Generating Info.plist..."
cat <<EOF > "${CONTENTS_DIR}/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${APP_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>com.krishnakanth.SiriAssistant</string>
    <key>CFBundleName</key>
    <string>Siri Assistant</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
    <key>NSMicrophoneUsageDescription</key>
    <string>SiriAssistant needs microphone access for voice commands and the Friday wake word.</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>SiriAssistant uses speech recognition for voice input and wake word detection.</string>
</dict>
</plist>
EOF

echo "📝 Generating entitlements..."
ENTITLEMENTS_FILE="${FRONTEND_DIR}/SiriAssistant.entitlements"
cat <<EOF > "$ENTITLEMENTS_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
</plist>
EOF

echo "🔏 Signing app bundle..."
codesign --force --sign - --entitlements "$ENTITLEMENTS_FILE" "${APP_BUNDLE}"

echo "🚀 Build completed successfully! App bundle generated at: ${FRONTEND_DIR}/${APP_BUNDLE}"
echo "Run it with: open ${APP_BUNDLE}"

