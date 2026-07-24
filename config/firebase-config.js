// Firebase Configuration
var firebaseConfig = {
  apiKey: "AIzaSyDkzrjxWb40q93C0-2DtofhNSzHlqbEiyA",
  authDomain: "device-streaming-3eda878f.firebaseapp.com",
  projectId: "device-streaming-3eda878f",
  storageBucket: "device-streaming-3eda878f.firebasestorage.app",
  messagingSenderId: "34176564058",
  appId: "1:34176564058:web:4bc0374abccedc03299163"
};

// Guard: only init if Firebase SDK is loaded AND app hasn't been initialized yet
if (typeof firebase !== 'undefined' && firebase.initializeApp && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded — auth and cloud features unavailable');
  }
}
