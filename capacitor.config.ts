import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.carepaws.app",
  appName: "CarePaws",
  // The static Next.js export (next.config.ts sets output: "export").
  webDir: "out",
  android: {
    // Keep the WebView origin on https://localhost so Firebase Auth treats it as a secure context.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#f3eee5",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f3eee5",
      overlaysWebView: false,
    },
    FirebaseAuthentication: {
      // The native layer only sends the SMS; sign-in itself happens in the JS SDK so
      // Firestore sees a single signed-in user.
      skipNativeAuth: true,
      providers: ["phone"],
    },
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
