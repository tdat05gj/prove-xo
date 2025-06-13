

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5gM3sNfJnR88EilMA5EBG8qdxt5NSOjQ",
  authDomain: "chess-9bfbb.firebaseapp.com",
  projectId: "chess-9bfbb",
  storageBucket: "chess-9bfbb.firebasestorage.app",
  messagingSenderId: "296757639984",
  appId: "1:296757639984:web:6a8933a6066222891be6f5",
  measurementId: "G-22T10D2S36"
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
            alert("erorr!");
            return false;
        }
        await updateDoc(userRef, { prove: +(p - 0.1).toFixed(2) });
        userData.prove = +(p - 0.1).toFixed(2);
        updateUserInfo();
        return true;
    }
    return false;
}

// Cộng prove, games, wins khi thắng
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

// Cộng games khi hòa/thua
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


document.addEventListener('DOMContentLoaded', () => {
    const btnXO = document.getElementById('menu-xo');
    if (btnXO) btnXO.onclick = () => {
        window.location.href = 'index.html';
    };
});

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
        return alert('Full!');
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
        } else if (chessMatchData.status === 'finished') {
            if (chessMatchData.winner === myColor) {
                document.getElementById('chess-status').textContent = 'You win!';
                updateProveOnWin(username);
            } else if (chessMatchData.winner) {
                document.getElementById('chess-status').textContent = 'You lose!';
                updateGamesOnDrawOrLose(username);
            } else {
                document.getElementById('chess-status').textContent = 'No one!';
                updateGamesOnDrawOrLose(username);
            }
        } else {
            document.getElementById('chess-status').textContent =
                (chessMatchData.turn === myColor ? 'Your turn' : 'opponents turn') +
                ` ${myColor === '' ? '' : ''}`;
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
window.selectCell = async function(i,j) {
    if (!chessMatchData || chessMatchData.status !== 'playing') return;
    if (chessMatchData.turn !== myColor) return;
    let board2D = getBoard2D(chessMatchData.board);
    if (selected) {
        let piece = board2D[selected[0]][selected[1]];
        if (myColor === 'white' && piece === piece.toUpperCase() ||
            myColor === 'black' && piece === piece.toLowerCase()) {
            let target = board2D[i][j];
            if (!target || (myColor === 'white' && target === target.toLowerCase()) || (myColor === 'black' && target === target.toUpperCase())) {
                let newBoard = chessMatchData.board.slice();
                newBoard[i*8 + j] = piece;
                newBoard[selected[0]*8 + selected[1]] = '';
                
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
            selected = [i,j];
            renderChessboard();
        }
    }
};


document.addEventListener('DOMContentLoaded', async () => {
    if (!username) {
        username = prompt("Nhập tên của bạn:");
        if (!username) return;
        localStorage.setItem('username', username);
    }
    await loginOrCreateUser(username);
    updateUserInfo();
    document.getElementById('chess-create').onclick = createChessMatch;
    document.getElementById('chess-join').onclick = joinChessMatch;
});
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