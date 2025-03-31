  // ======================
    // Game Variables
    // ======================
    const betAmountElement = document.getElementById("betAmount");
    const plusBetButton = document.getElementById("plusBet");
    const minusBetButton = document.getElementById("minusBet");
    const chips = document.querySelectorAll(".chip");
    const totalScoreElement = document.getElementById("totalScore");
    const boxesContainer = document.getElementById("boxesContainer");
    const plinkoBoard = document.getElementById('plinkoBoard');
    const dropButton = document.getElementById('dropButton');

    let balance = 0;
    let selectedTokenValue = 10;
    let currentBet = 0;
    let totalWin = 0;
    let currentToken = null;
    let isLoggedIn = false;
    const boxMultipliers = [1.2, 0.8, 0.4, 0.1, 0.05, 0, 0, 0.2, 10, 1.2];
    const balls = [];
    const pegs = [];
    const rows = 20;
    const cols = 12;
    const pegSpacing = 40;
    const ballRadius = 7.5;
    const gravity = 0.3;
    const friction = 0.98;
    const MAX_BALLS = 5;

// ======================
// Authentication System
// ======================
function showAuthModal(isLogin = true) {
  document.getElementById('authModalTitle').textContent = isLogin ? 'Login' : 'Sign Up';
  document.getElementById('authActionBtn').textContent = isLogin ? 'Login' : 'Sign Up';
  document.getElementById('authModals').style.display = 'block';
  document.getElementById('authActionBtn').onclick = isLogin ? login : signup;
}

function hideAuthModal() {
  document.getElementById('authModals').style.display = 'none';
}

async function signup() {
  const username = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;
  
  try {
    const response = await fetch('http://localhost:3000/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('Signup successful! Please login.');
      showAuthModal(true);
    } else {
      alert(data.error || 'Signup failed');
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Connection error');
  }
}

async function login() {
  const username = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;

  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
   
 if (response.ok) {
  currentToken = data.token;
  isLoggedIn = true;
  updateBalanceDisplay(data.balance || 0); // Changed from 1000 to 0
  hideAuthModal();
  toggleAuthUI(true);
  localStorage.setItem('plinkoToken', currentToken);
  alert(`Login successful! Current balance: $${(data.balance || 0).toFixed(2)}\nPlease deposit to play.`);
   } else {
      alert(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

function toggleAuthUI(isLoggedIn) {
  document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('signupBtn').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('logoutBtn').style.display = isLoggedIn ? 'block' : 'none';
}

function checkLoggedIn() {
  if (!isLoggedIn) {
    alert("Please login to play!");
    return false;
  }
  return true;
}



async function fetchBalance() {
  if (!currentToken) return;
  
  try {
    const response = await fetch('http://localhost:3000/user/balance', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    
    const data = await response.json();
    if (response.ok) {
      updateBalanceDisplay(data.balance);
    }
  } catch (error) {
    console.error('Balance fetch error:', error);
  }
}

function updateBalanceDisplay(newBalance) {
  balance = newBalance !== undefined ? newBalance : 0; // Force zero if undefined
  document.getElementById('balanceAmount').textContent = balance.toFixed(2);
}

function updateBetAmount(change) {
    currentBet += change;
    if (currentBet < 0) currentBet = 0;
    betAmountElement.textContent = currentBet;
}
async function logout() {
  try {
    if (currentToken) {
      await fetch('http://localhost:3000/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
    }
    
    // Clear client-side state
    currentToken = null;
    isLoggedIn = false;
    localStorage.removeItem('plinkoToken');
    updateBalanceDisplay(0);
    toggleAuthUI(false);
    
    // Reset game state
    currentBet = 0;
    betAmountElement.textContent = currentBet;
    totalWin = 0;
    totalScoreElement.textContent = totalWin.toFixed(2);
    
    // Remove all balls from board
    balls.forEach(ball => {
      if (ball.element && ball.element.parentNode) {
        plinkoBoard.removeChild(ball.element);
      }
    });
    balls.length = 0;
    
    alert("Logged out successfully! Game disabled.");
    
  } catch (error) {
    console.error('Logout error:', error);
    alert("Error during logout");
  }
}

// ======================
    // Game Initialization
    // ======================
    function init() {
      createPegs();
      createBoxes();
      setupEventListeners();
      updateBalanceDisplay(balance);
    }


function createPegs() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const pegX = col * pegSpacing + (row % 2 === 0 ? pegSpacing / 2 : 0);
            const pegY = row * pegSpacing;
            const peg = document.createElement('div');
            peg.classList.add('peg');
            peg.style.left = `${pegX}px`;
            peg.style.top = `${pegY}px`;
            plinkoBoard.appendChild(peg);
            pegs.push({ x: pegX, y: pegY });
        }
    }
}

function createBoxes() {
  boxesContainer.innerHTML = ''; // Clear existing boxes
  boxMultipliers.forEach((multiplier) => {
    const box = document.createElement('div');
    box.classList.add('box');
    box.dataset.multiplier = multiplier;
    box.textContent = `${multiplier}x`; // Display only the multiplier
    boxesContainer.appendChild(box);
  });
}

function setupEventListeners() {
      plusBetButton.addEventListener("click", () => updateBetAmount(selectedTokenValue));
      minusBetButton.addEventListener("click", () => updateBetAmount(-selectedTokenValue));
      dropButton.addEventListener('click', dropBall);
      
      chips.forEach(chip => {
        chip.addEventListener("click", () => {
          selectedTokenValue = parseInt(chip.dataset.value);
          chips.forEach(c => c.classList.remove("selected"));
          chip.classList.add("selected");
        });
      });
    }

    // ======================
    // Game Logic
    // ======================
    function dropBall() {
if (!checkLoggedIn()) return;

if (balance <= 0) {
    return alert("Please deposit funds first!");
  }
       
      if (balls.length >= MAX_BALLS) {
        return alert("Wait for current balls to finish!");
      }
      
      if (currentBet <= 0) {
        return alert("Please place a bet first!");
      }
      
      if (balance < currentBet) {
        return alert("Insufficient balance!");
      }
      
      balance -= currentBet;
      updateBalanceDisplay(balance);
      
      const ball = document.createElement('div');
      ball.classList.add('ball');
      const startX = Math.floor(plinkoBoard.offsetWidth / 4) - ballRadius + (Math.random() * 20 - 10);
      ball.style.left = `${startX}px`;
      ball.style.top = `0px`;
      plinkoBoard.appendChild(ball);
      
      balls.push({ 
        element: ball, 
        posX: startX, 
        posY: 0, 
        velocityX: (Math.random() - 0.5) * 2, 
        velocityY: 0 
      });
      
      if (balls.length === 1) {
        requestAnimationFrame(animateBalls);
      }
    }

    function animateBalls() {
      const leftBoundary = 5;
      const rightBoundary = plinkoBoard.offsetWidth - ballRadius - 5;
      const bottomBoundary = plinkoBoard.offsetHeight - ballRadius * 2;
      
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        
        // Apply physics
        ball.velocityY += gravity;
        ball.velocityX *= friction;
        ball.velocityY *= friction;
        ball.posX += ball.velocityX;
        ball.posY += ball.velocityY;

        // Boundary collision
        if (ball.posX < leftBoundary) {
          ball.posX = leftBoundary;
          ball.velocityX = Math.abs(ball.velocityX) * 0.7;
        } else if (ball.posX > rightBoundary) {
          ball.posX = rightBoundary;
          ball.velocityX = -Math.abs(ball.velocityX) * 0.7;
        }

        // Peg collision
        pegs.forEach(peg => {
          const dx = ball.posX - peg.x;
          const dy = ball.posY - peg.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < ballRadius + 5) {
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
            const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2) * 0.9;
            ball.velocityX = Math.cos(angle) * speed;
            ball.velocityY = Math.sin(angle) * speed;
          }
        });

        // Bottom collision (landing)
        if (ball.posY >= bottomBoundary) {
          const boxElements = document.querySelectorAll('.box');
          const boardRect = plinkoBoard.getBoundingClientRect();
          const ballX = ball.posX + boardRect.left;
          let closestBox = null;
          let closestDistance = Infinity;

          boxElements.forEach(box => {
            const boxRect = box.getBoundingClientRect();
            const boxCenterX = boxRect.left + boxRect.width / 2;
            const distance = Math.abs(ballX - boxCenterX);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestBox = box;
            }
          });

          if (closestBox) {
            closestBox.classList.add("blink");
            setTimeout(() => closestBox.classList.remove("blink"), 1000);

            const winnings = currentBet * parseFloat(closestBox.dataset.multiplier);
            balance += winnings;
            totalWin += winnings;
            updateBalanceDisplay(balance);
            totalScoreElement.textContent = totalWin.toFixed(2);
          }

          // Remove the ball
          plinkoBoard.removeChild(ball.element);
          balls.splice(i, 1);
        } else {
          // Update position
          ball.element.style.left = `${ball.posX}px`;
          ball.element.style.top = `${ball.posY}px`;
        }
      }

      if (balls.length > 0) {
        requestAnimationFrame(animateBalls);
      }
    }

    // ======================
    // Helper Functions
    // ======================
    function updateBetAmount(change) {
      currentBet += change;
      if (currentBet < 0) currentBet = 0;
      betAmountElement.textContent = currentBet;
    }

    function updateBalanceDisplay(newBalance) {
      balance = newBalance;
      document.getElementById('balanceAmount').textContent = balance.toFixed(2);
    }

    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal(true));
document.getElementById('signupBtn').addEventListener('click', () => showAuthModal(false));

// Deposit handlers
document.querySelector('.deposit-button').addEventListener('click', async () => {
  if (!checkLoggedIn()) return;
  
  const amount = parseFloat(prompt("Enter deposit amount (minimum $10):"));
  if (isNaN(amount) || amount < 10) {
    return alert("Minimum deposit is $10");
  }

  try {
    const response = await fetch('http://localhost:3000/user/update-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ amount })
    });
    
    const data = await response.json();
    if (response.ok) {
      updateBalanceDisplay(data.newBalance);
      alert(`Success! $${amount.toFixed(2)} deposited. New balance: $${data.newBalance.toFixed(2)}`);
    } else {
      alert(data.error || "Deposit failed");
    }
  } catch (error) {
    console.error('Deposit error:', error);
    alert("Connection error - please try again");
  }
});

// Withdrawal handlers
document.querySelector('.withdraw-button').addEventListener('click', async () => {
  const amount = parseFloat(prompt("Enter withdrawal amount:"));
  if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
  
  try {
    const response = await fetch('http://localhost:3000/user/update-balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ amount: -amount })
    });
    
    const data = await response.json();
    if (response.ok) {
      updateBalanceDisplay(data.newBalance);
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
  }
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  // Check for existing session
  const savedToken = localStorage.getItem('plinkoToken');
  if (savedToken) {
    currentToken = savedToken;
  isLoggedIn = true;
    fetchBalance();
    toggleAuthUI(true);
  }

createPegs();
createBoxes();
// Game controls
  document.getElementById('logoutBtn').addEventListener('click', logout);
  plusBetButton.addEventListener("click", () => {
    if (checkLoggedIn()) updateBetAmount(selectedTokenValue);
  });
  minusBetButton.addEventListener("click", () => {
    if (checkLoggedIn()) updateBetAmount(-selectedTokenValue);
  });
  
  dropButton.addEventListener('click', dropBall);
  
  // Chip selection
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      if (checkLoggedIn()) {
        selectedTokenValue = parseInt(chip.dataset.value);
        chips.forEach(c => c.classList.remove("selected"));
        chip.classList.add("selected");
      }
    });
  });
});