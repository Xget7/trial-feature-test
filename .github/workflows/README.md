# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Ato Mobile App.

## Workflows

### `build-android.yml` - Android Build Workflow

Builds the Android APK for the Ato app using Gradle.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Build Process:**
1. Checks out the code
2. Sets up Node.js 20 and npm dependencies
3. Sets up Java JDK 17 (Zulu distribution)
4. Caches Gradle dependencies for faster builds
5. Builds release and debug APK files
6. Uploads APK artifacts (30 days retention for release, 7 days for debug)

**Artifacts:**
- `app-release`: Release APK (30 days)
- `app-debug`: Debug APK (7 days)

**Requirements:**
- No secrets required for basic APK builds
- For signing release builds, you'll need to add:
  - `ANDROID_KEYSTORE_FILE` (base64 encoded)
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`

## Setup Instructions

### Basic Setup (Unsigned APKs)

The workflow works out of the box for building unsigned APKs. No additional configuration needed.

### Advanced Setup (Signed Release APKs)

To build signed release APKs ready for distribution:

1. **Generate or use existing keystore:**
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Encode keystore to base64:**
   ```bash
   base64 -i my-release-key.keystore | pbcopy
   ```

3. **Add GitHub Secrets:**
   - Go to repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `ANDROID_KEYSTORE_FILE`: The base64 encoded keystore
     - `ANDROID_KEYSTORE_PASSWORD`: Your keystore password
     - `ANDROID_KEY_ALIAS`: Your key alias
     - `ANDROID_KEY_PASSWORD`: Your key password

4. **Update `build-android.yml`** to decode and use the keystore before building.

## EAS Build (Alternative)

If you prefer to use Expo's EAS Build service instead of direct Gradle builds, you'll need:

1. **Create an Expo account** at https://expo.dev
2. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

3. **Configure EAS Build:**
   ```bash
   eas build:configure
   ```

4. **Add EXPO_TOKEN secret:**
   - Generate token: `eas whoami` then get token from https://expo.dev/accounts/[your-username]/settings/access-tokens
   - Add as GitHub secret: `EXPO_TOKEN`

5. **Use EAS-specific workflow** (create `build-android-eas.yml` if needed)

## Troubleshooting

### Build fails with Gradle errors
- Check Java version (must be 17 for Expo 53)
- Clear Gradle cache: The workflow includes cache management
- Check Android SDK versions in `app.json` match your local setup

### APK not generated
- Check the workflow logs for detailed error messages
- Ensure `android/` directory exists (run `npx expo prebuild` locally first)

### Permission denied on gradlew
- The workflow includes `chmod +x android/gradlew` step
- If it still fails, check if `android/gradlew` exists in the repository

## Resources

- [Expo Build Documentation](https://docs.expo.dev/build/introduction/)
- [GitHub Actions for React Native](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
