import { GoogleSignin } from '@react-native-google-signin/google-signin';

// From Firebase Console → Authentication → Sign-in method → Google → Web client ID.
const WEB_CLIENT_ID = '201046732955-1ol18vai7bi3va5t0t9acu81qe3ad827.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
});
