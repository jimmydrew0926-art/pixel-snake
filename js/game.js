"use strict";

// 第一步：获取页面元素，并定义棋盘尺寸和游戏速度。
const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const speedLevelElement = document.getElementById("speed-level");
const overlay = document.getElementById("overlay");
const statusLabel = document.getElementById("status-label");
const statusTitle = document.getElementById("status-title");
const statusDetail = document.getElementById("status-detail");
const startButton = document.getElementById("start-button");
const soundButton = document.getElementById("sound-button");

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;
const FOOD_COUNT = 4;
const INITIAL_TICK_RATE = 115;
const MIN_TICK_RATE = 55;
const SPEED_STEP = 8;
const APPLES_PER_LEVEL = 3;

let snake;
let foods;
let direction;
let nextDirection;
let score;
let applesEaten;
let timer = null;
let state = "ready";

// 第二步：使用 Web Audio 动态合成短音效，无需下载或打包音频文件。
let audioContext = null;
let soundEnabled = localStorage.getItem("snake-sound") !== "off";
let musicTimer = null;
let musicStep = 0;

// 像素风旋律使用音名对应的频率，0 表示该拍休止。
const MUSIC_MELODY = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 698.46, 880.00, 698.46,
  523.25, 659.25, 783.99, 987.77,
  880.00, 783.99, 659.25, 587.33
];
const MUSIC_BASS = [130.81, 130.81, 146.83, 146.83, 174.61, 174.61, 146.83, 146.83];

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioContext = new AudioContext();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}

function playTone(frequency, duration = 0.08, type = "square", volume = 0.045, delay = 0) {
  if (!soundEnabled) return;
  ensureAudioContext();
  if (!audioContext) return;

  const startAt = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

// 每 140 毫秒安排一拍：方波主旋律配三角波低音，形成轻量 8-bit 循环。
function playMusicStep() {
  if (!soundEnabled || state !== "running") return;
  const melodyNote = MUSIC_MELODY[musicStep % MUSIC_MELODY.length];
  const bassNote = MUSIC_BASS[Math.floor(musicStep / 2) % MUSIC_BASS.length];
  playTone(melodyNote, 0.11, "square", 0.018);
  if (musicStep % 2 === 0) playTone(bassNote, 0.2, "triangle", 0.024);
  musicStep = (musicStep + 1) % MUSIC_MELODY.length;
}

function startMusic() {
  window.clearInterval(musicTimer);
  if (!soundEnabled) return;
  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 140);
}

function stopMusic() {
  window.clearInterval(musicTimer);
  musicTimer = null;
}

function playSound(name) {
  if (name === "start") {
    playTone(330, 0.07, "square");
    playTone(495, 0.1, "square", 0.045, 0.08);
  } else if (name === "eat") {
    playTone(660, 0.06, "square");
    playTone(880, 0.08, "square", 0.04, 0.05);
  } else if (name === "pause") {
    playTone(260, 0.1, "triangle", 0.04);
  } else if (name === "over") {
    playTone(220, 0.14, "sawtooth", 0.05);
    playTone(145, 0.24, "sawtooth", 0.05, 0.12);
  }
}

function updateSoundButton() {
  soundButton.textContent = soundEnabled ? "声音 开" : "声音 关";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

// 第三步：读取浏览器本地保存的最高分。
let highScore = Number.parseInt(localStorage.getItem("snake-high-score") || "0", 10);
highScoreElement.textContent = highScore;

// 第四步：重置所有运行数据，但暂时不启动计时器。
function resetGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  applesEaten = 0;
  scoreElement.textContent = score;
  speedLevelElement.textContent = "1";
  foods = [];
  fillFoods();
  drawGame();
}

// 每吃 3 颗苹果提升一级；移动间隔逐级缩短，但不会低于安全下限。
function getSpeedLevel() {
  return Math.floor(applesEaten / APPLES_PER_LEVEL) + 1;
}

function getTickRate() {
  return Math.max(MIN_TICK_RATE, INITIAL_TICK_RATE - (getSpeedLevel() - 1) * SPEED_STEP);
}

function scheduleNextTick() {
  window.clearTimeout(timer);
  timer = window.setTimeout(gameTick, getTickRate());
}

// 第五步：补足多颗苹果，确保它们不会与蛇身或其他苹果重叠。
function placeFood() {
  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  } while (
    snake.some(part => part.x === candidate.x && part.y === candidate.y) ||
    foods.some(item => item.x === candidate.x && item.y === candidate.y)
  );
  foods.push(candidate);
}

function fillFoods() {
  while (foods.length < FOOD_COUNT) placeFood();
}

// 第六步：开始新游戏，隐藏提示层并把焦点交给棋盘。
function startGame() {
  window.clearTimeout(timer);
  resetGame();
  state = "running";
  overlay.classList.add("hidden");
  canvas.focus();
  playSound("start");
  startMusic();
  scheduleNextTick();
}

// 第七步：每个动态时间片移动蛇头，吃得越多，下一步调度得越快。
function gameTick() {
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
  const hitSelf = snake.some(part => part.x === head.x && part.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);
  const eatenFoodIndex = foods.findIndex(item => item.x === head.x && item.y === head.y);
  if (eatenFoodIndex !== -1) {
    score += 10;
    applesEaten += 1;
    scoreElement.textContent = score;
    speedLevelElement.textContent = String(getSpeedLevel());
    playSound("eat");
    foods.splice(eatenFoodIndex, 1);
    fillFoods();
  } else {
    snake.pop();
  }

  drawGame();
  scheduleNextTick();
}

// 第八步：绘制网格、食物和蛇；蛇头使用不同颜色便于辨认。
function drawGame() {
  context.fillStyle = "#09110d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#15281e";
  context.lineWidth = 1;
  for (let line = 1; line < GRID_SIZE; line += 1) {
    const point = line * CELL_SIZE;
    context.beginPath();
    context.moveTo(point, 0);
    context.lineTo(point, canvas.height);
    context.moveTo(0, point);
    context.lineTo(canvas.width, point);
    context.stroke();
  }

  foods.forEach(item => drawCell(item.x, item.y, "#ff5d57", 6));
  snake.forEach((part, index) => {
    drawCell(part.x, part.y, index === 0 ? "#f3f5e8" : "#b8f34a", 4);
  });
}

function drawCell(x, y, color, inset) {
  context.fillStyle = color;
  context.fillRect(x * CELL_SIZE + inset, y * CELL_SIZE + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2);
}

// 第九步：结束游戏、更新最高分，并显示重新开始按钮。
function endGame() {
  window.clearTimeout(timer);
  stopMusic();
  state = "over";
  playSound("over");
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snake-high-score", String(highScore));
    highScoreElement.textContent = highScore;
  }

  statusLabel.textContent = "GAME OVER";
  statusTitle.textContent = `本局得分 ${score}`;
  statusDetail.textContent = "再来一局，刷新你的最高纪录。";
  startButton.textContent = "重新开始";
  overlay.classList.remove("hidden");
  startButton.focus();
}

// 第十步：空格键暂停或继续；方向键不能让蛇直接反向。
function togglePause() {
  if (state === "running") {
    window.clearTimeout(timer);
    stopMusic();
    state = "paused";
    statusLabel.textContent = "PAUSED";
    statusTitle.textContent = "游戏已暂停";
    statusDetail.textContent = "按空格键继续。";
    startButton.textContent = "继续游戏";
    overlay.classList.remove("hidden");
    playSound("pause");
  } else if (state === "paused") {
    state = "running";
    overlay.classList.add("hidden");
    canvas.focus();
    startMusic();
    scheduleNextTick();
  }
}

function changeDirection(candidate) {
  if (state === "ready" || state === "over") startGame();
  if (state !== "running") return;
  const isOpposite = candidate.x + direction.x === 0 && candidate.y + direction.y === 0;
  if (!isOpposite) nextDirection = candidate;
}

const directions = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

document.addEventListener("keydown", event => {
  if (directions[event.key]) {
    event.preventDefault();
    changeDirection(directions[event.key]);
  } else if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  }
});

startButton.addEventListener("click", () => {
  if (state === "paused") togglePause();
  else startGame();
});

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("snake-sound", soundEnabled ? "on" : "off");
  updateSoundButton();
  if (soundEnabled) {
    playTone(520, 0.08, "triangle", 0.04);
    if (state === "running") startMusic();
  } else {
    stopMusic();
  }
  canvas.focus();
});

document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("pointerdown", () => {
    const key = `Arrow${button.dataset.direction[0].toUpperCase()}${button.dataset.direction.slice(1)}`;
    changeDirection(directions[key]);
  });
});

// 第十一步：页面加载后先绘制静态棋盘，等待玩家开始。
updateSoundButton();
resetGame();
