# Ato Mobile App

**Ato** is a companion mobile app for elderly assistance device ecosystem. Built with Expo Router and managed workflow. The app is used by "ato-managers" (family members/caregivers) to manage profiles of "ato-users" (seniors), set reminders, manage contacts, and monitor activity.

**Authors**: Gaspar Habif, Sebastian Itokazu

## Features

- **Authentication**: Secure login with Supabase auth including magic links and OTP
- **Dashboard**: Overview of connected ato-users and their activity
- **Contacts Management**: Manage emergency contacts and family connections
- **Profile Management**: Configure ato-user profiles and settings
- **Navigation**: Bottom tab navigation with intuitive user flow

## Tech Stack

- **Framework**: Expo ~53.0.0 (managed workflow)
- **Language**: TypeScript 5.x
- **Navigation**: Expo Router (file-system routing)
- **Authentication**: Supabase
- **Styling**: React Native + Expo LinearGradient
- **State Management**: React Context

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables

   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

3. Start the development server

   ```bash
   npx expo start
   ```

## Available Scripts

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project Structure

```
app/                    # Expo Router routes (file-system routing)
├── (tabs)/            # Tab group with bottom navigation
│   ├── index.tsx      # Home/Dashboard screen
│   └── explore.tsx    # Explore screen
├── auth/              # Authentication flows
│   └── callback.tsx   # Auth callback handler
├── contacts.tsx       # Contacts management
├── dashboard.tsx      # Main dashboard
├── login.tsx          # Login screen
├── profile.tsx        # User profile
├── settings.tsx       # App settings
└── _layout.tsx        # Root layout

components/            # Reusable React components
contexts/             # React contexts for state management
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
