import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyC5gM3sNfJnR88EilMA5EBG8qdxt5NSOjQ",
  authDomain: "chess-9bfbb.firebaseapp.com",
  projectId: "chess-9bfbb",
  storageBucket: "chess-9bfbb.appspot.com",
  messagingSenderId: "296757639984",
  appId: "1:296757639984:web:6a8933a6066222891be6f5",
  measurementId: "G-22T10D2S36"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2 đội, không giới hạn số lượng ---
const TEAMS = ['Pink', 'Blue'];

// --- Biến trạng thái bắt đầu sự kiện ---
let eventStarted = false;

// --- Lắng nghe trạng thái bắt đầu sự kiện ---
onSnapshot(doc(db, "chess_event", "status"), (snap) => {
    if (snap.exists() && snap.data().started) {
        eventStarted = true;
        showPairsFromDB();
    }
});

// --- Join team by code (không giới hạn số lượng) ---
document.getElementById('join-btn').onclick = async () => {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (!code) return alert('Please enter code!');
    const userRef = doc(db, "users", code);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return alert('Invalid code!');
    const username = userSnap.data().username;
    const team = userSnap.data().team;
    // Check if code used
    const codeRef = doc(db, "chess_codes", code);
    const codeSnap = await getDoc(codeRef);
    if (codeSnap.exists()) return alert('Code already used!');
    // Add user to code
    await setDoc(codeRef, { username, team });
    // Add user to team (không giới hạn số lượng)
    const teamRef = doc(db, "chess_teams", team);
    let teamSnap = await getDoc(teamRef);
    let members = teamSnap.exists() ? teamSnap.data().members || [] : [];
    members.push({ username, code });
    await setDoc(teamRef, { members }, { merge: true });
    document.getElementById('team-info').textContent = `You are in team: ${team}`;
    await showLeaderboard();
    // Auto pair khi có ít nhất 2 người và đã bắt đầu sự kiện
    const allPlayers = await getAllPlayers();
    if (allPlayers.length >= 2 && eventStarted) {
        await createRandomPairs();
    }
};

// --- Leaderboard tabs ---
let currentTab = 'week';
document.getElementById('tab-week').onclick = () => { currentTab = 'week'; showLeaderboard(); setActiveTab('tab-week'); };
document.getElementById('tab-month').onclick = () => { currentTab = 'month'; showLeaderboard(); setActiveTab('tab-month'); };
document.getElementById('tab-year').onclick = () => { currentTab = 'year'; showLeaderboard(); setActiveTab('tab-year'); };
function setActiveTab(id) {
    for (let t of ['tab-week','tab-month','tab-year']) {
        document.getElementById(t).classList.remove('active');
    }
    document.getElementById(id).classList.add('active');
}

// --- Show leaderboard (sorted, no member count) ---
async function showLeaderboard() {
    let teamsData = [];
    for (let team of TEAMS) {
        const teamRef = doc(db, "chess_teams", team);
        const teamSnap = await getDoc(teamRef);
        const points = (teamSnap.exists() && teamSnap.data().points && teamSnap.data().points[currentTab]) || 0;
        teamsData.push({ team, points });
    }
    // Sort by points descending
    teamsData.sort((a, b) => b.points - a.points);

    let html = `<h3>Leaderboard (${currentTab})</h3><ol>`;
    for (let t of teamsData) {
        html += `<li>${t.team}: <b>${t.points} pts</b></li>`;
    }
    html += '</ol>';
    const leaderboardDiv = document.getElementById('leaderboard-section');
    if (leaderboardDiv) leaderboardDiv.innerHTML = html;
}

// --- Get all players ---
async function getAllPlayers() {
    let players = [];
    for (let team of TEAMS) {
        const teamRef = doc(db, "chess_teams", team);
        const teamSnap = await getDoc(teamRef);
        const members = teamSnap.exists() ? teamSnap.data().members || [] : [];
        for (let m of members) players.push({ ...m, team });
    }
    return players;
}

// --- Get username from code ---
async function getUsernameByCode(code) {
    const userRef = doc(db, "users", code);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data().username;
    }
    return code;
}

// --- Create random pairs and save to Firestore ---
async function createRandomPairs() {
    const players = await getAllPlayers();
    // Shuffle
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }
    // Pair up (nếu lẻ thì người cuối không có cặp)
    const pairs = [];
    for (let i = 0; i < players.length - 1; i += 2) {
        pairs.push([players[i], players[i + 1]]);
    }
    await setDoc(doc(db, "chess_event", "pairs"), { pairs });
    await showPairs(pairs);
}

// --- Show pairs and match start button (ngay khi eventStarted=true) ---
async function showPairs(pairs) {
    let html = '<h3>Match pairs:</h3><ul>';
    for (let idx = 0; idx < pairs.length; idx++) {
        const pair = pairs[idx];
        const nameA = await getUsernameByCode(pair[0].code);
        const nameB = await getUsernameByCode(pair[1].code);
        html += `<li>${nameA} (${pair[0].team}) vs ${nameB} (${pair[1].team})`;
        html += ` <button class="pair-btn" onclick="startMatch('${pair[0].code}','${pair[1].code}','${nameA}','${nameB}')">Start</button>`;
        html += `</li>`;
    }
    html += '</ul>';
    document.getElementById('match-area').innerHTML = html;
}

// --- Show pairs from DB (dùng khi eventStarted) ---
function showPairsFromDB() {
    getDoc(doc(db, "chess_event", "pairs")).then(snap => {
        if (snap.exists()) showPairs(snap.data().pairs);
    });
}

// --- Match logic with 90s timer ---
window.startMatch = function(codeA, codeB, nameA, nameB) {
    document.getElementById('match-area').innerHTML = `<div id="timer"></div>
    <button onclick="simulateMove('A')">${nameA} Move</button>
    <button onclick="simulateMove('B')">${nameB} Move</button>`;
    startTurn('A', codeA, codeB, nameA, nameB);
};

let turnTimeout = null;
let currentTurn = null;
let turnTime = 90;
let codeA = '', codeB = '', nameA = '', nameB = '';
let timeLeft = turnTime;

function startTurn(turn, cA, cB, nA, nB) {
    currentTurn = turn;
    codeA = cA; codeB = cB; nameA = nA; nameB = nB;
    timeLeft = turnTime;
    updateTimerDisplay(timeLeft, turn);
    if (turnTimeout) clearInterval(turnTimeout);
    turnTimeout = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft, turn);
        if (timeLeft <= 0) {
            clearInterval(turnTimeout);
            document.getElementById('timer').textContent = `Time out! ${turn === 'A' ? nameA : nameB} loses.`;
            // Here you can update Firestore for result and points
        }
    }, 1000);
}

function updateTimerDisplay(timeLeft, turn) {
    document.getElementById('timer').textContent = `Turn: ${turn === 'A' ? nameA : nameB}, time left: ${timeLeft}s`;
}

window.simulateMove = function(who) {
    if (who !== currentTurn) return;
    clearInterval(turnTimeout);
    document.getElementById('timer').textContent = `Player ${who === 'A' ? nameA : nameB} moved, switching turn.`;
    setTimeout(() => {
        startTurn(who === 'A' ? 'B' : 'A', codeA, codeB, nameA, nameB);
    }, 1000);
};

// --- Always update leaderboard on change ---
for (let team of TEAMS) {
    onSnapshot(doc(db, "chess_teams", team), async () => {
        await showLeaderboard();
    });
}

// --- Listen for pairs and show them ---
onSnapshot(doc(db, "chess_event", "pairs"), (snap) => {
    if (snap.exists() && eventStarted) showPairs(snap.data().pairs);
});

// --- Initial render after DOM loaded ---
document.addEventListener('DOMContentLoaded', () => {
    showLeaderboard();
});