import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHGpG3Bntw1QsYou1v5tXS2OY4JZHE4P4",
  authDomain: "xogame-2396f.firebaseapp.com",
  projectId: "xogame-2396f",
  storageBucket: "xogame-2396f.firebasestorage.app",
  messagingSenderId: "928029596000",
  appId: "1:928029596000:web:05d800db8c3dcdd00ce605",
  measurementId: "G-7CPDYF20F6"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let username = localStorage.getItem('username') || '';
if (!username) username = prompt("Enter your name:");
document.getElementById('user-info').textContent = `User: ${username}`;

const PROVE_WORDS = [
  { word: "BLOCKCHAIN", hint: "A distributed ledger technology" },
  { word: "PROOF", hint: "A cryptographic demonstration" },
  { word: "ZERO", hint: "The number representing nothing" },
  { word: "KNOWLEDGE", hint: "Awareness or understanding" },
  { word: "VALIDITY", hint: "The state of being logically correct" },
  { word: "SNARK", hint: "Succinct Non-interactive ARgument of Knowledge" },
  { word: "STARK", hint: "Scalable Transparent ARgument of Knowledge" },
  { word: "ROLLUP", hint: "A layer 2 scaling solution" },
  { word: "ETHEREUM", hint: "A popular smart contract blockchain" },
  { word: "HASH", hint: "A function that maps data to fixed size" },
  { word: "MERKLE", hint: "A tree structure for efficient proofs" },
  { word: "TREE", hint: "A hierarchical data structure" },
  { word: "CIRCUIT", hint: "A computational model for proofs" },
  { word: "PROVER", hint: "The party that generates a proof" },
  { word: "VERIFIER", hint: "The party that checks a proof" },
  { word: "WITNESS", hint: "The secret input to a proof" },
  { word: "PUBLIC", hint: "Openly accessible or known" },
  { word: "PRIVATE", hint: "Not publicly known" },
  { word: "COMMITMENT", hint: "A cryptographic promise" },
  { word: "OPENING", hint: "Revealing a commitment" },
  { word: "NONCE", hint: "A number used once" },
  { word: "FIELD", hint: "A mathematical set for arithmetic" },
  { word: "CURVE", hint: "A mathematical object in cryptography" },
  { word: "ELLIPTIC", hint: "Type of curve used in crypto" },
  { word: "SIGNATURE", hint: "A cryptographic attestation" },
  { word: "KEY", hint: "Used for encryption or signing" },
  { word: "PUBLICKEY", hint: "Shared encryption key" },
  { word: "PRIVATEKEY", hint: "Secret encryption key" },
  { word: "HASHCHAIN", hint: "A sequence of hashes" },
  { word: "LAMBDA", hint: "A Greek letter, often used for parameters" },
  { word: "ALGORITHM", hint: "A step-by-step computational procedure" },
  { word: "FUNCTION", hint: "A relation from inputs to outputs" },
  { word: "INPUT", hint: "Data fed into a function" },
  { word: "OUTPUT", hint: "Result from a function" },
  { word: "STATE", hint: "A snapshot of a system" },
  { word: "CONTRACT", hint: "A program on a blockchain" },
  { word: "TOKEN", hint: "A digital asset" },
  { word: "ADDRESS", hint: "A unique identifier on blockchain" },
  { word: "GAS", hint: "Fee for computation on Ethereum" },
  { word: "NODE", hint: "A participant in a network" },
  { word: "NETWORK", hint: "A collection of nodes" },
  { word: "CONSENSUS", hint: "Agreement among nodes" },
  { word: "FORK", hint: "A split in a blockchain" },
  { word: "GENESIS", hint: "The first block" },
  { word: "BLOCK", hint: "A batch of transactions" },
  { word: "TRANSACTION", hint: "A record of transfer" },
  { word: "SIGN", hint: "To create a signature" },
  { word: "VERIFY", hint: "To check correctness" },
  { word: "PROTOCOL", hint: "A set of rules" },
  { word: "LAYER", hint: "A level in a system" },
  { word: "BRIDGE", hint: "Connects two blockchains" },
  { word: "ORACLE", hint: "Provides external data" },
  { word: "SHARD", hint: "A partition of a database" },
  { word: "SCALE", hint: "To increase capacity" },
  { word: "OPTIMISTIC", hint: "Assuming honesty until proven otherwise" },
  { word: "FRAUD", hint: "Deception for gain" },
  { word: "PROOFCHAIN", hint: "A chain of proofs" },
  { word: "RECURSION", hint: "A function calling itself" },
  { word: "MODULAR", hint: "Composed of interchangeable parts" },
  { word: "ATTEST", hint: "To affirm to be correct" },
  { word: "INCLUSION", hint: "Being part of a set" },
  { word: "EXCLUSION", hint: "Being left out" },
  { word: "SYNCHRONIZE", hint: "To make simultaneous" },
  { word: "ASYNC", hint: "Not occurring at the same time" },
  { word: "DETERMINISTIC", hint: "Predictable, not random" },
  { word: "RANDOMNESS", hint: "Lack of pattern" },
  { word: "ENTROPY", hint: "A measure of uncertainty" },
  { word: "SECURITY", hint: "Protection from harm" },
  { word: "TRUSTLESS", hint: "No need to trust any party" }
];

let level = 0;
let answer = [];
let currentWord = '';
let currentHint = '';
let shuffled = [];
let usedIdx = [];
let correct = 0;
let mistakes = 0;
let startTimes = [];
let finishTimes = [];

function cleanArray(arr, fillValue = '') {
    if (!Array.isArray(arr)) return [];
    return arr.map(x => (x === undefined ? fillValue : x));
}

async function loadProgress() {
    const ref = doc(db, "prove_progress", username);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const d = snap.data();
        level = d.level || 0;
        answer = d.answer || [];
        usedIdx = d.usedIdx || [];
        correct = d.correct || 0;
        mistakes = d.mistakes || 0;
        startTimes = d.startTimes || [];
        finishTimes = d.finishTimes || [];
    } else {
        level = 0;
        answer = [];
        usedIdx = [];
        correct = 0;
        mistakes = 0;
        startTimes = [];
        finishTimes = [];
        await setDoc(ref, { level, answer, usedIdx, correct, mistakes, startTimes, finishTimes });
    }
    loadLevel();
}

function shuffle(arr) {
    let a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function loadLevel() {
    if (level >= PROVE_WORDS.length) {
        document.getElementById('prove-hint').textContent = "🎉 You have completed all words!";
        document.getElementById('prove-board').innerHTML = '';
        document.getElementById('prove-submit').style.display = 'none';
        document.getElementById('prove-letters').innerHTML = '';
        document.getElementById('prove-undo').style.display = 'none';
        renderLeaderboard();
        return;
    }
    currentWord = PROVE_WORDS[level].word.toUpperCase();
    currentHint = PROVE_WORDS[level].hint;
    if (!answer || answer.length !== currentWord.length) answer = Array(currentWord.length).fill('');
    // Add 3 random extra letters not in the answer
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let extra = [];
    while (extra.length < 3) {
        let ch = alphabet[Math.floor(Math.random() * 26)];
        if (!currentWord.includes(ch)) extra.push(ch);
    }
    shuffled = shuffle(currentWord.split("").concat(extra));
    if (!usedIdx || usedIdx.length !== shuffled.length) usedIdx = Array(shuffled.length).fill(false);

    // Record start time for this word
    if (startTimes.length < level + 1) {
        startTimes[level] = Date.now();
        finishTimes[level] = null;
    }

    document.getElementById('prove-hint').textContent = `Hint: ${currentHint}`;
    document.getElementById('prove-submit').style.display = '';
    document.getElementById('prove-undo').style.display = '';
    renderBoard();
    renderLetters();
    renderLeaderboard();
}

function renderBoard() {
    const boardDiv = document.getElementById('prove-board');
    boardDiv.innerHTML = '';
    boardDiv.style.display = 'flex';
    boardDiv.style.justifyContent = 'center';
    for (let i = 0; i < currentWord.length; i++) {
        const input = document.createElement('input');
        input.maxLength = 1;
        input.value = answer[i] || '';
        input.dataset.idx = i;
        input.disabled = true;
        input.className = 'prove-answer-cell';
        input.style.width = '36px';
        input.style.height = '36px';
        input.style.margin = '0 2px';
        input.style.textAlign = 'center';
        input.style.fontSize = '1.2rem';
        input.style.borderRadius = '6px';
        input.style.border = '1.5px solid #a21272';
        input.style.background = answer[i] ? '#ff54d7' : '#fff';
        input.style.color = answer[i] ? '#fff' : '#a21272';
        boardDiv.appendChild(input);
    }
}

function renderLetters() {
    let letterDiv = document.getElementById('prove-letters');
    if (!letterDiv) {
        letterDiv = document.createElement('div');
        letterDiv.id = 'prove-letters';
        letterDiv.style.textAlign = 'center';
        letterDiv.style.margin = '16px 0';
        document.getElementById('prove-board').after(letterDiv);
    }
    letterDiv.innerHTML = '';
    shuffled.forEach((ch, idx) => {
        const btn = document.createElement('button');
        btn.textContent = ch;
        btn.disabled = usedIdx[idx];
        btn.style.margin = '0 6px 6px 0';
        btn.style.fontSize = '1.2rem';
        btn.style.width = '36px';
        btn.style.height = '36px';
        btn.style.borderRadius = '6px';
        btn.style.background = usedIdx[idx] ? '#eee' : '#ff54d7';
        btn.style.color = usedIdx[idx] ? '#aaa' : '#fff';
        btn.style.border = '1.5px solid #a21272';
        btn.style.cursor = usedIdx[idx] ? 'not-allowed' : 'pointer';
        btn.onclick = () => {
            for (let k = 0; k < currentWord.length; k++) {
                if (!answer[k]) {
                    answer[k] = ch;
                    usedIdx[idx] = true;
                    break;
                }
            }
            renderBoard();
            renderLetters();
        };
        letterDiv.appendChild(btn);
    });
}

function undoLast() {
    for (let i = currentWord.length - 1; i >= 0; i--) {
        if (answer[i]) {
            for (let k = 0; k < shuffled.length; k++) {
                if (shuffled[k] === answer[i] && usedIdx[k]) {
                    usedIdx[k] = false;
                    break;
                }
            }
            answer[i] = '';
            break;
        }
    }
    renderBoard();
    renderLetters();
}

document.getElementById('prove-submit').onclick = async () => {
    let ok = true;
    for (let k = 0; k < currentWord.length; k++) {
        if ((answer[k] || '').toUpperCase() !== currentWord[k]) ok = false;
    }
    finishTimes[level] = Date.now();
    if (ok) {
        alert("🎉 Correct!");
        correct++;
    } else {
        alert("Wrong! The correct answer is: " + currentWord);
        mistakes++;
    }
    level++;
    answer = [];
    usedIdx = [];
    // Calculate avgTime if finished all
    let avgTime = null;
    if (level >= PROVE_WORDS.length && correct === 66) {
        let total = 0, count = 0;
        for (let i = 0; i < 66; i++) {
            if (startTimes[i] && finishTimes[i]) {
                total += (finishTimes[i] - startTimes[i]);
                count++;
            }
        }
        avgTime = count ? Math.round(total / count) : null;
    }
    await setDoc(doc(db, "prove_leaderboard", username), {
        correct,
        mistakes,
        completedAt: (level >= PROVE_WORDS.length ? Date.now() : null),
        avgTime
    });
    await setDoc(doc(db, "prove_progress", username), {
        level,
        answer: cleanArray(answer, ''),
        usedIdx: cleanArray(usedIdx, false),
        correct,
        mistakes,
        startTimes: cleanArray(startTimes, 0),
        finishTimes: cleanArray(finishTimes, 0)
    });
    loadLevel();
};

document.getElementById('prove-undo').onclick = () => {
    undoLast();
};

window.onbeforeunload = async () => {
    await setDoc(doc(db, "prove_progress", username), {
        level,
        answer: cleanArray(answer, ''),
        usedIdx: cleanArray(usedIdx, false),
        correct,
        mistakes,
        startTimes: cleanArray(startTimes, 0),
        finishTimes: cleanArray(finishTimes, 0)
    });
};

async function renderLeaderboard() {
    const q = query(
        collection(db, "prove_leaderboard"),
        orderBy("correct", "desc"),
        orderBy("mistakes", "asc"),
        orderBy("avgTime", "asc"),
        orderBy("completedAt", "asc"),
        limit(10)
    );
    const snap = await getDocs(q);
    let html = `<h3 style="text-align:center;color:#a21272;">🏆 Leaderboard</h3>
    <table style="width:100%;border-collapse:collapse;text-align:center;">
      <tr style="background:#ff54d7;color:#fff;">
        <th>Rank</th><th>User</th><th>Correct</th><th>Wrong</th><th>Finished</th><th>Avg Time</th>
      </tr>`;
    let rank = 1;
    let topAllCorrect = [];
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.correct === 66) topAllCorrect.push({ ...d, username: docSnap.id });
    });
    snap.forEach(docSnap => {
        const d = docSnap.data();
        let avgTimeStr = '';
        if (d.correct === 66 && d.avgTime) {
            let sec = Math.round(d.avgTime / 1000);
            avgTimeStr = sec + 's';
        } else {
            avgTimeStr = '—';
        }
        html += `<tr style="background:${rank%2==0?'#f9f9f9':'#fff'};color:#222;">
          <td>${rank}</td>
          <td>${docSnap.id}</td>
          <td>${d.correct||0}/66</td>
          <td>${d.mistakes||0}</td>
          <td>${d.correct==66 ? (d.completedAt ? new Date(d.completedAt).toLocaleString() : '✓') : ''}</td>
          <td>${avgTimeStr}</td>
        </tr>`;
        rank++;
    });
    if (topAllCorrect.length >= 2) {
        topAllCorrect.sort((a, b) => (a.avgTime||9999999) - (b.avgTime||9999999));
        html += `<tr><td colspan="6" style="text-align:center;color:#a21272;font-size:0.95em;">Top 66/66 sorted by average time</td></tr>`;
        topAllCorrect.forEach((d, idx) => {
            let sec = d.avgTime ? Math.round(d.avgTime / 1000) : '';
            html += `<tr style="background:#e0f7fa;color:#222;">
                <td>${idx+1}</td>
                <td>${d.username}</td>
                <td>66/66</td>
                <td>${d.mistakes||0}</td>
                <td>${d.completedAt ? new Date(d.completedAt).toLocaleString() : '✓'}</td>
                <td>${sec}s</td>
            </tr>`;
        });
    }
    html += '</table>';
    document.getElementById('prove-leaderboard').innerHTML = html;
}

loadProgress();
renderLeaderboard();