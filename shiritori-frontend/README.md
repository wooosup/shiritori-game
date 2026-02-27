# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Capacitor (Android) 설정

- 앱 이름: `Shiritori`
- 앱 ID: `com.yourname.shiritori`
- 웹 빌드 디렉토리(`webDir`): `dist`

### Android 네이티브 프로젝트 생성

```bash
npm install
npx cap add android
```

### 웹 변경 반영 표준 루틴

```bash
npm run build
npm run cap:sync:android
npm run android:build
```

또는 아래 단일 명령으로 동일한 순서를 실행할 수 있습니다.

```bash
npm run android:build
```

## Supabase OAuth Redirect URL 설정

Supabase Dashboard > Authentication > URL Configuration > Redirect URLs에 아래 URL을 모두 등록하세요.

- `shiritori://auth/callback` (앱 스킴, 앱 우선)
- `https://<YOUR_DOMAIN>/auth/callback` (웹 콜백 유지)
- `http://localhost:5173/auth/callback` (로컬 개발)

앱에서는 네이티브 환경일 때 `shiritori://auth/callback`으로, 웹에서는 `/auth/callback`으로 자동 분기합니다.

## Android/iOS 딥링크 핸들러 등록

네이티브 프로젝트를 생성한 뒤 아래 설정을 추가하세요.

### Android (`android/app/src/main/AndroidManifest.xml`)

`MainActivity` 아래 `intent-filter`를 추가합니다.

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="shiritori" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

### iOS (`ios/App/App/Info.plist`)

URL Types에 `shiritori` 스킴을 추가합니다.

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.yourname.shiritori.auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>shiritori</string>
    </array>
  </dict>
</array>
```
