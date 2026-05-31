import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  choreConverter,
  choreLogConverter,
  groupConverter,
  userConverter,
} from "@/lib/firebase/converters";
import type {
  ChoreDoc,
  ChoreLogDoc,
  GroupDoc,
  UserDoc,
} from "@/lib/types/firestore";

export const COLLECTIONS = {
  users: "users",
  groups: "groups",
  chores: "chores",
  choreLog: "choreLog",
} as const;

export function usersCol(): CollectionReference<UserDoc> {
  return collection(getDb(), COLLECTIONS.users).withConverter(userConverter);
}

export function userRef(uid: string): DocumentReference<UserDoc> {
  return doc(getDb(), COLLECTIONS.users, uid).withConverter(userConverter);
}

export function groupsCol(): CollectionReference<GroupDoc> {
  return collection(getDb(), COLLECTIONS.groups).withConverter(groupConverter);
}

export function groupRef(groupId: string): DocumentReference<GroupDoc> {
  return doc(getDb(), COLLECTIONS.groups, groupId).withConverter(groupConverter);
}

export function choresCol(): CollectionReference<ChoreDoc> {
  return collection(getDb(), COLLECTIONS.chores).withConverter(choreConverter);
}

export function choreRef(choreId: string): DocumentReference<ChoreDoc> {
  return doc(getDb(), COLLECTIONS.chores, choreId).withConverter(choreConverter);
}

export function choreLogCol(): CollectionReference<ChoreLogDoc> {
  return collection(getDb(), COLLECTIONS.choreLog).withConverter(choreLogConverter);
}

export function choreLogRef(logId: string): DocumentReference<ChoreLogDoc> {
  return doc(getDb(), COLLECTIONS.choreLog, logId).withConverter(choreLogConverter);
}
