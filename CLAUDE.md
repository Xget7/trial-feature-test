# Ato Mobile App - React Native + Expo

**Ato** is a companion mobile app for elderly assistance device ecosystem. Built with Expo Router and managed workflow. The app is used by "ato-managers" (family members/caregivers) to manage profiles of "ato-users" (seniors), set reminders, manage contacts, and monitor activity.

**Key Terminology:**

- **ato-user**: Senior person using the physical Ato device
- **ato-manager**: Family member/caregiver using this mobile app

## Tech Stack

- **Framework**: Expo ~53.0.0 (managed workflow)
- **Language**: TypeScript 5.x
- **Navigation**: Expo Router (file-system routing)
- **Styling**: React Native + Expo LinearGradient
- **Backend**: Supabase (auth + database)
- **AI**: OpenAI + Vercel AI SDK
- **Communication**: LiveKit (audio/video calls)
- **State**: Zustand + React Query
- **Testing**: Jest + React Native Testing Library

## Context7 Integration

**When searching for code examples, API documentation, or implementation guides, ALWAYS use Context7 first:**

### Primary Command Flow:

1. **For specific examples/docs**: Use Context7 tools directly
2. **For unknown libraries**: First resolve library ID, then get docs
3. **Focus searches**: Use `topic` parameter for specific areas

### Available Context7 Libraries:

- **Expo Documentation**: `/expo/expo`
- **Expo Examples**: `/expo/examples`
- **Supabase SSR**: `/supabase/supabase`
- **TypeScript**: `/microsoft/typescript`
- **React Native**: `/facebook/react-native-website`
- **OpenAI Node**: `/openai/openai-node`
- **OpenAI Cookbook**: `/openai/openai-cookbook`
- **Vercel AI SDK**: `/vercel/ai`
- **LiveKit React Native SDK**: `/livekit/client-sdk-react-native`
- **LiveKit React Native WebRTC**: `/livekit/react-native-webrtc`
- **React Native Testing Library**: `/callstack/react-native-testing-library`

### Usage Examples:

```bash
# Get Expo Router examples
resolve-library-id → expo
get-library-docs → /expo/expo, topic: "routing navigation"

# Find Supabase auth patterns
get-library-docs → /context7/supabase_com-docs, topic: "authentication react native"

# OpenAI streaming examples
get-library-docs → /openai/openai-cookbook, topic: "streaming chat"
```

## Project Structure

```
app/                    # Expo Router routes (file-system routing)
├── _layout.tsx         # Root layout (providers, themes)
├── (tabs)/            # Tab group with bottom navigation
│   ├── _layout.tsx    # Tab navigator layout
│   ├── index.tsx      # Home screen (/home)
│   └── explore.tsx    # Explore screen (/explore)
└── +not-found.tsx     # 404 fallback

components/            # Reusable React components
├── ui/               # Base UI components (buttons, inputs)
├── Themed*.tsx       # Theme-aware components
└── *.tsx            # Feature-specific components

constants/            # App constants and configuration
hooks/               # Custom React hooks
assets/              # Static assets (images, fonts)
```

## Core Commands

```bash
# Development
npx expo start              # Start dev server
npx expo start --clear      # Clear cache and start
npx expo run:ios           # iOS simulator
npx expo run:android       # Android emulator

# Production
eas build --platform ios   # iOS build
eas build --platform android # Android build
eas submit                 # App store submission
eas update                 # OTA updates

# Maintenance
npx expo doctor            # Health check
npx expo install --fix     # Update to compatible versions
npx expo prebuild --clean  # Regenerate native dirs
```

## Code Style & Conventions

### React Native/Expo Patterns

- Use **functional components** with hooks only
- Prefer **Expo Router** over React Navigation for routing
- Use **expo-\*** modules instead of react-native-\* when available
- Leverage **SafeAreaProvider** and **SafeAreaView** for safe areas
- Use **expo-constants** for environment variables access

### TypeScript

- Use **interfaces** over types for component props
- Prefer **strict TypeScript** configuration
- Use **expo-env.d.ts** for environment variable types
- Avoid **enums**; use const objects with `as const`

### Import/Export

- Use **ES modules** (import/export)
- Use **named exports** for components
- Group imports: React, Expo, third-party, relative
- Use **expo-font** for custom fonts, **@expo/vector-icons** for icons

### File Naming

- **lowercase-with-dashes** for directories
- **PascalCase** for components (`UserProfile.tsx`)
- **camelCase** for utilities (`dateHelpers.ts`)
- **UPPERCASE** for constants (`COLORS.ts`)

### Styling

- Use **StyleSheet.create()** for performance
- Prefer **Flexbox** for layouts
- Use **expo-linear-gradient** for gradients
- Support **dark mode** with `useColorScheme()`
- Use **responsive design** with `useWindowDimensions()`

## Environment Setup

```bash
# Required for development
node >= 18.x
npm >= 9.x

# Environment variables (.env)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
```

## Core Files & Utilities

### Essential Components

- `app/_layout.tsx` - Root layout with providers
- `components/ThemedText.tsx` - Theme-aware text component
- `components/ThemedView.tsx` - Theme-aware view component
- `hooks/useColorScheme.ts` - Dark/light mode detection
- `constants/Colors.ts` - App color system

### Key Integrations

- **Supabase client**: `lib/supabase.ts`
- **AI chat**: Uses `ai` package with streaming
- **Audio/Video**: LiveKit integration for calls
- **Notifications**: `expo-notifications` for reminders

## Repository Etiquette

### Branch Naming

- `feature/ATO-123-user-profile-screen`
- `fix/ATO-456-notification-crash`
- `chore/update-expo-sdk`

### Commit Messages

- `feat: add voice recording for AI chat`
- `fix: resolve SafeArea issues on Android`
- `chore: update Expo SDK to 53.0.0`

### Pull Requests

- Include **device testing** (iOS + Android)
- Test **both light and dark modes**
- Verify **safe area handling** on different devices
- Check **performance** with React DevTools

## Do Not Touch

- **Never** modify `expo-env.d.ts` manually
- **Never** add custom native code - this is a **100% Expo managed workflow**
- **Never** create or modify `ios/` or `android/` directories (they don't exist in this project)
- **Never** directly modify `.expo/` directory contents
- **Never** commit `.env` files with secrets
- **Never** use deprecated React Navigation patterns
- **Never** search web for documentation when Context7 libraries are available
- **Avoid** platform-specific code unless absolutely necessary
- **Don't** use React class components
- **Don't** bypass Expo's secure storage for sensitive data

**Critical:** This project uses **Expo's managed workflow exclusively**. Zero native Swift, Kotlin, Objective-C, or Java code exists. If you need native functionality:
1. First check if an Expo module exists (`npx expo install expo-*`)
2. If not, check for a community config plugin
3. As a last resort, evaluate if ejecting is justified (requires team discussion)

## AI Integration Notes

- Use **streaming responses** with Vercel AI SDK
- Implement **voice input/output** with `expo-speech` and `expo-av`
- Store **conversation history** securely with Supabase
- Handle **offline scenarios** gracefully

## Testing Strategy

- **Unit tests**: Jest for utilities and hooks
- **Component tests**: React Native Testing Library
- **E2E tests**: Detox for critical user flows
- **Device testing**: Physical devices for audio/video features
- **Accessibility**: Test with screen readers enabled
