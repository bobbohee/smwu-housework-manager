import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
import type {
  ChoreDoc,
  ChoreLogDoc,
  GroupDoc,
  InviteCodeDoc,
  UserDoc,
} from "@/lib/types/firestore";

function stripId(model: object): DocumentData {
  const copy = { ...model } as Record<string, unknown>;
  delete copy.id;
  delete copy.uid;
  delete copy.code;
  return copy as DocumentData;
}

export const userConverter: FirestoreDataConverter<UserDoc> = {
  toFirestore(model) {
    return stripId(model);
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): UserDoc {
    const data = snap.data(options) as Omit<UserDoc, "uid">;
    return { ...data, uid: snap.id };
  },
};

export const groupConverter: FirestoreDataConverter<GroupDoc> = {
  toFirestore(model) {
    return stripId(model);
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): GroupDoc {
    const data = snap.data(options) as Omit<GroupDoc, "id">;
    return { ...data, id: snap.id };
  },
};

export const inviteCodeConverter: FirestoreDataConverter<InviteCodeDoc> = {
  toFirestore(model) {
    return stripId(model);
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): InviteCodeDoc {
    const data = snap.data(options) as Omit<InviteCodeDoc, "code">;
    return { ...data, code: snap.id };
  },
};

export const choreConverter: FirestoreDataConverter<ChoreDoc> = {
  toFirestore(model) {
    return stripId(model);
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): ChoreDoc {
    const data = snap.data(options) as Omit<ChoreDoc, "id">;
    return { ...data, id: snap.id };
  },
};

export const choreLogConverter: FirestoreDataConverter<ChoreLogDoc> = {
  toFirestore(model) {
    return stripId(model);
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): ChoreLogDoc {
    const data = snap.data(options) as Omit<ChoreLogDoc, "id">;
    return { ...data, id: snap.id };
  },
};
