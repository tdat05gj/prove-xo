const boardDiv = document.getElementById('board');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset');
const findMatchBtn = document.getElementById('find-match');
const availableMatchesDiv = document.getElementById('available-matches');
const gameArea = document.getElementById('game-area');
const loginArea = document.getElementById('login-area');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username');
const userInfoDiv = document.getElementById('user-info');
const leaveRoomBtn = document.getElementById('leave-room');
const themeSelect = document.getElementById('theme-select');

const BOARD_SIZE = 16;
let userId = null;
let username = '';
let prove = 0;
let matchId = null;
let matchData = null;
let unsubscribeMatch = null;
let mySymbol = null;
let theme = 'blue';
let totalGames = 0;
let totalWins = 0;


let turnTimer = null;
let turnTimeLeft = 33;
const TURN_TIME_LIMIT = 33;


let unsubscribeMatches = null;
function startListenMatches() {
    if (unsubscribeMatches) unsubscribeMatches();
    unsubscribeMatches = listenMatches(showAvailableMatches);
}

themeSelect.onchange = () => {
    theme = themeSelect.value;
    applyTheme(theme);
};

function applyTheme(theme) {
    document.body.classList.remove('theme-pink', 'theme-blue', 'theme-green', 'theme-orange', 'theme-purple');
    document.body.classList.add('theme-' + theme);
}


function showBoardImage() {
    boardDiv.innerHTML = `
       <div class="board1">
            <img src="image.png" alt="Board Background" class="board-image">
        </div>
    `;
}

window.onload = async () => {
    const savedTheme = localStorage.getItem('theme');
    const savedUsername = localStorage.getItem('username');
    if (savedTheme) {
        theme = savedTheme;
        themeSelect.value = theme;
        applyTheme(theme);
    }
    if (savedUsername) {
        username = savedUsername;
        userId = username;
        let user = await getUserData(userId);
        if (user) {
            prove = user.prove;
            totalGames = user.totalGames || 0;
            totalWins = user.totalWins || 0;
            if (user.theme) theme = user.theme;
            applyTheme(theme);
            loginArea.style.display = 'none';
            gameArea.style.display = '';
            updateUserInfo();
            startListenMatches();
        }
    }
    updateUserInfo();
    showBoardImage();
};

usernameInput.oninput = () => {
    loginBtn.disabled = !usernameInput.value.trim();
};

loginBtn.onclick = async () => {
    username = usernameInput.value.trim();
    userId = username;
    theme = themeSelect.value;

    
    const snapshot = await db.collection('users')
        .where('username', '==', username)
        .get();

    if (!snapshot.empty) {
        alert('Username already exists. Please choose another one!');
        return;
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('username', username);

    
    await saveUserData(userId, '', 66, theme, 0, 0, username);
    prove = 66;
    totalGames = 0;
    totalWins = 0;

    applyTheme(theme);
    loginArea.style.display = 'none';
    gameArea.style.display = '';
    updateUserInfo();
    startListenMatches();
    showBoardImage();
};

function updateUserInfo() {
    let winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0';
    userInfoDiv.textContent = `User: ${username} | Prove: ${prove} | Games: ${totalGames} | Wins: ${totalWins} | Winrate: ${winRate}%`;
}


function renderBoard(board) {
    boardDiv.innerHTML = '';
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (board[i]) cell.classList.add(board[i]);
        cell.textContent = board[i];
        cell.dataset.index = i;
        cell.onclick = () => handleCellClick(i);
        boardDiv.appendChild(cell);
    }
}

function handleCellClick(index) {
    if (!matchData || matchData.status !== 'playing') return;
    if (matchData.board[index] !== '') return;
    if (matchData.turn !== mySymbol) return;

    clearTurnTimer();

    matchData.board[index] = mySymbol;
    if (checkWin(matchData.board, mySymbol, index)) {
        statusDisplay.textContent = `You (${mySymbol}) win!`;
        db.collection('matches').doc(matchId).update({ board: matchData.board, status: 'finished', winner: mySymbol });
        handleWinLose(mySymbol === 'X');
    } else if (isDraw(matchData.board)) {
        statusDisplay.textContent = 'Draw!';
        db.collection('matches').doc(matchId).update({ board: matchData.board, status: 'finished', winner: null });
        handleDraw();
    } else {
        const nextTurn = mySymbol === 'X' ? 'O' : 'X';
        updateBoard(matchId, matchData.board, nextTurn);
    }
}


function checkWin(board, player, lastIndex) {
    const directions = [
        { dx: 1, dy: 0 },  
        { dx: 0, dy: 1 },   
        { dx: 1, dy: 1 },  
        { dx: 1, dy: -1 }   
    ];
    const row = Math.floor(lastIndex / BOARD_SIZE);
    const col = lastIndex % BOARD_SIZE;

    for (const {dx, dy} of directions) {
        let count = 1;
       
        let r = row + dy, c = col + dx;
        while (
            r >= 0 && r < BOARD_SIZE &&
            c >= 0 && c < BOARD_SIZE &&
            board[r * BOARD_SIZE + c] === player
        ) {
            count++;
            r += dy;
            c += dx;
        }
        
        r = row - dy;
        c = col - dx;
        while (
            r >= 0 && r < BOARD_SIZE &&
            c >= 0 && c < BOARD_SIZE &&
            board[r * BOARD_SIZE + c] === player
        ) {
            count++;
            r -= dy;
            c -= dx;
        }
        if (count >= 5) {
            return true;
        }
    }
    return false;
}

function isDraw(board) {
    return !board.includes('');
}


async function showAvailableMatches(matches) {
    availableMatchesDiv.innerHTML = '';
    
    const unique = {};
    for (const match of matches) {
        if (match.playerX !== userId && !unique[match.playerX]) {
            unique[match.playerX] = match;
        }
    }
    for (const match of Object.values(unique)) {
        let user = await getUserData(match.playerX);
        let displayName = user && user.username ? user.username : match.playerX;
        const btn = document.createElement('button');
        btn.textContent = `Join ${displayName}'s room`;
        btn.onclick = () => joinSelectedMatch(match.id);
        availableMatchesDiv.appendChild(btn);
    }
}

async function joinSelectedMatch(id) {
    if (!(await enterMatch())) return;
    await joinMatch(id, userId);
    matchId = id;
    mySymbol = 'O';
    renderBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(''));
    startGame();
}

function updateTurnTimerDisplay() {
    let timerDiv = document.getElementById('turn-timer');
    if (!timerDiv) return;
    timerDiv.textContent = `Time left: ${turnTimeLeft}s`;
    timerDiv.style.color = turnTimeLeft <= 5 ? '#f43f5e' : '#2563eb';
}

function startTurnTimer() {
    clearTurnTimer();
    turnTimeLeft = TURN_TIME_LIMIT;
    updateTurnTimerDisplay();
    turnTimer = setInterval(async () => {
        turnTimeLeft--;
        updateTurnTimerDisplay();
        if (turnTimeLeft <= 0) {
            clearTurnTimer();
            if (matchData && matchData.turn === mySymbol && matchData.status === 'playing') {
               
                const winnerSymbol = mySymbol === 'X' ? 'O' : 'X';
                await db.collection('matches').doc(matchId).update({ status: 'finished', winner: winnerSymbol });
            }
        }
    }, 1000);
}
function clearTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
    let timerDiv = document.getElementById('turn-timer');
    if (timerDiv) timerDiv.textContent = '';
}

function startGame() {
    findMatchBtn.style.display = 'none';
    availableMatchesDiv.style.display = 'none';
    leaveRoomBtn.style.display = '';
    if (unsubscribeMatch) unsubscribeMatch();
    unsubscribeMatch = listenMatch(matchId, data => {
        matchData = data;
        renderBoard(data.board);
        if (data.status === 'waiting') {
            statusDisplay.textContent = 'Waiting for opponent...';
            clearTurnTimer();
        } else if (data.status === 'playing') {
            statusDisplay.textContent = data.turn === mySymbol ? 'Your turn' : "Opponent's turn...";
            if (data.turn === mySymbol) {
                startTurnTimer();
            } else {
                clearTurnTimer();
            }
        } else if (data.status === 'finished') {
            clearTurnTimer();
            if (data.winner) {
                if (data.winner === mySymbol) {
                    statusDisplay.textContent = 'You win!';
                } else {
                    statusDisplay.textContent = 'You lose!';
                }
            } else if (isDraw(data.board)) {
                statusDisplay.textContent = 'Draw!';
            }
            setTimeout(() => {
                autoLeaveRoom();
            }, 2000);
        }
    });
}


findMatchBtn.onclick = async () => {
    
    const snapshot = await db.collection('matches')
        .where('playerX', '==', userId)
        .where('status', '==', 'waiting')
        .get();
    if (!snapshot.empty) {
        // Already have a room, rejoin it
        const doc = snapshot.docs[0];
        matchId = doc.id;
        mySymbol = 'X';
        renderBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(''));
        startGame();
        return;
    }
   
    const id = await createMatch(userId);
    matchId = id;
    mySymbol = 'X';
    renderBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(''));
    startGame();
};

resetButton && (resetButton.onclick = () => {
    if (matchId) resetMatch(matchId);
});

leaveRoomBtn.onclick = async () => {
    if (!matchId) return;
    let match = await db.collection('matches').doc(matchId).get();
    let data = match.data();
    if (mySymbol === 'O') {
        await db.collection('matches').doc(matchId).update({
            playerO: null,
            status: 'waiting'
        });
    } else if (mySymbol === 'X' && !data.playerO) {
        await db.collection('matches').doc(matchId).delete();
    }
    autoLeaveRoom();
};

function autoLeaveRoom() {
    matchId = null;
    mySymbol = null;
    leaveRoomBtn.style.display = 'none';
    if (unsubscribeMatch) unsubscribeMatch();
    findMatchBtn.style.display = '';
    availableMatchesDiv.style.display = '';
    statusDisplay.textContent = '';
    boardDiv.innerHTML = '';
    updateUserInfo();
    startListenMatches();
    showBoardImage();
}


async function enterMatch() {
    let userSnap = await db.collection('users').doc(userId).get();
    let user = userSnap.data() || {};
    if ((user.prove || 0) < 0.1) {
        alert('Not enough prove to join a match!');
        return false;
    }
    let newProve = +(user.prove - 0.1).toFixed(2);
    await saveUserData(userId, '', newProve, theme, user.totalGames || 0, user.totalWins || 0, username);
    prove = newProve;
    totalGames = user.totalGames || 0;
    totalWins = user.totalWins || 0;
    updateUserInfo();
    return true;
}


async function handleWinLose(isX) {
    let match = await db.collection('matches').doc(matchId).get();
    let data = match.data();
    let winnerId = isX ? data.playerX : data.playerO;
    let loserId = isX ? data.playerO : data.playerX;

   
    if (winnerId) {
        let winnerSnap = await db.collection('users').doc(winnerId).get();
        let winner = winnerSnap.data() || {};
        let newWins = (winner.totalWins || 0) + 1;
        let newGames = (winner.totalGames || 0) + 1;
        let newProve = +(winner.prove || 0) + 0.2;
        await saveUserData(
            winnerId,
            '',
            +newProve.toFixed(2),
            winner.theme || theme,
            newGames,
            newWins,
            winner.username || ''
        );
        if (winnerId === userId) {
            prove = +newProve.toFixed(2);
            totalWins = newWins;
            totalGames = newGames;
            updateUserInfo();
        }
    }

 
    if (loserId) {
        let loserSnap = await db.collection('users').doc(loserId).get();
        let loser = loserSnap.data() || {};
        let newGames = (loser.totalGames || 0) + 1;
        await saveUserData(
            loserId,
            '',
            loser.prove,
            loser.theme || theme,
            newGames,
            loser.totalWins || 0,
            loser.username || ''
        );
        if (loserId === userId) {
            totalGames = newGames;
            updateUserInfo();
        }
    }
}


async function handleDraw() {
    let match = await db.collection('matches').doc(matchId).get();
    let data = match.data();
    let playerXSnap = await db.collection('users').doc(data.playerX).get();
    let playerX = playerXSnap.data() || {};
    let newGamesX = (playerX.totalGames || 0) + 1;
    await saveUserData(
        data.playerX,
        '',
        playerX.prove,
        playerX.theme || theme,
        newGamesX,
        playerX.totalWins || 0,
        playerX.username || ''
    );
    if (data.playerX === userId) {
        totalGames = newGamesX;
        updateUserInfo();
    }
    if (data.playerO) {
        let playerOSnap = await db.collection('users').doc(data.playerO).get();
        let playerO = playerOSnap.data() || {};
        let newGamesO = (playerO.totalGames || 0) + 1;
        await saveUserData(
            data.playerO,
            '',
            playerO.prove,
            playerO.theme || theme,
            newGamesO,
            playerO.totalWins || 0,
            playerO.username || ''
        );
        if (data.playerO === userId) {
            totalGames = newGamesO;
            updateUserInfo();
        }
    }
}


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