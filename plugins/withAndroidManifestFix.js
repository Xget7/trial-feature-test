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

// Fix build.gradle to exclude old support libraries
function withGradleExclusions(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.contents.includes('configurations.all')) {
      return config
    }

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*{/,
      `configurations.all {
    exclude group: 'com.android.support'
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
