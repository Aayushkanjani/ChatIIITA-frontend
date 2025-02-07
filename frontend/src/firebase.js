import { create } from "zustand";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { signOut as firebaseSignOut } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const useAuthStore1 = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  campaigns: [],

  // Sign in using Google Popup
  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "user", user.uid);
      const userDoc = await getDoc(userRef);

      // Define userData consistently
      let userData;
      if (userDoc.exists()) {
        userData = userDoc.data();
      } else {
        userData = {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email,
          phone: user.phoneNumber || "",
          image: user.photoURL || "",
          messages: [],
        };
        await setDoc(userRef, userData);
      }

      // Save token (if needed for later use)
      const token = await user.getIdToken();

      localStorage.setItem("authToken", token);

      // Update Zustand state
      window.location.reload()
      set({ user: userData, isAuthenticated: true, isLoading: false });
      window.location.reload()
      // Optionally, navigate to a protected route (using React Router's useNavigate hook in your component)
    } catch (error) {
      console.error("Error signing in:", error);
      set({
        error: error.message || "Error signing in",
        isLoading: false,
      });
      throw error;
    }
  },

  // Sign out the user
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem("authToken");
      set({ user: null, isAuthenticated: false, isLoading: false });
      window.location.reload()
      // Optionally, navigate to the home or login page
    } catch (error) {
      console.error("Error signing out:", error);
      set({ error: "Error logging out", isLoading: false });
    }
  },

  // Check the current auth state and update the store accordingly
  checkAuth: async () => {
    set({ isCheckingAuth: true, error: null });
    try {
      // The unsubscribe function can be used in a React component's cleanup
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          const userRef = doc(db, "user", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            set({
              user: { uid: currentUser.uid, ...userSnap.data() },
              isAuthenticated: true,
              isCheckingAuth: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isCheckingAuth: false });
          }
        } else {
          set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        }
      });
      return unsubscribe; // Return unsubscribe function for cleanup if needed
    } catch (error) {
      // console.error("Error checking auth:", error);
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },

  // Update the user schema in Firestore
  updateUserSchema: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      // Use the consistent "user" collection name
      await setDoc(doc(db, "user", currentUser.uid), userData, { merge: true });
      set({ user: { ...userData, email: currentUser.email }, isLoading: false });
    } catch (error) {
      // console.error("Error updating user schema:", error);
      set({ error: error.message || "Error updating user schema", isLoading: false });
    }
  },

  // Fetch campaigns from Firestore
  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      const querySnapshot = await getDocs(collection(db, "campaign"));
      const fetchedCampaigns = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Firestore document ID
        ...doc.data(),
      }));
      set({ campaigns: fetchedCampaigns, isLoading: false });
    } catch (error) {
      // console.error("Error fetching campaigns:", error);
      set({ error: error.message || "Error fetching campaigns", isLoading: false });
    }
  },

  // Add a new prompt to the user's messages array in Firestore
  addPrompt: async (newPrompt) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    const userRef = doc(db, "user", currentUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, { email: currentUser.email, messages: [newPrompt] });
      } else {
        await updateDoc(userRef, {
          messages: arrayUnion(newPrompt)
        });
      }
    } catch (error) {
      // console.error("Error adding prompt:", error);
      set({ error: error.message || "Error adding prompt" });
    }
  }
}));

export { db, auth };
