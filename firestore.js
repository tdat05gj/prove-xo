
const firebaseConfig = {


  apiKey: process.env.VITE_FIREBASE_API_KEY,
   
 authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
   
   projectId: process.env.VITE_FIREBASE_PROJECT_ID,
   
   storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
   
 messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
   
   appId: process.env.VITE_FIREBASE_APP_ID,
 measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


async function getUserData(userId) {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
}


async function saveUserData(
    userId,
    walletAddress,
    prove,
    theme = 'blue',
    totalGames = 0,
    totalWins = 0,
    username = ''
) {
    await db.collection('users').doc(userId).set({
        walletAddress,
        prove,
        theme,
        totalGames,
        totalWins,
        username
    });
}

async function createMatch(userId) {
    const matchRef = await db.collection('matches').add({
        playerX: userId,
        playerO: null,
        board: Array(256).fill(''),
        turn: 'X',
        status: 'waiting',
        winner: null,
        createdAt: Date.now()
    });
    return matchRef.id;
}

async function joinMatch(matchId, userId) {
    await db.collection('matches').doc(matchId).update({
        playerO: userId,
        status: 'playing'
    });
}

function listenMatches(callback) {
    return db.collection('matches')
        .where('status', '==', 'waiting')
        .onSnapshot(snapshot => {
            const matches = [];
            snapshot.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
            callback(matches);
        });
}

function listenMatch(matchId, callback) {
    return db.collection('matches').doc(matchId)
        .onSnapshot(doc => callback(doc.data()));
}

async function updateBoard(matchId, board, turn) {
    await db.collection('matches').doc(matchId).update({ board, turn });
}

async function resetMatch(matchId) {
    await db.collection('matches').doc(matchId).update({
        board: Array(256).fill(''),
        turn: 'X',
        status: 'playing'
    });
}