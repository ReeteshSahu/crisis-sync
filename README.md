CrisisSync AI

A real-time emergency tracking dashboard built with React, Firebase, Google Maps, and Google Gemini. Record fire, medical, and security incidents, view their locations, ask for AI-generated guidance, and track incidents through resolution.

> **Project scope:** This application is a prototype. Creating an incident saves a Firestore record; it does not notify or dispatch emergency services, despite the interface displaying “Alert sent to emergency services.” AI responses are generated content and should not be relied on as emergency instructions.

## Features

- **Three incident categories:** Fire, medical, and security, each with distinct styling and contact links.
- **Live activity log:** Firestore listeners synchronize incidents across connected clients, newest first.
- **Location and maps:** Browser geolocation records coordinates when available. Google Maps displays your location and incident markers with status and timestamps.
- **Voice triggers:** Create incidents through recognized keywords using the browser's Web Speech API.
- **Gemini guidance:** Describe a situation or ask follow-up questions from an incident card. The implementation calls `gemini-2.5-flash` and applies a 10-second client-side cooldown between questions per guidance panel.
- **Read-aloud responses:** Play generated guidance using browser speech synthesis.
- **Resolution tracking:** Mark incidents as resolved and view creation time, resolution time, and elapsed duration.
- **Dashboard statistics:** View total, active, and resolved incidents, plus average time from creation to resolution. The interface labels this last metric “Avg Response Time.”
- **Responsive layout:** The desktop dashboard stacks vertically on smaller screens.

## Technology

| Area | Implementation |
| --- | --- |
| UI | React 19, JavaScript, CSS |
| Development and build | Vite 8 |
| Database | Firebase Cloud Firestore |
| AI | Google Gemini REST API |
| Maps | Google Maps JavaScript API |
| Browser capabilities | Geolocation, speech recognition, speech synthesis |
| Hosting configuration | Firebase Hosting |
| Code checks | ESLint 10 |

## Getting started

### Prerequisites

- Git and npm.
- Node.js 22.13+ in the 22.x release line, or Node.js 24+. These versions satisfy the checked-in Vite and ESLint requirements.
- A Firebase project with a registered web app and Cloud Firestore database.
- A Gemini API key for AI guidance.
- A Google Maps JavaScript API key with the API enabled and any required billing configured.
- A browser with geolocation support. Voice recognition requires a supported speech recognition implementation and microphone permission.

### 1. Clone and install

```sh
git clone https://github.com/ReeteshSahu/crisis-sync.git
cd crisis-sync
npm ci
```

### 2. Configure Firebase

In the Firebase console, register a web app and create a Cloud Firestore database. Replace the existing `firebaseConfig` values in `src/firebase.js` with the web configuration for your project:

```js
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

The app reads, creates, and updates documents in an `emergencies` collection. Firestore creates the collection on the first successful write; no seed data is required.

Firestore access rules must permit the operations needed by your intended users. The repository does not include Firestore rules or authentication, so access control must be designed before a public deployment. Use a separate development project for testing rather than granting unrestricted access to production data.

### 3. Configure Gemini

Create a `.env` file in the project root:

```dotenv
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

The `.env` file is already ignored by Git. Restart the development server after changing it. For production builds, set this variable in the build environment before running `npm run build`.

**Key handling:** Vite embeds `VITE_` values in the browser bundle. The current implementation sends Gemini requests directly from the browser, so this key is visible to users. For a public deployment, move Gemini requests to a server-side endpoint and keep its credential there.

### 4. Configure Google Maps

In `index.html`, replace the key in the existing Maps script tag with your own:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY"></script>
```

Configure website and API restrictions appropriate to your development and deployment domains. Firebase and Maps configuration are currently stored directly in source files; setting additional `.env` variables alone will not change them.

### 5. Start the application

```sh
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Allow location access to enable location capture and the map. Use localhost for development and HTTPS when hosting so browser permission-dependent features can operate.

## Usage

1. Select **Fire Emergency**, **Medical Emergency**, or **Security Alert** to create an incident in your configured Firestore database.
2. Alternatively, select **Voice Trigger**, allow microphone access, and say a recognized keyword from the table below.
3. Select an incident in the **Activity Log** to view its details.
4. Enter a question in **Gemini AI Guidance** and select **Ask**. After a response appears, select **Speak** to read it aloud.
5. Select **Mark as Resolved** to update the incident and record its resolution timestamp.

| Incident | Voice keywords |
| --- | --- |
| Fire | `fire` |
| Medical | `medical`, `ambulance`, `help` |
| Security | `security`, `police`, `intruder` |

The contact links use `tel:` URLs and require a compatible calling application or device. Contact values are hardcoded in the `emergencyData` object in `src/CrisisSync.jsx`; adapt them for the intended deployment region.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Generate the production site in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

The repository currently has no automated test script.

## Firestore data model

Each document in `emergencies` contains:

| Field | Type | Description |
| --- | --- | --- |
| type | string | fire, medical, or security |
| status | string | Active or Resolved |
| createdAt | timestamp | Firestore server timestamp set on creation |
| resolvedAt | timestamp or null | Server timestamp set on resolution |
| lat | number or null | Browser latitude available when the incident is created |
| lng | number or null | Browser longitude available when the incident is created |

The document ID becomes the client-side `id`. Records are queried by `createdAt` in descending order. AI questions and answers remain in component state and are not saved to Firestore.

## Project structure


crisis-sync/
├── public/                 # Public icons and favicon
├── src/
│   ├── assets/             # Image and SVG assets
│   ├── App.jsx             # Root application component
│   ├── CrisisSync.jsx      # Dashboard, map, voice, AI, and incident logic
│   ├── firebase.js         # Firebase initialization and Firestore export
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global styles
│   └── App.css             # Additional stylesheet
├── index.html              # HTML entry point and Maps script
├── firebase.json           # Hosting configuration and SPA rewrite
├── .firebaserc             # Default Firebase project alias
├── eslint.config.js        # Lint configuration
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies and scripts
└── package-lock.json       # Locked dependency versions


## Firebase Hosting

The included hosting configuration serves dist/ and rewrites requests to index.html.

Install the Firebase CLI and sign in:

npm install -g firebase-tools
firebase login


Replace the default project ID in `.firebaserc` with your own hosting project. Then build and deploy from the project root:

npm run build
firebase deploy --only hosting --project YOUR_PROJECT_ID


Hosting deployment does not configure Firestore rules or provision a Gemini backend. Ensure the Firebase web configuration, Maps restrictions, and build-time Gemini configuration match the environment you intend to deploy.

## Current limitations

- No emergency-service dispatch, SMS, push notification, or responder integration is implemented.
- No user authentication, roles, or per-user incident filtering is implemented. Clients query the same collection, subject to Firestore access rules.
- Incident coordinates are stored in Firestore when available, and guidance prompts are sent to Google's Gemini API. Consider these data flows when planning access and privacy controls.
- Speech features depend on browser support and permissions. Recognition is configured for `en-US`.
- The Maps component expects the Google Maps script to be available when location arrives; it does not implement a script-load retry.

