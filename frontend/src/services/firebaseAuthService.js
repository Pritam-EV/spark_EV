import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Function to listen for auth state changes
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Function to logout user
export const logoutUser = async () => {
  await signOut(auth);
};
