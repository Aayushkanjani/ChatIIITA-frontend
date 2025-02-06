import { create } from "zustand";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc , getDoc , getDocs ,updateDoc , arrayUnion } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { signOut as firebaseSignOut } from "firebase/auth";
import { Navigate } from "react-router-dom";


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

// Zustand store for authentication
export const useAuthStore1 = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  campaigns: [],

 signIn : async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, "user", user.uid);
  
      // Check if the user exists in Firestore
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        // User exists, no need to create a new profile
        console.log("User already exists:", userDoc.data());
      } else {
        // User doesn't exist, create a new profile
        const userData = {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email,
          phone: user.phoneNumber || "",
          image: user.photoURL || "",
          messages: [],
        };
  
        await setDoc(userRef, userData);
        // console.log("New user created:", userData);
      }
  
      // Save token in localStorage
      const token = await user.getIdToken();
      localStorage.setItem("authToken", token);
      // Update Zustand state
      set({ user: userData, isAuthenticated: true, isLoading: false });
      window.location.reload();
    } catch (error) {
      console.error("Error signing in:", error);
      set({
        error: error.message || "Error signing in",
        isLoading: false,
      });
      throw error;
    }
  },
  

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem("authToken");
      
      // Reset state
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ error: "Error logging out", isLoading: false });
      console.error("Error signing out:", error);
    }
  },

  
  checkAuth: async () => {
    set({ isCheckingAuth: true, error: null });
    try {
      onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          const userDoc = doc(db, "user", currentUser.uid);
          const userSnap = await getDoc(userDoc);
  
          if (userSnap.exists()) {
            set({
              user: { uid: currentUser.uid, ...userSnap.data() },
              isAuthenticated: true,
              isCheckingAuth: false,
            });
          } else {
            console.error("No Firestore document found for user");
            set({ user: null, isAuthenticated: false, isCheckingAuth: false });
          }
        } else {
          // No user is signed in
          set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        }
      });
    } catch (error) {
      console.error("Error checking auth state:", error);
      set({ user: null, isAuthenticated: false, isCheckingAuth: false });
    }
  },

  updateUserSchema: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Update user profile in Firestore
      await setDoc(doc(db, "users", user.uid), userData, { merge: true });

      // Update Zustand state
      set({ user: { ...userData, email: user.email }, isLoading: false });
    } catch (error) {
      set({ error: error.message || "Error updating user schema", isLoading: false });
      console.error("Error updating user schema:", error);
    }
  },

  fetchCampaigns : async () => {
    set({ isLoading: true, error: null });
  
    try {
      const querySnapshot = await getDocs(collection(db, "campaign"));
      const fetchedCampaigns = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Firestore document ID
        ...doc.data(), // Campaign data
      }));
  
      set({ campaigns : fetchedCampaigns, isLoading: false });
    } catch (error) {
      set({ error: error.message || "Error fetching campaigns", isLoading: false });
      console.error("Error fetching campaigns:", error);
    }
  },

  addPrompt: async (newPrompt) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User not authenticated");
    }
    
    const email = currentUser.email;
    const messagesRef = collection(db, "user");
    const userDocRef = doc(messagesRef, currentUser.uid);
    
    try {
        // Check if the document exists
        const docSnap = await getDoc(userDocRef);
        
        if (!docSnap.exists()) {
            // Create a new document if it does not exist
            await setDoc(userDocRef, { email, messages: [newPrompt] });
        } else {
            // Update the existing document
            await updateDoc(userDocRef, {
                messages: arrayUnion(newPrompt)  // Corrected field name
            });
        }
        // console.log("Prompt added successfully");
    } catch (error) {
        console.error("Error adding prompt:", error);
    }
}

}));

export { db, auth };
