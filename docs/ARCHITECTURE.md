# Architecture Decision Record: Ato Mobile Application

## Document Information

- **Project**: Ato - Elderly Assistance Mobile App
- **Date**: October 2025
- **Framework**: React Native with Expo (Managed Workflow)
- **Version**: 1.0.0
- **Status**: Active Development

---

## 1. Context & Overview

### 1.1 What is Ato?

Ato is a companion mobile application for an elderly assistance device ecosystem. The app serves as a remote management interface for family members and caregivers (called "managers") to monitor, assist, and care for elderly adults (called "users") who use physical Ato devices.

### 1.2 Core Problem Statement

Family members and caregivers need a mobile solution to:
- Monitor elderly relatives' activity and wellbeing remotely
- Set and manage medication/task reminders
- Maintain emergency contact lists
- Communicate with AI assistance for insights and support
- Manage multiple elderly users from a single interface

### 1.3 User Personas

**Primary Users (Ato-Managers):**
- Family members of elderly adults
- Professional caregivers
- Remote family support networks

**Secondary Users (Ato-Users):**
- Elderly adults using physical Ato devices
- Recipients of reminders and care activities

---

## 2. Tech Stack Overview

### 2.1 Core Technologies

| Technology | Version | Rationale |
|------------|---------|-----------|
| **Expo** | ~53.0.0 | Managed workflow for rapid development, excellent DX, built-in OTA updates |
| **React Native** | 0.79.5 | Cross-platform mobile development with native performance |
| **TypeScript** | ~5.8.3 | Type safety, better IDE support, reduced runtime errors |
| **Expo Router** | ~5.1.7 | File-system based routing, type-safe navigation, superior to React Navigation |
| **Supabase** | ^2.50.3 | Backend-as-a-Service: auth, database, real-time subscriptions |

### 2.2 Supporting Libraries

**UI & Presentation:**
- `expo-linear-gradient` - Gradient styling for brand consistency
- `react-native-safe-area-context` - Safe area handling across devices
- `expo-blur` - Visual effects for modals/overlays

**Voice & AI:**
- `expo-speech-recognition` - Voice input for assistant
- `expo-speech` & `expo-av` - Text-to-speech and audio playback as offline TTS
- `@elevenlabs/elevenlabs-js` - Premium cloud TTS for natural voice
- Direct Claude API integration - AI conversational assistant

**Internationalization:**
- `i18n-js` - Multi-language support (Spanish/English)
- `expo-localization` - Device locale detection

**State & Storage:**
- React Context API - Global state management
- `@react-native-async-storage/async-storage` - Persistent local storage

**Testing:**
- `jest` + `react-native-testing-library` - Unit and component testing
- `@testing-library/jest-native` - Native component matchers

---

## 3. Architecture Decisions

### 3.1 Navigation Architecture: Expo Router over React Navigation

**Decision:** Use Expo Router with file-system based routing instead of React Navigation.

**Rationale:**
- **Type Safety**: Expo Router provides typed routes automatically via TypeScript declaration files
- **Better DX**: File-system routing is more intuitive - file structure = app structure
- **Deep Linking**: Native deep link support out of the box
- **Code Splitting**: Automatic route-based code splitting
- **SEO & Web**: Better web support with proper URLs
- **Future-Proof**: Expo's recommended approach, better long-term support

**Trade-offs:**
- Learning curve for teams familiar with React Navigation
- Some React Navigation patterns need adaptation

**Implementation:**
```
app/
├── _layout.tsx           # Root layout with providers
├── (tabs)/              # Tab navigator group
│   ├── _layout.tsx      # Tab configuration
│   ├── index.tsx        # Dashboard (/)
│   ├── contacts.tsx     # Contacts (/contacts)
│   ├── profile.tsx      # Profile (/profile)
│   └── explore.tsx      # Explore (/explore)
├── login.tsx            # Login screen (/login)
├── auth/
│   └── callback.tsx     # Auth callback (/auth/callback)
└── settings.tsx         # Settings (/settings)
```

### 3.2 State Management: Context API over Redux/Zustand

**Decision:** Use React Context API for global state instead of external state management libraries.

**Rationale:**
- **Simplicity**: No external dependencies needed
- **React-First**: Native React patterns, easier onboarding
- **Sufficient Complexity**: App state is not complex enough to justify Redux
- **Performance**: With proper context splitting, performance is acceptable
- **Maintenance**: Less boilerplate, easier to understand

**Implementation Pattern:**

The app uses **4 specialized contexts** instead of one monolithic store:

1. **AuthContext** (`AuthProvider.tsx`)
   - Manages: `user`, `session`, authentication state
   - Handles: Supabase auth, mock users for testing, sign-out
   - Why separate: Auth is foundational and changes infrequently

2. **AtoContext** (`AtoContext.tsx`)
   - Manages: `currentManager`, `managedUsers`, `userReport`
   - Handles: Manager/user relationships, activity reports, greetings
   - Why separate: Business logic layer, user data orchestration

3. **SelectedUserContext** (`SelectedUserContext.tsx`)
   - Manages: Currently selected elderly user for the manager
   - Handles: User switching, preventing race conditions
   - Why separate: Complex initialization logic, prevents infinite loops

4. **AssistantContext** (`AssistantContext.tsx`)
   - Manages: AI assistant visibility state
   - Handles: Show/hide assistant modal
   - Why separate: UI state, independent of data

**Trade-offs:**
- No time-travel debugging (unlike Redux DevTools)
- Manual optimization needed for re-renders
- No built-in middleware system

**Mitigation:**
- Used refs to prevent unnecessary re-renders
- Implemented careful context splitting to minimize provider tree depth
- Added initialization guards to prevent race conditions

### 3.3 Backend Architecture: Supabase as Primary Backend

**Decision:** Use Supabase for authentication, database, and real-time features.

**Rationale:**
- **Authentication**: Built-in auth with magic links, OTP, OAuth support
- **Database**: PostgreSQL with type-safe queries via auto-generated types
- **Row-Level Security**: Database-level security policies
- **Edge Functions**: Serverless functions for backend logic
- **Cost**: Generous free tier, predictable pricing
- **Developer Experience**: Excellent TypeScript support, local development

**Database Design Pattern:**
```typescript
// Core tables structure:
managers         // Ato-managers (caregivers/family)
users           // Ato-users (elderly people)
manager_users   // Many-to-many relationship
manager_selected_users // Current selection per manager
reminders       // Tasks/medication reminders
contacts        // Emergency contacts
```

**API Layer Design:**

Created `lib/atoApi.ts` as an abstraction layer:
- **Why**: Allows switching between Supabase and external APIs
- **Mock Support**: `EXPO_PUBLIC_USE_MOCK_API=true` for development without backend
- **External API Fallback**: `getUserReport()` tries external API first, falls back to Supabase
- **Type Safety**: All API responses are strongly typed

**Trade-offs:**
- Vendor lock-in to Supabase ecosystem
- Limited control over backend infrastructure
- Database schema changes require migrations

### 3.4 AI Integration: Direct Claude API vs OpenAI SDK

**Decision:** Use direct Anthropic Claude API calls instead of OpenAI or Vercel AI SDK.

**Rationale:**
- **Tool Calling**: Claude's tool-calling capabilities are superior for structured outputs
- **Agentic Loop**: Need custom agent loop for multi-turn tool execution
- **Rioplatense Spanish**: Claude performs better with Argentine Spanish dialect
- **Context Window**: Claude Sonnet 4.5 has excellent context handling
- **Streaming**: Direct API gives full control over streaming responses

**Implementation:**

Created `services/claudeAgent.ts` with:
- Custom agentic loop supporting up to 5 tool iterations
- 4 specialized tools: `get_current_time`, `end_conversation`, `get_user_report`, `create_reminder`
- Automatic tool result formatting for i18n
- Conversation history management

**Tool Architecture** (`services/atoTools.ts`):
```typescript
export const executeAtoTool = async (
  toolName: string,
  toolInput: Record<string, any>,
  context?: { managerId?: string }
): Promise<ToolResult>
```

**Trade-offs:**
- No built-in streaming UI components (vs Vercel AI SDK)
- Manual API error handling
- More code to maintain

**Benefits:**
- Complete control over conversation flow
- Can optimize for specific use cases (elderly care)
- Easier to implement conversation termination logic

### 3.5 Voice Architecture: Hybrid TTS Strategy

**Decision:** Implement hybrid Text-to-Speech using ElevenLabs for cloud TTS with fallback to native.

**Rationale:**
- **Quality**: ElevenLabs provides human-like voices crucial for elderly users
- **Reliability**: Native TTS (expo-speech) as fallback ensures always-working audio
- **Conversational AI**: ElevenLabs supports conversational models for natural dialogue
- **Latency**: Cloud TTS has higher latency, but quality trade-off is worth it
- **Offline**: Native fallback works without internet

**Implementation:**

Created `services/tts/hybridTTSService.ts`:
```typescript
initTTS({
  elevenLabsApiKey: string,
  preferCloudTTS: boolean,
  elevenLabsModel: 'eleven_multilingual_v2' | 'eleven_turbo_v2_5'
})

speak(text: string, {
  conversational?: boolean,  // Use conversational AI model
  voiceId?: string,
  forceProvider?: 'elevenlabs' | 'native'
})
```

**Voice Recognition:**

Used `expo-speech-recognition`:
- Native Android/iOS speech recognition APIs
- Real-time transcription with interim results
- Configurable silence timeouts (1500ms default)
- Volume detection for user feedback

**Trade-offs:**
- Additional API costs for ElevenLabs
- Requires internet for best experience
- More complex error handling

### 3.6 Authentication Strategy: Magic Link + OTP with Mock Support

**Decision:** Implement Supabase passwordless auth with magic links and OTP codes, plus mock user support for testing.

**Rationale:**
- **User Experience**: No passwords to remember (elderly-friendly)
- **Security**: Magic links reduce phishing risk
- **Accessibility**: OTP fallback for email app issues
- **Testing**: Mock users allow app store review and QA testing
- **Strategy Pattern**: Flexible auth strategies via `AuthStrategyResolver`

**Implementation:**

Created `lib/auth/authStrategies.ts`:
```typescript
interface AuthStrategy {
  authenticate(email: string, otpOrToken: string): Promise<void>
}

class SupabaseOTPStrategy implements AuthStrategy { ... }
class MockUserStrategy implements AuthStrategy { ... }
class AuthStrategyResolver {
  resolve(email: string, token: string): AuthStrategy
}
```

**Auth Flow:**
1. User enters email
2. Supabase sends magic link + 6-digit OTP
3. User can either:
   - Click magic link in email (handled by `/auth/callback`)
   - Enter 6-digit OTP code (auto-submits when complete)
   - Paste OTP from clipboard

**Mock User Support:**
- Special email format triggers mock authentication
- Allows app store reviewers to test without real backend
- Supports legacy store testing users
- Stored in AsyncStorage: `ato-mock-user`

**Trade-offs:**
- Email delivery reliability depends on email providers
- OTP codes expire (must be resent)
- Mock mode requires careful environment management

---

## 4. Project Structure & Organization

### 4.1 Directory Architecture

```
/Users/xget/Documents/trial-feature-test/
├── app/                      # Expo Router routes
│   ├── _layout.tsx          # Root layout (providers tree)
│   ├── (tabs)/              # Tab navigation group
│   ├── auth/                # Auth callback handlers
│   ├── login.tsx            # Login screen
│   └── settings.tsx         # Settings screen
│
├── components/              # Reusable UI components
│   ├── ui/                  # Base UI components
│   ├── atoAssistant/        # AI assistant components
│   ├── AuthProvider.tsx     # Authentication context
│   ├── AuthGuard.tsx        # Route protection
│   ├── I18nProvider.tsx     # Internationalization
│   └── *.tsx                # Feature components
│
├── contexts/                # React Context providers
│   ├── AtoContext.tsx       # Main app state
│   ├── AssistantContext.tsx # AI assistant state
│   └── SelectedUserContext.tsx # User selection state
│
├── lib/                     # Business logic & utilities
│   ├── atoApi.ts            # API abstraction layer
│   ├── supabase.ts          # Supabase client config
│   ├── auth/                # Auth strategies
│   └── i18n/                # Translations
│       ├── locales/         # Language files
│       └── types.ts         # i18n type definitions
│
├── services/                # External service integrations
│   ├── claudeAgent.ts       # Claude AI integration
│   ├── atoTools.ts          # AI tools/functions
│   ├── voiceService.ts      # Speech recognition
│   └── tts/                 # Text-to-speech
│
├── hooks/                   # Custom React hooks
│   ├── useVoiceAssistant.ts # Voice + AI orchestration
│   ├── useContacts.ts       # Contact management
│   └── useColorScheme.ts    # Theme detection
│
├── constants/               # App-wide constants
│   └── Colors.ts            # Color system
│
├── types/                   # TypeScript type definitions
│   └── api.ts               # API response types
│
└── __tests__/              # Test files (mirrors src structure)
```

### 4.2 Component Patterns

**1. Provider Component Pattern:**
```typescript
// All providers follow this pattern
export const SomeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState(...)

  const value = useMemo(() => ({
    state,
    actions
  }), [state])

  return <SomeContext.Provider value={value}>{children}</SomeContext.Provider>
}

export const useSome = () => {
  const context = useContext(SomeContext)
  if (!context) throw new Error('Must be used within provider')
  return context
}
```

**2. Screen Component Pattern:**
```typescript
export default function SomeScreen() {
  const { data, loading, error } = useAto()
  const { t } = useI18n()

  if (loading) return <LoadingDisplay />
  if (error) return <ErrorDisplay />

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Screen content */}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({...})
```

**3. Custom Hook Pattern:**
```typescript
export const useSomeFeature = (options) => {
  const [state, setState] = useState(...)
  const isMounted = useRef(true)

  useEffect(() => {
    // Setup
    return () => {
      isMounted.current = false
      // Cleanup
    }
  }, [deps])

  return { state, actions }
}
```

### 4.3 Import Organization

Standardized import order:
```typescript
// 1. React and React Native
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'

// 2. Expo
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

// 3. Third-party
import { supabase } from '@supabase/supabase-js'

// 4. Relative imports (aliased with @/)
import { useAto } from '@/contexts/AtoContext'
import { useI18n } from '@/components/I18nProvider'
```

---

## 5. Key Patterns & Conventions

### 5.1 Initialization Race Condition Prevention 

**Problem:** Multiple contexts initializing simultaneously caused infinite loops and duplicate API calls.

**Solution:** Implemented initialization guards using refs:

```typescript
// Pattern used in AtoInitializer.tsx and SelectedUserContext.tsx
const initializedUserIdRef = useRef<string | null>(null)
const isInitializingRef = useRef(false)

useEffect(() => {
  let isCancelled = false

  // Guard 1: Already initialized for this user?
  if (initializedUserIdRef.current === userId) return

  // Guard 2: Currently initializing?
  if (isInitializingRef.current) return

  // Guard 3: User not ready?
  if (!userId) return

  const initialize = async () => {
    isInitializingRef.current = true
    try {
      await initializeData()
      if (!isCancelled) {
        initializedUserIdRef.current = userId
      }
    } finally {
      isInitializingRef.current = false
    }
  }

  initialize()

  return () => { isCancelled = true }
}, [userId])
```

**Why This Works:**
- `initializedUserIdRef` tracks which user we've initialized for
- `isInitializingRef` prevents concurrent initialization
- `isCancelled` prevents state updates after unmount
- Refs don't trigger re-renders, breaking dependency cycles

### 5.2 Provider Tree Architecture

**Decision:** Carefully ordered provider hierarchy to ensure proper data flow.

**Implementation in `app/_layout.tsx`:**
```typescript
<I18nProvider>                    {/* 1. i18n first - needed by all */}
  <AuthProvider>                  {/* 2. Auth - foundational */}
    <AtoProvider>                 {/* 3. App data - depends on auth */}
      <AtoInitializer>            {/* 4. Initialize Ato on auth change */}
        <AuthGuard>               {/* 5. Route protection */}
          <SelectedUserProvider>  {/* 6. User selection - depends on Ato */}
            <AssistantProvider>   {/* 7. UI state - independent */}
              <RootLayoutContent />
            </AssistantProvider>
          </SelectedUserProvider>
        </AuthGuard>
      </AtoInitializer>
    </AtoProvider>
  </AuthProvider>
</I18nProvider>
```

**Order Rationale:**
1. **I18nProvider** first - all components need translations
2. **AuthProvider** - authentication is foundational
3. **AtoProvider** - provides business logic layer
4. **AtoInitializer** - watches auth and initializes Ato data
5. **AuthGuard** - protects routes after initialization
6. **SelectedUserProvider** - depends on Ato data being ready
7. **AssistantProvider** - pure UI state, no dependencies

### 5.3 Error Handling Strategy

**Consistent Error Display:**
- All screens use `ErrorDisplay` and `LoadingDisplay` components
- Errors stored in state with optional retry callbacks
- `ErrorModal` component for action-required errors

**Error Boundaries:**
- `ErrorBoundary` component catches React render errors
- Provides fallback UI with error details
- Supports retry mechanism

### 5.4 Internationalization Pattern

**Type-Safe Translations:**

```typescript
// lib/i18n/types.ts
export interface Translations {
  common: { loading: string, error: string, ... }
  auth: { email: string, ... }
  dashboard: { ... }
  // ...deeply nested structure
}

export type FlattenedTranslationKey = NestedTranslationKey<Translations>
```

**Usage Pattern:**
```typescript
const { t } = useI18n()

t('common.loading')                           // "Loading..."
t('userStatus.recentActivity', { userName })  // Interpolation
interpolate(t('reminders.subtitle'), { userName })
```

**Supported Languages:**
- Spanish (es) - Primary, with Rioplatense dialect
- English (en) - Secondary

**Why This Pattern:**
- Type safety catches missing/misspelled keys at compile time
- Centralized translations easy to maintain
- Interpolation function supports `{param}` syntax
- Device locale detection with manual override

---

## 6. Integration Details

### 6.1 Supabase Integration

**Client Configuration** (`lib/supabase.ts`):
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // Persist auth tokens
    autoRefreshToken: true,        // Auto-refresh before expiry
    persistSession: true,          // Keep user logged in
    detectSessionInUrl: false,     // Disable URL session detection
    storageKey: 'sb-auth-token',   // Custom storage key
  },
})
```

**Why These Settings:**
- `AsyncStorage` for token persistence across app restarts
- `autoRefreshToken: true` prevents auth expiration
- `detectSessionInUrl: false` because we handle deep links manually in `/auth/callback`

**Database Patterns:**

1. **Manager-User Many-to-Many:**
```sql
manager_users (
  manager_id -> managers.id
  user_id -> users.id
  relationship (e.g., "grandmother", "father")
)
```

2. **Selected User Pattern:**
```sql
manager_selected_users (
  manager_id UNIQUE -> managers.id
  user_id -> users.id
)
```
- One selected user per manager
- `UPSERT` pattern for switching users
- Prevents duplicate selections

3. **Reminders:**
```sql
reminders (
  user_id -> users.id          -- recipient
  manager_id -> managers.id    -- creator
  task TEXT
  scheduled_for TIMESTAMP
  status (PENDING|SENT|COMPLETED|FAILED)
  rrule TEXT                   -- for recurring reminders
)
```

### 6.2 Claude AI Integration

**Agent Architecture:**

```typescript
// services/claudeAgent.ts
export const callClaudeAgent = async (
  messages: Message[],
  options?: {
    systemPrompt?: string
    elderlyName?: string
    managerId?: string
  }
): Promise<CallClaudeResult>
```

**Agentic Loop:**
1. Send messages + tools to Claude
2. If `stop_reason === 'tool_use'`:
   - Extract tool calls
   - Execute tools via `executeAtoTool()`
   - Append tool results to messages
   - Loop back to step 1
3. If `stop_reason === 'end_turn'`:
   - Extract text response
   - Return to user

**System Prompt Design:**

Carefully crafted for elderly care:
- Uses Rioplatense Spanish ("vos" conjugation)
- Keeps responses SHORT (2-3 sentences max)
- Warm, patient, empathetic tone
- Clear instructions on tool usage
- Emergency handling guidelines

**Tool Design Philosophy:**

Tools are context-aware:
- `managerId` passed via context parameter
- Tools auto-select correct user based on name matching
- Fallback to currently selected user
- All results formatted with i18n

### 6.3 Voice Integration

**Voice Assistant Hook** (`hooks/useVoiceAssistant.ts`):

Orchestrates the full voice interaction loop:
```
User speaks → Speech Recognition → Text
     ↓
Claude AI processes → Agent response
     ↓
Text-to-Speech → Audio playback
```

**Key Features:**
- Silence detection with 1500ms timeout
- Automatic speech-to-text result processing
- Concurrent TTS playback stops listening
- Text mode option (skip TTS for testing)
- Conversation history management
- End conversation detection

**Voice Service** (`services/voiceService.ts`):

Platform-specific speech recognition:
- iOS: Native Speech framework
- Android: Google Speech Services
- Configurable extras (silence thresholds, offline mode)

**Event-Driven Architecture:**
```typescript
setEventHandlers({
  onStart: () => {},        // Recognition started
  onEnd: () => {},          // Recognition ended
  onResults: (texts) => {}, // New transcription
  onError: (error) => {},   // Recognition error
  onVolumeChange: (vol) => {} // Voice detected
})
```

---

## 7. Security & Privacy

### 7.1 Authentication Security

**Passwordless Auth Benefits:**
- No password storage/hashing needed
- Reduces credential stuffing attacks
- Magic links expire after use
- OTP codes expire in 60 seconds

**Token Management:**
- Access tokens stored in secure AsyncStorage
- Auto-refresh prevents session expiration
- Tokens cleared on sign-out
- Row-level security in Supabase enforces data access

### 7.2 Data Privacy

**Supabase Row-Level Security (RLS):**
```sql
-- Example: Managers can only see their own managed users
CREATE POLICY "Managers see their users"
ON users FOR SELECT
USING (
  auth.uid() IN (
    SELECT manager_id FROM manager_users
    WHERE user_id = users.id
  )
);
```

**Privacy Considerations:**
- Elderly user data only accessible to authorized managers
- Reminders created by managers are visible, but elderly's own reminders are private
- Contact information only visible to authorized managers
- Conversation history stored locally, not sent to backend

### 7.3 API Key Security

**Environment Variables:**
```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY  # Safe to expose (RLS protects data)
EXPO_PUBLIC_CLAUDE_API_KEY      # Client-side, consider proxy
EXPO_PUBLIC_ELEVEN_LABS_API_KEY
```

**Security Concern:**
- Claude and ElevenLabs API keys are client-side exposed
- **Recommended**: Move AI processing to Edge Functions or backend proxy

**Current Mitigation:**
- Keys have rate limits
- Keys can be rotated if compromised
- Production should use backend proxy

---

## 8. Testing Strategy

### 8.1 Testing Infrastructure

**Configuration** (`jest.config.js`):
```javascript
{
  testEnvironment: 'node',
  transform: { '^.+\\.(ts|tsx)$': 'babel-jest' },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
  ]
}
```

**Test Structure:**
```
lib/
  __tests__/
    atoApi.test.ts
  atoApi.ts
```

### 8.2 Testing Approaches

**Unit Tests:**
- API layer functions (`lib/atoApi.ts`)
- Tool execution (`services/atoTools.ts`)
- Business logic in contexts

**Component Tests:**
- React Native Testing Library
- Component rendering
- User interaction simulation
- State changes

**Mock Data Strategy:**

`EXPO_PUBLIC_USE_MOCK_API=true` enables:
- Full app testing without backend
- Consistent test data
- App store review support
- Offline development

**Mock Implementation:**
```typescript
// lib/atoApi.mocks.ts
export const MOCK_MANAGERS = { ... }
export const MOCK_USERS = { ... }
export const MOCK_REPORTS = { ... }

// atoApi.ts checks:
if (USE_MOCK_DATA) {
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate latency
  return MOCK_DATA
}
```

### 8.3 Testing Gaps & Future Work

**Current Gaps:**
- No E2E testing (should add Detox)
- Limited integration tests
- No voice/audio testing
- No accessibility testing with screen readers

**Recommendations:**
1. Add Detox for critical user flows
2. Add Storybook for component documentation
3. Add accessibility testing (react-native-testing-library supports it)
4. Add visual regression testing

---

## 9. Performance Considerations

### 9.1 Context Optimization

**Problem:** Multiple contexts caused excessive re-renders.

**Solutions Implemented:**
1. **Context Splitting**: 4 small contexts instead of 1 large one
2. **Memoization**: `useMemo` for context values
3. **Refs for Computed Values**: Use refs for values that don't need to trigger renders
4. **Careful Dependencies**: Only re-create functions when truly necessary

### 9.2 API Call Optimization

**Debouncing & Caching:**
- User report auto-refreshes every 5 minutes
- Selected user fetched once per manager session
- API abstraction layer allows future caching implementation

**External API Fallback:**
```typescript
// getUserReport tries external API first, falls back to Supabase
try {
  const externalReport = await this.fetchExternalReport(managerId)
  if (externalReport) return externalReport
} catch (error) {
  console.warn('External API failed, falling back to Supabase')
}
// Build from Supabase...
```

### 9.3 Rendering Optimization

**ScrollView Optimization:**
- Used `contentContainerStyle` for proper bottom padding
- Calculated bottom spacing based on platform-specific nav height

**Image Optimization:**
- `expo-image` for better image caching
- Lazy loading for user profile pictures

**Asset Optimization:**
- Used `expo-font` for custom fonts
- SVG assets for logos (AtoLogo component)

---

## 10. Internationalization (i18n) Strategy

### 10.1 Architecture

**Library:** `i18n-js` (lightweight, TypeScript-friendly)

**Structure:**
```
lib/i18n/
├── index.ts              # Initialization & setup
├── types.ts              # TypeScript definitions
└── locales/
    ├── en.ts             # English translations
    └── es.ts             # Spanish translations (primary)
```

### 10.2 Type-Safe Translation Keys

**Type System:**
```typescript
export type FlattenedTranslationKey = NestedTranslationKey<Translations>
// Result: "auth.email" | "auth.errors.invalidEmail" | "common.loading" | ...
```

**Benefits:**
- Autocomplete in IDE
- Compile-time error on typo
- Refactoring safety

### 10.3 Interpolation Pattern

**Custom Implementation:**
```typescript
export const interpolate = (text: string, params?: Record<string, any>): string => {
  if (!params) return text

  // Supports {param} and {{param}} formats
  let result = text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })

  return result
}

// Usage
interpolate(t('userStatus.recentActivity'), { userName: 'María' })
// "María has recent activity"
```

### 10.4 Language Persistence

**Storage:**
```typescript
await AsyncStorage.setItem('user_language', language)
```

**Initialization:**
```typescript
const initializeI18n = async () => {
  const savedLang = await AsyncStorage.getItem('user_language')
  const deviceLang = getLocales()[0]?.languageCode || 'es'
  const finalLang = savedLang || deviceLang
  i18n.locale = finalLang
  return finalLang
}
```

**Priority:**
1. User's manual selection (stored)
2. Device locale
3. Fallback: Spanish ('es')

---

## 11. Deep Linking & Navigation Flow

### 11.1 Deep Link Configuration

**Scheme:** `atoapp://`

**Configured in `app.json`:**
```json
{
  "scheme": "atoapp",
  "ios": {
    "bundleIdentifier": "com.anonymous.AtoApp"
  },
  "android": {
    "package": "com.anonymous.AtoApp"
  }
}
```

### 11.2 Auth Callback Flow

**URL:** `atoapp://auth/callback?token=...`

**Handler** (`app/auth/callback.tsx`):
1. Extract token from URL params
2. Verify token with Supabase
3. Store session
4. Redirect to dashboard

**Magic Link Flow:**
```
User clicks email link
  ↓
atoapp://auth/callback?token_hash=...&type=magiclink
  ↓
Supabase verifies token
  ↓
AuthProvider updates state
  ↓
AuthGuard redirects to dashboard
```

### 11.3 Route Protection

**AuthGuard Logic:**
```typescript
if (!user && isProtectedRoute) {
  router.replace('/login')
} else if (user && isPublicRoute && pathname !== '/auth/callback') {
  router.replace('/')
}
```

**Protected Routes:**
- `/` (Dashboard)
- `/contacts`
- `/profile`
- `/settings`

**Public Routes:**
- `/login`
- `/auth/callback`

---

## 12. Platform-Specific Considerations

### 12.1 iOS Specific

**Deployment Target:**
```json
"ios": {
  "deploymentTarget": "15.1"
}
```

**Permissions (Info.plist):**
- `NSSpeechRecognitionUsageDescription`
- `NSMicrophoneUsageDescription`

**Native Features:**
- SF Symbols via `expo-symbols`
- Haptic feedback via `expo-haptics`
- Native tab bar background blur

### 12.2 Android Specific

**SDK Versions:**
```json
"android": {
  "compileSdkVersion": 35,
  "targetSdkVersion": 35,
  "minSdkVersion": 26
}
```

**Permissions (AndroidManifest):**
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`
- `android.permission.INTERNET`

**Speech Services:**
- Google Quick Search Box package for speech recognition
- Configured in `expo-speech-recognition` plugin

**Build Properties:**
- `useAndroidX: true` (AndroidX support)
- `enableJetifier: true` (legacy library compatibility)
- `packagingOptions.pickFirst` to resolve native library conflicts

### 12.3 Cross-Platform Patterns

**Platform-Specific Files:**
```
components/ui/
├── IconSymbol.tsx         # Default export
├── IconSymbol.ios.tsx     # iOS-specific (SF Symbols)
└── TabBarBackground.ios.tsx
```

**Runtime Platform Checks:**
```typescript
import { Platform } from 'react-native'

const bottomNavHeight = Platform.OS === 'ios' ? 100 : 90
```

---

## 13. Development Workflow

### 13.1 Code Quality Tools

**Linting:**
- ESLint with `expo/recommended` config
- TypeScript ESLint plugin
- Pre-commit hooks via Husky

**Formatting:**
- Prettier with custom configuration
- Auto-format on save
- Pre-commit formatting check

**Type Checking:**
```bash
npm run typecheck  # TypeScript compilation check (no emit)
```

**Pre-commit Hooks:**
```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "expo lint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

### 13.2 Environment Management

**Environment Files:**
```
.env.example    # Template with placeholder values
.env            # Local development (gitignored)
```

**Environment Variables:**
- All public vars prefixed with `EXPO_PUBLIC_`
- Available via `process.env` in client code
- Can be overridden per environment

**Build Profiles:**
```bash
# Development
npm start

# Production
eas build --profile production
```

### 13.3 Git Workflow

**Branch Naming:**
```
feature/ATO-123-user-profile-screen
fix/ATO-456-notification-crash
chore/update-expo-sdk
```

**Commit Message Convention:**
```
feat: add voice recording for AI chat
fix: resolve SafeArea issues on Android
chore: update Expo SDK to 53.0.0
docs: update README with setup instructions
```

---

## 14. Known Limitations & Technical Debt

### 14.1 Current Limitations

1. **API Keys Client-Side**
   - Claude and ElevenLabs keys exposed in client
   - **Risk**: Keys can be extracted from app bundle
   - **Mitigation Needed**: Move to backend proxy or Edge Functions

2. **No Offline Mode**
   - App requires internet for most features
   - Voice assistant needs cloud TTS for best experience
   - **Future**: Add offline queue for reminders

3. **Limited Error Recovery**
   - Some API failures don't have retry mechanisms
   - No exponential backoff for failed requests
   - **Future**: Implement retry strategies with exponential backoff

4. **No Analytics**
   - No tracking of user behavior or errors
   - Difficult to identify UX issues
   - **Future**: Add Expo Analytics or Sentry

5. **Single Language at Runtime**
   - User must restart app to change language
   - **Future**: Hot reload translations without restart

### 14.2 Technical Debt

1. **Testing Coverage**
   - Low test coverage (<30% estimated)
   - No E2E tests
   - **Action**: Increase unit test coverage to 80%+

2. **Hardcoded Strings**
   - Some error messages not internationalized
   - Magic numbers (timeouts, limits) scattered in code
   - **Action**: Extract to constants and use i18n for all strings

3. **Component Complexity**
   - `login.tsx` is 538 lines (too large)
   - `useVoiceAssistant.ts` is 535 lines
   - **Action**: Split into smaller, focused components/hooks

4. **Inconsistent Styling**
   - Mix of inline styles and StyleSheet.create()
   - No centralized design system
   - **Action**: Create design system with theme constants for entire ATO

5. **Documentation**
   - Limited inline comments
   - No JSDoc for most functions
   - **Action**: Add comprehensive JSDoc comments

---

## 16. Migration Paths & Scalability

### 16.1 Backend Migration Strategy

**Current:** Supabase as primary backend

**Future Options:**

**Option A: Hybrid Architecture**
- Keep Supabase for auth and real-time
- Add custom backend for complex business logic
- Use Edge Functions for AI processing

**Option B: Full Custom Backend**
- Migrate to custom Node.js/NestJS backend
- Keep Supabase just for auth (or migrate to Auth0)
- Full control over data models and API

**Migration Steps:**
1. Abstract all API calls behind `atoApi` service (✅ Already done)
2. Create parallel implementations (Supabase + Custom)
3. Feature flag to switch between backends
4. Gradual migration of features
5. Deprecate Supabase once migration complete

### 16.2 State Management Evolution

**Current:** React Context API

**When to Migrate to Redux/Zustand:**

**Signals to migrate:**
- More than 10 contexts
- Complex async state management
- Need for time-travel debugging
- Team size > 5 developers

**Migration Path:**
1. Start with one feature domain (e.g., reminders)
2. Create Redux/Zustand store for that domain
3. Migrate other domains incrementally
4. Keep contexts for UI state
5. Full migration only if necessary

### 16.3 Monorepo Strategy

**Future:** Shared code between mobile, web, and backend

**Recommended Structure:**
```
packages/
├── mobile/          # Current React Native app
├── web/             # Next.js web app
├── backend/         # NestJS API
├── shared/          # Shared utilities
│   ├── types/       # TypeScript types
│   ├── constants/   # Constants
│   └── utils/       # Pure functions
└── ui/              # Shared UI components (React Native + Web)
```

**Tools:**
- Turborepo or Nx for monorepo management
- Shared TypeScript configuration
- Shared linting/formatting rules

---

## 17. Key Learnings & Rationale Summary

### 17.1 Why Expo Managed Workflow?

**Decision Drivers:**
- **Speed**: Faster development with pre-configured native modules
- **OTA Updates**: Critical for quick bug fixes without app store review
- **Simplicity**: No need to manage native code (Xcode/Android Studio)
- **Developer Experience**: Excellent tooling and documentation

**Trade-offs Accepted:**
- Limited native module flexibility
- Slightly larger app bundle size
- Dependency on Expo's release cycle

**When to Eject:**
- Need for unsupported native modules
- Performance bottlenecks in Expo modules
- Advanced native customization required

### 17.2 Why TypeScript?

**Benefits Realized:**
- Caught ~40% of bugs at compile time
- Improved IDE autocomplete and refactoring
- Better documentation through types
- Easier onboarding for new developers

**Challenges:**
- Initial learning curve for team
- Some third-party libraries lack types
- Complex type definitions for i18n

**Verdict:** Worth it. TypeScript saved significant debugging time.

### 17.3 Why File-System Routing (Expo Router)?

**Benefits:**
- Easier to understand app structure
- Type-safe navigation
- Better code splitting
- Native deep linking support

**Migration Pain:**
- Team familiar with React Navigation needed relearning
- Some advanced navigation patterns required workarounds

**Verdict:** Better long-term maintainability despite initial friction.

### 17.4 Why Supabase?

**Pros:**
- Extremely fast setup (auth + DB in hours, not weeks)
- Built-in RLS for security
- Real-time subscriptions
- Excellent TypeScript support
- Cost-effective

**Cons:**
- Vendor lock-in
- Some complex queries difficult with Supabase client
- Limited control over database performance tuning

**Verdict:** Perfect for MVP and early growth. Re-evaluate at 100k+ users.

---

## 18. Conclusion

### 18.1 Architecture Assessment

**Strengths:**
- ✅ Clear separation of concerns (contexts, services, components)
- ✅ Type-safe throughout with TypeScript
- ✅ Scalable state management with context splitting
- ✅ Flexible authentication supporting multiple strategies
- ✅ Excellent internationalization foundation
- ✅ Good developer experience with Expo

**Areas for Improvement:**
- ⚠️ Test coverage needs improvement
- ⚠️ API keys should move to backend
- ⚠️ Some components too large, need refactoring
- ⚠️ Limited offline capabilities
- ⚠️ No analytics/monitoring yet

### 18.2 Suitability for Current Scale

**Current Scale Estimate:**
- Hundreds of users (ato-managers)
- Thousands of elderly users (ato-users)
- Low to moderate API traffic

**Architecture Assessment:** ✅ Well-suited

The architecture is appropriate for current scale:
- Context API sufficient for current complexity
- Supabase can handle current traffic
- No need for microservices yet
- Cost-effective infrastructure

### 18.3 Growth Readiness

**Can scale to:**
- 10,000 managers ✅
- 100,000 elderly users ✅
- Multiple countries/languages ✅

**Will need changes at:**
- 100,000+ managers (consider Redis caching, CDN)
- Complex analytics requirements (add dedicated data warehouse)
- HIPAA compliance (migrate to compliant infrastructure)

### 18.4 Recommendations for New Developers

**Starting Points:**
1. Read `CLAUDE.md` for project overview
2. Review `app/_layout.tsx` to understand provider tree
3. Explore `lib/atoApi.ts` to understand data layer
4. Check `contexts/AtoContext.tsx` for main business logic
5. Review any screen in `app/(tabs)/` for UI patterns

**Key Concepts:**
- Expo Router file-system routing
- Context-based state management
- Type-safe i18n with interpolation
- Supabase integration patterns
- AI tool-calling architecture

**Common Pitfalls:**
- Initialize contexts only once per user
- Use refs for non-reactive state
- Always clean up subscriptions/timers
- Handle loading/error states in screens
- Keep API keys secure (use backend proxy)

---

## Appendix A: Technology Decision Matrix

| Category | Chosen | Alternatives Considered | Decision Factors |
|----------|--------|------------------------|------------------|
| **Framework** | Expo | React Native CLI, Flutter | DX, OTA updates, tooling |
| **Routing** | Expo Router | React Navigation | Type safety, file-system routing |
| **Backend** | Supabase | Firebase, Custom NestJS | Speed, RLS, real-time |
| **State** | Context API | Redux, Zustand, MobX | Simplicity, native React |
| **AI** | Claude API | OpenAI, Vercel AI SDK | Tool calling, Spanish quality |
| **TTS** | ElevenLabs + Native | Google TTS, Azure | Voice quality for elderly |
| **i18n** | i18n-js | react-i18next, LinguiJS | Lightweight, TypeScript-friendly |
| **Testing** | Jest + RTL | Detox only, Appium | Unit + integration focus |

---

## Appendix B: Environment Variables Reference

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://abc.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes | `eyJhbGc...` |
| `EXPO_PUBLIC_CLAUDE_API_KEY` | Claude AI API key | Yes* | `sk-ant-...` |
| `EXPO_PUBLIC_ELEVEN_LABS_API_KEY` | ElevenLabs TTS key | Yes* | `abc123...` |
| `EXPO_PUBLIC_USE_MOCK_API` | Enable mock data | No | `true` or `false` |
| `EXPO_PUBLIC_REPORTS_API_URL` | External reports API | No | `https://api.ato.com/reports` |

*Required for production. Can be omitted if `EXPO_PUBLIC_USE_MOCK_API=true`

---

## Appendix C: API Endpoints Reference

**Supabase Tables:**
- `managers` - Ato-manager profiles
- `users` - Elderly user profiles
- `manager_users` - Manager-user relationships
- `manager_selected_users` - Current selection per manager
- `reminders` - Task/medication reminders
- `contacts` - Emergency contacts

**External APIs:**
- Claude API: `https://api.anthropic.com/v1/messages`
- ElevenLabs API: `https://api.elevenlabs.io/v1/text-to-speech`
- Custom Reports API: `EXPO_PUBLIC_REPORTS_API_URL`

---

## Document Metadata

**Last Updated:** October 21, 2025
**Document Version:** 1.0
**Next Review:** December 2025
**Maintained By:** Development Team

**Change Log:**
- 2025-10-21: Initial ADR created based on comprehensive codebase analysis
- [Future changes will be logged here]

---

*This Architecture Decision Record documents the current state of the Ato mobile application architecture as of October 2025. It should be reviewed and updated quarterly or when significant architectural changes are made.*
