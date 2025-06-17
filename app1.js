// --- Apply theme from localStorage ---
function applyTheme(theme) {
    document.body.classList.remove('theme-pink', 'theme-blue', 'theme-green', 'theme-orange', 'theme-purple');
    document.body.classList.add('theme-' + theme);
}
const savedTheme = localStorage.getItem('theme') || 'blue';
applyTheme(savedTheme);
// --- end theme ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY1,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN1,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID1,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET1,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID1,
  appId: import.meta.env.VITE_FIREBASE_APP_ID1,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID1
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let username = localStorage.getItem('username') || '';
let userData = { prove: 0, games: 0, wins: 0 };

function calcWinrate(games, wins) {
    if (!games) return '0.0%';
    return ((wins / games) * 100).toFixed(1) + '%';
}

function updateUserInfo() {
    document.getElementById('user-info').textContent =
        `User: ${username || ''} | Prove: ${userData.prove} | Games: ${userData.games} | Wins: ${userData.wins} | Winrate: ${calcWinrate(userData.games, userData.wins)}`;
}

async function loginOrCreateUser(username) {
    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        await setDoc(userRef, { prove: 66, games: 0, wins: 0 });
        userData = { prove: 66, games: 0, wins: 0 };
    } else {
        const d = userSnap.data();
        userData = {
            prove: +(d.prove || 0),
            games: +(d.games || 0),
            wins: +(d.wins || 0)
        };
    }
    updateUserInfo();
}

async function updateProveOnJoin(username) {
    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        let p = userSnap.data().prove || 0;
        if (p < 0.1) {
            alert("You don't have enough prove to join!");
            return false;
        }
        await updateDoc(userRef, { prove: +(p - 0.1).toFixed(2) });
        userData.prove = +(p - 0.1).toFixed(2);
        updateUserInfo();
        return true;
    }
    return false;
}

// Add prove, games, wins when win
async function updateProveOnWin(username) {
    const userRef = doc(db, "users", username);
    await updateDoc(userRef, {
        prove: increment(0.2),
        games: increment(1),
        wins: increment(1)
    });
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const d = userSnap.data();
        userData.prove = +(d.prove || 0);
        userData.games = +(d.games || 0);
        userData.wins = +(d.wins || 0);
        updateUserInfo();
    }
}

// Add games when draw/lose
async function updateGamesOnDrawOrLose(username) {
    const userRef = doc(db, "users", username);
    await updateDoc(userRef, { games: increment(1) });
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const d = userSnap.data();
        userData.prove = +(d.prove || 0);
        userData.games = +(d.games || 0);
        userData.wins = +(d.wins || 0);
        updateUserInfo();
    }
}

// ======= Chess =======
const PIECES = {
  r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
  R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔', P: '♙'
};
const EMPTY_CHESS = [
  'r','n','b','q','k','b','n','r',
  'p','p','p','p','p','p','p','p',
  '','','','','','','','',
  '','','','','','','','',
  '','','','','','','','',
  '','','','','','','','',
  'P','P','P','P','P','P','P','P',
  'R','N','B','Q','K','B','N','R'
];
function getBoard2D(board1D) {
    let board2D = [];
    for (let i = 0; i < 8; i++) {
        board2D.push(board1D.slice(i*8, i*8+8));
    }
    return board2D;
}
let chessMatchId = '';
let myColor = '';
let chessUnsub = null;
let chessMatchData = null;
let selected = null;

// Timer logic
let turnTimeout = null;
let turnTime = 90;
let timeLeft = turnTime;

function startTurnTimer() {
    clearInterval(turnTimeout);
    timeLeft = turnTime;
    updateTimerDisplay();
    turnTimeout = setInterval(async () => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(turnTimeout);
            document.getElementById('timer').textContent = 'Time out! You lose this turn.';
            // Lose: update match status
            if (chessMatchData && chessMatchData.status === 'playing') {
                await updateDoc(doc(db, "chess_matches", chessMatchId), {
                    status: 'finished',
                    winner: myColor === 'white' ? 'black' : 'white'
                });
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerDiv = document.getElementById('timer');
    if (timerDiv && chessMatchData && chessMatchData.status === 'playing' && chessMatchData.turn === myColor) {
        timerDiv.textContent = `Time left: ${timeLeft}s`;
    } else if (timerDiv) {
        timerDiv.textContent = '';
    }
}

async function createChessMatch() {
    if (!(await updateProveOnJoin(username))) return;
    chessMatchId = Math.random().toString(36).slice(2, 8);
    await setDoc(doc(db, "chess_matches", chessMatchId), {
        board: EMPTY_CHESS,
        turn: 'white',
        playerWhite: username,
        playerBlack: '',
        status: 'waiting',
        winner: ''
    });
    myColor = 'white';
    listenChessMatch();
    document.getElementById('chess-matchid').value = chessMatchId;
}
async function joinChessMatch() {
    chessMatchId = document.getElementById('chess-matchid').value.trim();
    if (!chessMatchId) return alert('Please enter the ID!');
    if (!(await updateProveOnJoin(username))) return;
    const ref = doc(db, "chess_matches", chessMatchId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert('Room does not exist!');
    const data = snap.data();
    if (data.playerBlack && data.playerWhite !== username && data.playerBlack !== username)
        return alert('Room is full!');
    if (!data.playerBlack && data.playerWhite !== username) {
        await updateDoc(ref, { playerBlack: username, status: 'playing' });
        myColor = 'black';
    } else if (data.playerWhite === username) {
        myColor = 'white';
    } else if (data.playerBlack === username) {
        myColor = 'black';
    }
    listenChessMatch();
}
function listenChessMatch() {
    if (chessUnsub) chessUnsub();
    chessUnsub = onSnapshot(doc(db, "chess_matches", chessMatchId), (snap) => {
        if (!snap.exists()) return;
        chessMatchData = snap.data();
        renderChessboard();
        if (chessMatchData.status === 'waiting') {
            document.getElementById('chess-status').textContent = 'Waiting for opponent...';
            clearInterval(turnTimeout);
            updateTimerDisplay();
        } else if (chessMatchData.status === 'finished') {
            clearInterval(turnTimeout);
            updateTimerDisplay();
            if (chessMatchData.winner === myColor) {
                document.getElementById('chess-status').textContent = 'You win!';
                updateProveOnWin(username);
            } else if (chessMatchData.winner) {
                document.getElementById('chess-status').textContent = 'You lose!';
                updateGamesOnDrawOrLose(username);
            } else {
                document.getElementById('chess-status').textContent = 'Draw!';
                updateGamesOnDrawOrLose(username);
            }
        } else {
            document.getElementById('chess-status').textContent =
                (chessMatchData.turn === myColor ? 'Your turn' : "Opponent's turn");
            // Timer only runs on your turn
            if (chessMatchData.turn === myColor) {
                startTurnTimer();
            } else {
                clearInterval(turnTimeout);
                updateTimerDisplay();
            }
        }
    });
}
function renderChessboard() {
    if (!chessMatchData) return;
    let board2D = getBoard2D(chessMatchData.board);
    let displayBoard = board2D;
    if (myColor === 'black') {
        displayBoard = board2D.slice().reverse().map(row => row.slice().reverse());
    }
    let html = '<table>';
    for(let i=0;i<8;i++) {
        html += '<tr>';
        for(let j=0;j<8;j++) {
            let realI = myColor === 'black' ? 7 - i : i;
            let realJ = myColor === 'black' ? 7 - j : j;
            let color = (realI+realJ)%2==0 ? '#f0d9b5' : '#b58863';
            let highlight = selected && selected[0]===realI && selected[1]===realJ ? 'selected' : '';
            let piece = displayBoard[i][j];
            let pieceClass = '';
            if (piece) {
                pieceClass = (piece === piece.toUpperCase()) ? 'white-piece' : 'black-piece';
            }
            html += `<td class="${highlight} ${pieceClass}" style="background:${color};" onclick="selectCell(${realI},${realJ})">` +
                (piece ? PIECES[piece] : '') + '</td>';
        }
        html += '</tr>';
    }
    html += '</table>';
    document.getElementById('chessboard').innerHTML = html;
}

function showPromotionModal(isWhite, callback) {
    const modal = document.getElementById('promotion-modal');
    const choices = document.getElementById('promotion-choices');
    choices.innerHTML = '';
    const pieces = isWhite ? ['Q','R','B','N'] : ['q','r','b','n'];
    pieces.forEach(p => {
        const btn = document.createElement('button');
        btn.textContent = PIECES[p];
        btn.onclick = () => {
            modal.style.display = 'none';
            callback(p);
        };
        choices.appendChild(btn);
    });
    modal.style.display = 'flex';
}

window.selectCell = async function(i, j) {
    if (!chessMatchData || chessMatchData.status !== 'playing') return;
    if (chessMatchData.turn !== myColor) return;
    let board2D = getBoard2D(chessMatchData.board);
    if (selected) {
        let [fx, fy] = selected, [tx, ty] = [i, j];
        let piece = board2D[fx][fy];
        let isPawn = piece.toLowerCase() === 'p';
        let isFirstMove = false;
        if (isPawn) {
            isFirstMove = (piece === 'P' && fx === 6) || (piece === 'p' && fx === 1);
        }
        if (isValidMove(board2D, [fx, fy], [tx, ty], myColor, isFirstMove)) {
            let newBoard = chessMatchData.board.slice();
            clearInterval(turnTimeout); // Stop timer after move
            if (isPawn && ((piece === 'P' && tx === 0) || (piece === 'p' && tx === 7))) {
                showPromotionModal(piece === 'P', async (promoteTo) => {
                    newBoard[tx*8 + ty] = promoteTo;
                    newBoard[fx*8 + fy] = '';
                    let winner = '';
                    if (!newBoard.includes('k')) winner = 'white';
                    if (!newBoard.includes('K')) winner = 'black';
                    await updateDoc(doc(db, "chess_matches", chessMatchId), {
                        board: newBoard,
                        turn: winner ? '' : (myColor === 'white' ? 'black' : 'white'),
                        status: winner ? 'finished' : 'playing',
                        winner: winner
                    });
                });
            } else {
                newBoard[tx*8 + ty] = piece;
                newBoard[fx*8 + fy] = '';
                let winner = '';
                if (!newBoard.includes('k')) winner = 'white';
                if (!newBoard.includes('K')) winner = 'black';
                await updateDoc(doc(db, "chess_matches", chessMatchId), {
                    board: newBoard,
                    turn: winner ? '' : (myColor === 'white' ? 'black' : 'white'),
                    status: winner ? 'finished' : 'playing',
                    winner: winner
                });
            }
        }
        selected = null;
        renderChessboard();
    } else if (board2D[i][j]) {
        if (myColor === 'white' && board2D[i][j] === board2D[i][j].toUpperCase() ||
            myColor === 'black' && board2D[i][j] === board2D[i][j].toLowerCase()) {
            selected = [i, j];
            renderChessboard();
        }
    }
};

// Check path clear (for rook, bishop, queen)
function isPathClear(board, from, to) {
    const [fx, fy] = from, [tx, ty] = to;
    const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy);
    let x = fx + dx, y = fy + dy;
    while (x !== tx || y !== ty) {
        if (board[x][y]) return false;
        x += dx; y += dy;
    }
    return true;
}

function isValidMove(board, from, to, turnColor, isFirstMove) {
    const [fx, fy] = from, [tx, ty] = to;
    if (fx === tx && fy === ty) return false;
    const piece = board[fx][fy];
    if (!piece) return false;
    const isWhite = piece === piece.toUpperCase();
    if ((turnColor === 'white' && !isWhite) || (turnColor === 'black' && isWhite)) return false;
    const dx = tx - fx, dy = ty - fy;
    const target = board[tx][ty];
    // Can't capture own piece
    if (target && ((isWhite && target === target.toUpperCase()) || (!isWhite && target === target.toLowerCase()))) return false;

    switch (piece.toLowerCase()) {
        case 'p': { // Pawn
            let dir = isWhite ? -1 : 1;
            if (dy === 0 && !target) {
                if (dx === dir) return true;
                if (isFirstMove && dx === 2*dir && !board[fx+dir][fy]) return true;
            }
            // Capture diagonally
            if (Math.abs(dy) === 1 && dx === dir && target) return true;
            return false;
        }
        case 'r': // Rook
            if (dx !== 0 && dy !== 0) return false;
            return isPathClear(board, from, to);
        case 'n': // Knight
            return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
        case 'b': // Bishop
            if (Math.abs(dx) !== Math.abs(dy)) return false;
            return isPathClear(board, from, to);
        case 'q': // Queen
            if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
                return isPathClear(board, from, to);
            }
            return false;
        case 'k': // King
            return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
        default: return false;
    }
}

// Change corner image every 1.1s
const gpuImages = [
    'gpu-pink.png',
    'gpu-blue.png',
    'gpu-green.png',
    'gpu-orange.png',
    'gpu-purple.png'
];
setInterval(() => {
    const img = document.getElementById('corner-theme-img');
    if (!img) return;
    const randomIndex = Math.floor(Math.random() * gpuImages.length);
    img.src = gpuImages[randomIndex];
}, 1111);

// Ensure DOM is ready before binding events
document.addEventListener('DOMContentLoaded', async () => {
    if (!username) {
        username = prompt("Enter your name:");
        if (!username) return;
        localStorage.setItem('username', username);
    }
    await loginOrCreateUser(username);
   updateUserInfo();
    const btnCreate = document.getElementById('chess-create');
    const btnJoin = document.getElementById('chess-join');
    if (btnCreate) btnCreate.onclick = createChessMatch;
    if (btnJoin) btnJoin.onclick = joinChessMatch;
});