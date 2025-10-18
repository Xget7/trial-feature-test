const {
  withAppBuildGradle,
  withAndroidManifest,
  withGradleProperties,
} = require('@expo/config-plugins')

// Fix AndroidManifest
function withManifestFix(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults

    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'
    }

    // Ensure permissions are present
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = []
    }

    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.INTERNET',
      'android.permission.MODIFY_AUDIO_SETTINGS',
    ]

    permissions.forEach(permission => {
      const hasPermission = androidManifest.manifest['uses-permission'].some(
        p => p.$['android:name'] === permission
      )
      if (!hasPermission) {
        androidManifest.manifest['uses-permission'].push({
          $: { 'android:name': permission },
        })
      }
    })

    // Add queries for speech recognition
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = []
    }

    const hasIntentQuery = androidManifest.manifest.queries.some(
      q =>
        q.intent &&
        q.intent.some(
          i =>
            i.action &&
            i.action.some(a => a.$['android:name'] === 'android.speech.RecognitionService')
        )
    )

    if (!hasIntentQuery) {
      androidManifest.manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.speech.RecognitionService' } }],
          },
        ],
      })
    }

    if (androidManifest.manifest.application) {
      if (!androidManifest.manifest.application[0].$) {
        androidManifest.manifest.application[0].$ = {}
      }
      androidManifest.manifest.application[0].$['tools:replace'] = 'android:appComponentFactory'
      androidManifest.manifest.application[0].$['android:appComponentFactory'] =
        'androidx.core.app.CoreComponentFactory'
    }

    return config
  })
}

// Fix build.gradle to exclude old support libraries and force AndroidX
function withGradleExclusions(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.contents.includes('configurations.all')) {
      return config
    }

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*{/,
      `configurations.all {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'support-media-compat'
    exclude group: 'com.android.support', module: 'animated-vector-drawable'
    exclude group: 'com.android.support', module: 'support-vector-drawable'
    exclude group: 'com.android.support', module: 'versionedparcelable'
    
    resolutionStrategy {
        force 'androidx.core:core:1.13.1'
        force 'androidx.core:core-ktx:1.13.1'
        force 'androidx.appcompat:appcompat:1.7.0'
        force 'androidx.versionedparcelable:versionedparcelable:1.2.0'
    }
}

dependencies {`
    )

    return config
  })
}

// Add gradle properties
function withGradleProps(config) {
  return withGradleProperties(config, config => {
    config.modResults = config.modResults.filter(
      item =>
        !(
          item.type === 'property' &&
          (item.key === 'org.gradle.jvmargs' ||
            item.key === 'android.useAndroidX' ||
            item.key === 'android.enableJetifier')
        )
    )

    config.modResults.push(
      {
        type: 'property',
        key: 'org.gradle.jvmargs',
        value: '-Xmx4096m -XX:MaxMetaspaceSize=512m',
      },
      {
        type: 'property',
        key: 'android.useAndroidX',
        value: 'true',
      },
      {
        type: 'property',
        key: 'android.enableJetifier',
        value: 'true',
      }
    )

    return config
  })
}

module.exports = function withAndroidFixes(config) {
  config = withManifestFix(config)
  config = withGradleExclusions(config)
  config = withGradleProps(config)
  return config
}
