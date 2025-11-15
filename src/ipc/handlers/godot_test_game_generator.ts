/**
 * Dynamic Test Game Generator
 * Generates different game types based on the game specification
 */

export interface GameConfig {
  gameType: string;
  playerColor: string;
  backgroundColor: string;
  platformColor: string;
  windowWidth: number;
  windowHeight: number;
  gameName: string;
  gameDescription: string;
}

export function generateGameCode(config: GameConfig): string {
  const { gameType, playerColor, backgroundColor, platformColor, windowWidth, windowHeight, gameName, gameDescription } = config;
  
  switch (gameType) {
    case 'maze':
      return generateMazeGame(config);
    case 'pong':
      return generatePongGame(config);
    case 'shooter':
      return generateShooterGame(config);
    case 'puzzle':
      return generatePuzzleGame(config);
    case 'racing':
      return generateRacingGame(config);
    case 'zombie':
      return generateZombieGame(config);
    case 'space':
      return generateSpaceGame(config);
    default:
      return generatePlatformerGame(config);
  }
}

function generateMazeGame(config: GameConfig): string {
  const { playerColor, backgroundColor, platformColor, windowWidth, windowHeight } = config;
  
  // Simple maze generation
  const cellSize = 40;
  const cols = Math.floor(windowWidth / cellSize);
  const rows = Math.floor(windowHeight / cellSize);
  
  // Generate a simple maze pattern
  const walls: Array<{x: number, y: number, width: number, height: number}> = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if ((i + j) % 3 === 0 && !(i === 0 && j === 0) && !(i === cols - 1 && j === rows - 1)) {
        walls.push({
          x: i * cellSize,
          y: j * cellSize,
          width: cellSize,
          height: cellSize
        });
      }
    }
  }
  
  return `
        // Maze Game
        let player = {
            x: 20,
            y: 20,
            width: 30,
            height: 30,
            speed: 3,
            color: '${playerColor}'
        };
        
        let walls = ${JSON.stringify(walls)};
        let goal = { x: ${windowWidth - 60}, y: ${windowHeight - 60}, width: 40, height: 40 };
        let keys = {};
        let won = false;
        
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        function checkWallCollision(x, y) {
            const testRect = { x, y, width: player.width, height: player.height };
            for (let wall of walls) {
                if (testRect.x < wall.x + wall.width &&
                    testRect.x + testRect.width > wall.x &&
                    testRect.y < wall.y + wall.height &&
                    testRect.y + testRect.height > wall.y) {
                    return true;
                }
            }
            return false;
        }
        
        function update() {
            if (won) return;
            
            let newX = player.x;
            let newY = player.y;
            
            if (keys['arrowleft'] || keys['a']) newX -= player.speed;
            if (keys['arrowright'] || keys['d']) newX += player.speed;
            if (keys['arrowup'] || keys['w']) newY -= player.speed;
            if (keys['arrowdown'] || keys['s']) newY += player.speed;
            
            if (!checkWallCollision(newX, player.y)) player.x = newX;
            if (!checkWallCollision(player.x, newY)) player.y = newY;
            
            // Check goal
            if (player.x < goal.x + goal.width &&
                player.x + player.width > goal.x &&
                player.y < goal.y + goal.height &&
                player.y + player.height > goal.y) {
                won = true;
                score = 1000;
                scoreElement.textContent = score;
            }
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw walls
            ctx.fillStyle = '${platformColor}';
            walls.forEach(wall => {
                ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            });
            
            // Draw goal
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.fillText('GOAL', goal.x + 5, goal.y + 25);
            
            // Draw player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            if (won) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
                ctx.textAlign = 'left';
            }
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

function generatePongGame(config: GameConfig): string {
  const { playerColor, backgroundColor, windowWidth, windowHeight } = config;
  
  return `
        // Pong Game
        let paddle1 = { x: 20, y: ${windowHeight / 2 - 50}, width: 10, height: 100, speed: 5 };
        let paddle2 = { x: ${windowWidth - 30}, y: ${windowHeight / 2 - 50}, width: 10, height: 100, speed: 3 };
        let ball = { x: ${windowWidth / 2}, y: ${windowHeight / 2}, radius: 10, velocityX: 4, velocityY: 4 };
        let keys = {};
        let score1 = 0;
        let score2 = 0;
        
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        function update() {
            // Move paddle 1
            if (keys['w'] && paddle1.y > 0) paddle1.y -= paddle1.speed;
            if (keys['s'] && paddle1.y + paddle1.height < canvas.height) paddle1.y += paddle1.speed;
            
            // AI paddle 2
            if (ball.y < paddle2.y + paddle2.height / 2 && paddle2.y > 0) {
                paddle2.y -= paddle2.speed;
            } else if (ball.y > paddle2.y + paddle2.height / 2 && paddle2.y + paddle2.height < canvas.height) {
                paddle2.y += paddle2.speed;
            }
            
            // Move ball
            ball.x += ball.velocityX;
            ball.y += ball.velocityY;
            
            // Ball collision with paddles
            if (ball.x - ball.radius < paddle1.x + paddle1.width &&
                ball.y > paddle1.y && ball.y < paddle1.y + paddle1.height) {
                ball.velocityX = Math.abs(ball.velocityX);
            }
            
            if (ball.x + ball.radius > paddle2.x &&
                ball.y > paddle2.y && ball.y < paddle2.y + paddle2.height) {
                ball.velocityX = -Math.abs(ball.velocityX);
            }
            
            // Ball collision with walls
            if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
                ball.velocityY = -ball.velocityY;
            }
            
            // Score
            if (ball.x < 0) {
                score2++;
                ball.x = ${windowWidth / 2};
                ball.y = ${windowHeight / 2};
                ball.velocityX = 4;
                ball.velocityY = 4;
            }
            if (ball.x > canvas.width) {
                score1++;
                ball.x = ${windowWidth / 2};
                ball.y = ${windowHeight / 2};
                ball.velocityX = -4;
                ball.velocityY = 4;
            }
            
            score = score1;
            scoreElement.textContent = score1 + ' - ' + score2;
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw paddles
            ctx.fillStyle = '${playerColor}';
            ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
            ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);
            
            // Draw ball
            ctx.fillStyle = '${playerColor}';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw center line
            ctx.strokeStyle = '${playerColor}';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

function generateShooterGame(config: GameConfig): string {
  const { playerColor, backgroundColor, windowWidth, windowHeight } = config;
  
  return `
        // Shooter Game
        let player = {
            x: ${windowWidth / 2},
            y: ${windowHeight - 60},
            width: 40,
            height: 40,
            speed: 5,
            color: '${playerColor}'
        };
        
        let bullets = [];
        let enemies = [];
        let keys = {};
        let lastShot = 0;
        
        // Create enemies
        for (let i = 0; i < 5; i++) {
            enemies.push({
                x: 100 + i * 150,
                y: 50 + Math.random() * 100,
                width: 30,
                height: 30,
                speed: 1,
                color: '#ff0000'
            });
        }
        
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') {
                const now = Date.now();
                if (now - lastShot > 200) {
                    bullets.push({
                        x: player.x + player.width / 2,
                        y: player.y,
                        width: 4,
                        height: 10,
                        speed: 8
                    });
                    lastShot = now;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        function update() {
            // Move player
            if (keys['arrowleft'] || keys['a']) player.x -= player.speed;
            if (keys['arrowright'] || keys['d']) player.x += player.speed;
            
            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
            
            // Move bullets
            bullets = bullets.filter(bullet => {
                bullet.y -= bullet.speed;
                return bullet.y > 0;
            });
            
            // Move enemies
            enemies.forEach(enemy => {
                enemy.x += enemy.speed;
                if (enemy.x > canvas.width || enemy.x < 0) {
                    enemy.speed = -enemy.speed;
                    enemy.y += 30;
                }
            });
            
            // Collision detection
            bullets.forEach((bullet, bi) => {
                enemies.forEach((enemy, ei) => {
                    if (bullet.x < enemy.x + enemy.width &&
                        bullet.x + bullet.width > enemy.x &&
                        bullet.y < enemy.y + enemy.height &&
                        bullet.y + bullet.height > enemy.y) {
                        bullets.splice(bi, 1);
                        enemies.splice(ei, 1);
                        score += 100;
                        scoreElement.textContent = score;
                    }
                });
            });
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Draw bullets
            ctx.fillStyle = '#ffff00';
            bullets.forEach(bullet => {
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            });
            
            // Draw enemies
            enemies.forEach(enemy => {
                ctx.fillStyle = enemy.color;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            });
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

function generatePuzzleGame(config: GameConfig): string {
  const { playerColor, backgroundColor, windowWidth, windowHeight } = config;
  
  return `
        // Puzzle Game (Match-3 style)
        const gridSize = 8;
        const cellSize = Math.min(${windowWidth}, ${windowHeight}) / gridSize;
        let grid = [];
        let selected = null;
        
        // Initialize grid with random colors
        const colors = ['${playerColor}', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = [];
            for (let j = 0; j < gridSize; j++) {
                grid[i][j] = colors[Math.floor(Math.random() * colors.length)];
            }
        }
        
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / cellSize);
            const y = Math.floor((e.clientY - rect.top) / cellSize);
            
            if (selected) {
                // Swap
                const temp = grid[selected.y][selected.x];
                grid[selected.y][selected.x] = grid[y][x];
                grid[y][x] = temp;
                selected = null;
                checkMatches();
            } else {
                selected = { x, y };
            }
        });
        
        function checkMatches() {
            // Simple match detection
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize - 2; j++) {
                    if (grid[i][j] === grid[i][j+1] && grid[i][j] === grid[i][j+2]) {
                        grid[i][j] = colors[Math.floor(Math.random() * colors.length)];
                        grid[i][j+1] = colors[Math.floor(Math.random() * colors.length)];
                        grid[i][j+2] = colors[Math.floor(Math.random() * colors.length)];
                        score += 10;
                        scoreElement.textContent = score;
                    }
                }
            }
        }
        
        function update() {
            // Puzzle games are mostly event-driven
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    ctx.fillStyle = grid[i][j];
                    ctx.fillRect(j * cellSize, i * cellSize, cellSize - 2, cellSize - 2);
                    
                    if (selected && selected.x === j && selected.y === i) {
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(j * cellSize, i * cellSize, cellSize - 2, cellSize - 2);
                    }
                }
            }
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

function generateRacingGame(config: GameConfig): string {
  const { playerColor, backgroundColor, windowWidth, windowHeight } = config;
  
  return `
        // Racing Game
        let player = {
            x: ${windowWidth / 2 - 25},
            y: ${windowHeight - 100},
            width: 50,
            height: 80,
            speed: 5,
            color: '${playerColor}'
        };
        
        let obstacles = [];
        let roadOffset = 0;
        let keys = {};
        
        // Create initial obstacles
        for (let i = 0; i < 5; i++) {
            obstacles.push({
                x: Math.random() * (${windowWidth} - 100) + 50,
                y: -i * 200,
                width: 60,
                height: 80,
                speed: 3
            });
        }
        
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        function update() {
            // Move player
            if (keys['arrowleft'] || keys['a']) player.x -= player.speed;
            if (keys['arrowright'] || keys['d']) player.x += player.speed;
            
            player.x = Math.max(50, Math.min(${windowWidth} - 50 - player.width, player.x));
            
            // Move obstacles
            roadOffset += 3;
            obstacles.forEach(obstacle => {
                obstacle.y += obstacle.speed;
                if (obstacle.y > canvas.height) {
                    obstacle.y = -100;
                    obstacle.x = Math.random() * (${windowWidth} - 100) + 50;
                }
                
                // Collision
                if (player.x < obstacle.x + obstacle.width &&
                    player.x + player.width > obstacle.x &&
                    player.y < obstacle.y + obstacle.height &&
                    player.y + player.height > obstacle.y) {
                    // Reset
                    player.x = ${windowWidth / 2 - 25};
                    score = Math.max(0, score - 50);
                    scoreElement.textContent = score;
                }
            });
            
            score += 0.1;
            scoreElement.textContent = Math.floor(score);
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw road
            ctx.fillStyle = '#333333';
            ctx.fillRect(100, 0, ${windowWidth} - 200, canvas.height);
            
            // Draw road lines
            ctx.strokeStyle = '#ffff00';
            ctx.setLineDash([20, 20]);
            ctx.lineWidth = 3;
            for (let i = 0; i < canvas.height; i += 50) {
                ctx.beginPath();
                ctx.moveTo(${windowWidth / 2}, (i + roadOffset) % canvas.height);
                ctx.lineTo(${windowWidth / 2}, (i + roadOffset) % canvas.height + 30);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            
            // Draw obstacles
            ctx.fillStyle = '#ff0000';
            obstacles.forEach(obstacle => {
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            });
            
            // Draw player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

function generateZombieGame(config: GameConfig): string {
  return generatePlatformerGame({ ...config, gameType: 'zombie' });
}

function generateSpaceGame(config: GameConfig): string {
  return generateShooterGame({ ...config, gameType: 'space' });
}

function generatePlatformerGame(config: GameConfig): string {
  const { playerColor, backgroundColor, platformColor, windowWidth, windowHeight } = config;
  
  return `
        // Platformer Game
        let player = {
            x: 100,
            y: ${Math.floor(windowHeight * 0.5)},
            width: 40,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            speed: 5,
            jumpPower: -12,
            onGround: false,
            color: '${playerColor}'
        };
        
        let platforms = [
            { x: 0, y: ${windowHeight - 50}, width: 200, height: 50, color: '${platformColor}' },
            { x: 250, y: ${windowHeight - 100}, width: 150, height: 50, color: '${platformColor}' },
            { x: 450, y: ${windowHeight - 150}, width: 150, height: 50, color: '${platformColor}' },
            { x: 650, y: ${windowHeight - 200}, width: 150, height: 50, color: '${platformColor}' },
            { x: 0, y: ${windowHeight - 50}, width: ${windowWidth}, height: 50, color: '#2d2d30' }
        ];
        
        let collectibleColor = '${config.gameType === 'zombie' ? '#ff4444' : config.gameType === 'space' ? '#00ffff' : '#ff8800'}';
        let collectibles = [
            { x: 300, y: ${windowHeight - 150}, radius: 15, collected: false, color: collectibleColor },
            { x: 500, y: ${windowHeight - 200}, radius: 15, collected: false, color: collectibleColor },
            { x: 700, y: ${windowHeight - 250}, radius: 15, collected: false, color: collectibleColor }
        ];
        
        let keys = {};
        const gravity = 0.6;
        const friction = 0.8;
        
        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && player.onGround) {
                player.velocityY = player.jumpPower;
                player.onGround = false;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        
        function checkCollision(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }
        
        function checkPointCollision(point, circle) {
            const dx = point.x - circle.x;
            const dy = point.y - circle.y;
            return dx * dx + dy * dy < circle.radius * circle.radius;
        }
        
        function update() {
            if (keys['arrowleft'] || keys['a']) {
                player.velocityX = -player.speed;
            } else if (keys['arrowright'] || keys['d']) {
                player.velocityX = player.speed;
            } else {
                player.velocityX *= friction;
            }
            
            player.velocityY += gravity;
            player.x += player.velocityX;
            player.y += player.velocityY;
            
            player.onGround = false;
            for (let platform of platforms) {
                if (checkCollision(player, platform)) {
                    if (player.velocityY > 0 && player.y < platform.y) {
                        player.y = platform.y - player.height;
                        player.velocityY = 0;
                        player.onGround = true;
                    } else if (player.velocityX > 0) {
                        player.x = platform.x - player.width;
                    } else if (player.velocityX < 0) {
                        player.x = platform.x + platform.width;
                    }
                }
            }
            
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
            if (player.y > canvas.height) {
                player.y = ${Math.floor(windowHeight * 0.5)};
                player.x = 100;
                player.velocityY = 0;
            }
            
            collectibles.forEach((collectible) => {
                if (!collectible.collected) {
                    const playerCenter = {
                        x: player.x + player.width / 2,
                        y: player.y + player.height / 2
                    };
                    if (checkPointCollision(playerCenter, collectible)) {
                        collectible.collected = true;
                        score += 100;
                        scoreElement.textContent = score;
                    }
                }
            });
        }
        
        function render() {
            ctx.fillStyle = '${backgroundColor}';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            platforms.forEach(platform => {
                ctx.fillStyle = platform.color;
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                ctx.strokeStyle = '#4a4a4a';
                ctx.lineWidth = 2;
                ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            });
            
            collectibles.forEach(collectible => {
                if (!collectible.collected) {
                    ctx.fillStyle = collectible.color;
                    ctx.beginPath();
                    ctx.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffaa00';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
            
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.strokeStyle = '#6bb6ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(player.x, player.y, player.width, player.height);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(player.x + 10, player.y + 10, 8, 8);
            ctx.fillRect(player.x + 22, player.y + 10, 8, 8);
        }
        
        function gameLoop() {
            update();
            render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
    `;
}

