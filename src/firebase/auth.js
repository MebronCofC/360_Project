// import { send } from 'process';
import {auth} from './firebase';
import { upsertUserProfileInDB } from './firestore';

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const doCreateUserWithEmailAndPassword = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Eagerly create the user profile document
    try { await upsertUserProfileInDB(cred.user); } catch(e) { console.warn('upsert user (register) failed', e); }
    return cred;
};

export const doSignInWithEmailAndPassword = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try { await upsertUserProfileInDB(cred.user); } catch(e) { console.warn('upsert user (email login) failed', e); }
    return cred;
}

export const doSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    try { await upsertUserProfileInDB(result.user); } catch(e) { console.warn('upsert user (google login) failed', e); }
    return result;
}

export const doSignOut = () => {
    return auth.signOut();
}

// export const doPasswordReset = (email) => {
//     return sendPasswordResetEmail(auth, email);
// }

// export const doPasswordChange = (password) => {
//     return updatePassword(auth.currentUser, password);
// }

// export const doSendEmailVerification = () => {
//     return sendEmailVerification(auth.currentUser, {
//         url: `${window.location.origin}/home`,
//     });
// }
