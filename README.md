# Expo Keycloak Client

A lightweight library to integrate Keycloak with your Expo app.

This library takes care of the login/logout process, token storage with `expo-secure-store`, and token refresh.

## Features

- Login to your keycloak realm using the `expo-auth-session` package.

- Store the tokens in the `expo-secure-store`.

- Use the `authRestService` singleton to make authenticated requests to your backend and automatically refresh the token when it expires.

- logout (end the session) **without the need to open an external browser** (keycloak legacy logout)

- access the stored tokens using the `authTokenService` singleton.

## Installation

In order for this library to work, you need to install the [expo-auth-session](https://docs.expo.dev/versions/latest/sdk/auth-session/) package with the combination of `expo-secure-store` for token management.

```bash
npx expo install expo-auth-session expo-crypto expo-secure-store
```

After you have installed these packages in your expo project, you can install the `expo-keycloak-client` package.

```bash
npm install expo-keycloak-client
```

or if you are using yarn

```bash
yarn add expo-keycloak-client
```

## Usage

```tsx
// app/_layout.tsx

import { AuthProvider, KeycloakClientConfig } from  "expo-keycloak-client";

const kcConfig: KeycloakClientConfig = {
  clientId: "your-client-id",
  issuer: 'https://hostname/realms/my-realm',
  scopes: ["openid", "basic", "email", "offline_access", "profile", "...other scopes"],
  signInRedirectUri: makeRedirectUri({
    ...define your scheme
  }),
};

export default function RootLayout() {
  // ...
  return (
    <AuthProvider config={kcConfig}>
        {/* rest of app */}
    </AuthProvider>
  );
}

```
