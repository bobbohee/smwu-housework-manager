import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { userRef } from "@/lib/firebase/collections";

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export async function signUp({ email, password, name }: SignUpInput): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  await setDoc(userRef(cred.user.uid), {
    uid: cred.user.uid,
    name,
    email,
    groupIds: [],
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}
