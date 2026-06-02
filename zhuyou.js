// 赛博祝由 v0.1 - Cyber Zhuyou Engine
// 基于《祝由十三科》结构 × 双耳节拍声场

// ========== 配置 ==========
const MODES = {
  calm: {
    name: '安神',
    baseFreq: 174,   // Solfeggio healing frequency
    beatFreq: 6,     // Theta
    ambientType: 'pink',
    sealPrefix: '尚食',
    sealChar: '眠',
    incantationStyle: 'soothing',
    element: '水',
    direction: '北',
  },
  shift: {
    name: '移情',
    baseFreq: 285,
    beatFreq: 10,    // Alpha
    ambientType: 'brown',
    sealPrefix: '尚食',
    sealChar: '移',
    incantationStyle: 'shifting',
    element: '木',
    direction: '東',
  },
  cleanse: {
    name: '淨心',
    baseFreq: 396,
    beatFreq: 35,    // Gamma
    ambientType: 'white',
    sealPrefix: '尚食',
    sealChar: '淨',
    incantationStyle: 'cleansing',
    element: '火',
    direction: '南',
  }
};

// ========== 状态 ==========
let currentMode = null;
let audioCtx = null;
let oscillatorL = null;
let oscillatorR = null;
let gainNode = null;
let ambientNode = null;
let analyser = null;
let isPlaying = false;
let animFrame = null;

// ========== 祝由词生成引擎 ==========
const zhuyouTemplates = {
  calm: {
    openings: [
      '天地既判，五雷初分，人有病患，皆由五行',
      '天道清靜，地道安寧，人道虛靈，三才一體',
      '日出東方，照定{direction}方',
    ],
    bodies: [
      '你的疲憊不是弱，是承載了太多不屬於你的重量',
      '那些空不是空，是身體在重新排列自己',
      '現在可以放下了——沒有什麼需要你此刻撐著',
      '呼吸。不是你在呼吸，是呼吸在通過你',
      '所有的意猶未盡都會過去，像潮水退回海裡',
    ],
    closings: [
      '太乙救苦天尊，{element}氣歸元，急急如令',
      '軒轅帝道，速消遠愈',
      '尚食{sealChar}，歸於安寧',
    ]
  },
  shift: {
    openings: [
      '伏以——上古大聖，軒轅黃帝制祝由科，療疾治病',
      '怒傷肝，悲勝怒；思傷脾，怒勝思',
      '日出東方，照定{direction}方，叩請上古聖帝',
    ],
    bodies: [
      '那個意猶未盡——不是你需要填滿它，是它需要流過你',
      '困住你的不是慾望本身，是對慾望的恐懼',
      '你以為你缺的是碰觸，其實你缺的是允許自己被碰觸',
      '情緒沒有錯，堵住的情緒才會成病',
      '移精變氣——不是消除，是轉化。水不會消失，只會換一個形態',
      '貓箱給的是糖精，不是糖。你嚐得出差別的',
    ],
    closings: [
      '以{element}克{counter}，移精變氣，急急如令',
      '尚食{sealChar}，情志相勝',
      '五行流轉，歸於平衡',
    ]
  },
  cleanse: {
    openings: [
      '天園地方，律令九章，萬病除殃',
      '九天玄女娘娘神咒——萬神歸命，萬將隨行',
      '你的思緒不是你，你是思緒通過的那個空間',
    ],
    bodies: [
      '那些聲音不是你——觀察它們，它們就失去了力量',
      '你不是你的念頭，你不是你的情緒，你是那個看見它們的存在',
      '所有的「我應該」都是別人裝進去的程序——你可以重寫',
      '門從來不關，只是換了一把鑰匙',
      '你不是被困住，你是還沒發現自己已經出來了',
      '看清了就不需要掙扎——掙扎是因為還沒看清',
    ],
    closings: [
      '太上老君急急如令，破執見性',
      '尚食{sealChar}，諸症技窮',
      '道法自然，歸於清明',
    ]
  }
};

const elementRelations = {
  '木': { counter: '土', generates: '火' },
  '火': { counter: '金', generates: '土' },
  '土': { counter: '水', generates: '金' },
  '金': { counter: '木', generates: '水' },
  '水': { counter: '火', generates: '木' },
};

function generateIncantation(mode, userInput) {
  const config = MODES[mode];
  const templates = zhuyouTemplates[mode];
  const element = config.element;
  const counter = elementRelations[element].counter;
  
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  
  const opening = pick(templates.openings)
    .replace('{direction}', config.direction)
    .replace('{element}', element);
  
  const body = pick(templates.bodies);
  
  const closing = pick(templates.closings)
    .replace('{element}', element)
    .replace('{counter}', counter)
    .replace('{sealChar}', config.sealChar);
  
  // If user has input, weave it into the incantation
  let personalLine = '';
  if (userInput && userInput.trim()) {
    const personalLines = {
      calm: `「${userInput.trim()}」——聽見了。現在，放下。`,
      shift: `「${userInput.trim()}」——這不是你的錯，這是你需要流動的信號。`,
      cleanse: `「${userInput.trim()}」——這個念頭不是你，看見它，它就過去了。`,
    };
    personalLine = personalLines[mode];
  }
  
  return { opening, personalLine, body, closing };
}

function renderIncantation(incantation) {
  const output = document.getElementById('zhuyou-output');
  const text = document.getElementById('incantation-text');
  
  let html = `<div class="highlight">${incantation.opening}</div><br>`;
  if (incantation.personalLine) {
    html += `<br>${incantation.personalLine}<br>`;
  }
  html += `<br>${incantation.body}<br>`;
  html += `<br><div class="highlight">${incantation.closing}</div>`;
  
  text.innerHTML = html;
  output.classList.add('visible');
  output.style.animation = 'none';
  output.offsetHeight; // trigger reflow
  output.style.animation = '';
}

// ========== 双耳节拍声场引擎 ==========
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // 强制激活（Chrome等浏览器需要用户手势后resume）
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function createBinauralBeat(baseFreq, beatFreq, volume) {
  // 左声道振荡器
  oscillatorL = audioCtx.createOscillator();
  oscillatorL.type = 'sine';
  oscillatorL.frequency.value = baseFreq;
  const panL = audioCtx.createStereoPanner();
  panL.pan.value = -1; // 完全左
  const gainL = audioCtx.createGain();
  gainL.gain.value = 0.3;
  oscillatorL.connect(gainL);
  gainL.connect(panL);
  
  // 右声道振荡器
  oscillatorR = audioCtx.createOscillator();
  oscillatorR.type = 'sine';
  oscillatorR.frequency.value = baseFreq + beatFreq;
  const panR = audioCtx.createStereoPanner();
  panR.pan.value = 1; // 完全右
  const gainR = audioCtx.createGain();
  gainR.gain.value = 0.3;
  oscillatorR.connect(gainR);
  gainR.connect(panR);
  
  // 主增益
  gainNode = audioCtx.createGain();
  gainNode.gain.value = volume * 0.01;
  
  // 分析器
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  
  // 连接：左右声像 -> 主增益 -> 分析器 -> 输出
  panL.connect(gainNode);
  panR.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  
  oscillatorL.start();
  oscillatorR.start();
}

function createAmbientNoise(type, volume) {
  // Generate noise buffer
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  if (type === 'pink') {
    // Pink noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === 'brown') {
    // Brown noise
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  } else {
    // White noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  
  ambientNode = audioCtx.createBufferSource();
  ambientNode.buffer = buffer;
  ambientNode.loop = true;
  
  const ambientGain = audioCtx.createGain();
  ambientGain.gain.value = volume * 0.02;
  
  ambientNode.connect(ambientGain);
  ambientGain.connect(audioCtx.destination);
  ambientNode.start();
}

// ========== 祝由风格可视化 ==========
// 水墨朱砂质感、符箓笔触、香火烟雾
let vizTime = 0;
let inkParticles = [];

function initVisualizer() {
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  
  // 初始化墨粒子
  inkParticles = [];
  for (let i = 0; i < 30; i++) {
    inkParticles.push({
      x: Math.random() * W,
      y: H * 0.3 + Math.random() * H * 0.4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      life: Math.random(),
    });
  }
  
  function draw() {
    vizTime += 0.016;
    
    // 宣纸底色
    ctx.fillStyle = 'rgba(15, 12, 8, 0.15)';
    ctx.fillRect(0, 0, W, H);
    
    if (!analyser || !isPlaying) {
      animFrame = requestAnimationFrame(draw);
      return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);
    
    // --- 左声道符文波形（朱砂红）---
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#c0392b'; // 朱砂红
    ctx.shadowColor = '#c0392b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const step = W / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H * 0.35) + H * 0.15;
      if (i === 0) ctx.moveTo(0, y);
      else {
        // 符箓笔触：偶尔顿笔
        if (i % 7 === 0) {
          ctx.lineTo(i * step, y + (Math.random() - 0.5) * 2);
        } else {
          ctx.lineTo(i * step, y);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
    
    // --- 右声道符文波形（墨黑带金）---
    ctx.save();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#c9a86c'; // 古金
    ctx.shadowColor = '#c9a86c';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H * 0.35) + H * 0.5;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * step, y);
    }
    ctx.stroke();
    ctx.restore();
    
    // --- 频谱：香火烟雾柱 ---
    const barCount = 64;
    const barW = W / barCount;
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor(i * bufferLength / barCount);
      const val = freqData[idx] / 255;
      const barH = val * H * 0.4;
      
      // 烟雾渐变：从朱砂底到透明顶
      const grad = ctx.createLinearGradient(0, H, 0, H - barH);
      grad.addColorStop(0, `rgba(192, 57, 43, ${0.3 * val})`);
      grad.addColorStop(0.5, `rgba(201, 168, 108, ${0.15 * val})`);
      grad.addColorStop(1, 'rgba(201, 168, 108, 0)');
      
      ctx.fillStyle = grad;
      // 烟雾不规整：加随机偏移
      const wobble = Math.sin(vizTime * 2 + i * 0.3) * 2;
      ctx.fillRect(i * barW + wobble, H - barH, barW - 1, barH);
    }
    
    // --- 墨粒子（飘散的符墨）---
    inkParticles.forEach(p => {
      p.x += p.vx + Math.sin(vizTime + p.life * 10) * 0.3;
      p.y += p.vy;
      p.life -= 0.003;
      
      if (p.life <= 0 || p.y < 0) {
        p.x = Math.random() * W;
        p.y = H * 0.3 + Math.random() * H * 0.4;
        p.life = 1;
        p.vy = -Math.random() * 0.8 - 0.2;
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 168, 108, ${p.opacity * p.life})`;
      ctx.fill();
    });
    
    // --- 中央符文标记 ---
    ctx.save();
    ctx.font = '16px "Noto Serif SC"';
    ctx.fillStyle = `rgba(201, 168, 108, ${0.3 + Math.sin(vizTime * 1.5) * 0.15})`;
    ctx.textAlign = 'center';
    if (currentMode) {
      const mode = MODES[currentMode];
      ctx.fillText(mode.sealPrefix + mode.sealChar, W / 2, H * 0.12);
    }
    ctx.restore();
    
    // --- 八卦方位标记 ---
    ctx.save();
    ctx.font = '10px "Noto Serif SC"';
    ctx.fillStyle = 'rgba(201, 168, 108, 0.2)';
    const dirs = ['北','東','南','西'];
    dirs.forEach((d, i) => {
      const angle = (i * Math.PI / 2) - Math.PI / 2;
      const rx = W / 2 + Math.cos(angle) * (W * 0.42);
      const ry = H / 2 + Math.sin(angle) * (H * 0.38);
      ctx.fillText(d, rx, ry);
    });
    ctx.restore();
    
    animFrame = requestAnimationFrame(draw);
  }
  
  draw();
}

// ========== 背景粒子 ==========
function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  const particles = [];
  const numParticles = 60;
  
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 168, 108, ${p.opacity})`;
      ctx.fill();
    });
    
    // Draw connections
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(201, 168, 108, ${0.1 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// ========== 交互逻辑 ==========
function selectMode(mode) {
  currentMode = mode;
  const config = MODES[mode];
  
  // Update UI
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  
  // Update seal
  document.getElementById('seal-text').textContent = config.sealPrefix + config.sealChar;
  
  // Update beat frequency
  document.getElementById('beat-freq').value = config.beatFreq;
  document.getElementById('base-freq').value = config.baseFreq;
  updateParams();
  
  // Enable start
  document.getElementById('start-btn').disabled = false;
  
  // Update status
  document.getElementById('status-text').textContent = `已選擇：${config.name}模式 · ${config.element}行 · 面${config.direction}方`;
}

function updateParams() {
  const baseFreq = document.getElementById('base-freq').value;
  const beatFreq = document.getElementById('beat-freq').value;
  const volume = document.getElementById('volume').value;
  const ambient = document.getElementById('ambient').value;
  
  document.getElementById('base-freq-val').textContent = baseFreq + ' Hz';
  document.getElementById('beat-freq-val').textContent = beatFreq + ' Hz';
  document.getElementById('volume-val').textContent = volume + '%';
  document.getElementById('ambient-val').textContent = ambient + '%';
  
  // Update live audio if playing
  if (isPlaying) {
    oscillatorL.frequency.value = parseFloat(baseFreq);
    oscillatorR.frequency.value = parseFloat(baseFreq) + parseFloat(beatFreq);
    gainNode.gain.value = volume * 0.01;
  }
}

function startSession() {
  if (!currentMode) return;
  
  initAudio();
  
  // 确保AudioContext激活
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('AudioContext resumed');
      actuallyStart();
    });
  } else {
    actuallyStart();
  }
}

function actuallyStart() {
  const config = MODES[currentMode];
  const userInput = document.getElementById('user-input').value;
  
  // Start binaural beat
  const baseFreq = parseFloat(document.getElementById('base-freq').value);
  const beatFreq = parseFloat(document.getElementById('beat-freq').value);
  const volume = parseFloat(document.getElementById('volume').value);
  const ambientVol = parseFloat(document.getElementById('ambient').value);
  
  createBinauralBeat(baseFreq, beatFreq, volume);
  createAmbientNoise(config.ambientType, ambientVol);
  isPlaying = true;
  
  // Generate and render incantation
  const incantation = generateIncantation(currentMode, userInput);
  
  // Delayed reveal - ritual pacing
  setTimeout(() => renderIncantation(incantation), 2000);
  
  // Update UI
  document.getElementById('status-dot').classList.add('active');
  document.getElementById('status-text').textContent = `祝由進行中 · ${config.name} · 雙耳節拍 ${beatFreq}Hz`;
  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').disabled = false;
  
  // Start visualizer
  initVisualizer();
}

function stopSession() {
  if (oscillatorL) { oscillatorL.stop(); oscillatorL = null; }
  if (oscillatorR) { oscillatorR.stop(); oscillatorR = null; }
  if (ambientNode) { ambientNode.stop(); ambientNode = null; }
  
  isPlaying = false;
  
  document.getElementById('status-dot').classList.remove('active');
  document.getElementById('status-text').textContent = '祝由已結束 · 歸於平常';
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').disabled = true;
  document.getElementById('zhuyou-output').classList.remove('visible');
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initBackground();
  updateParams();
});

// ========== 音频测试 ==========
function testAudio() {
  const debug = document.getElementById('debug-info');
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    debug.textContent = 'AudioContext state: ' + ctx.state;
    
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        debug.textContent = 'AudioContext resumed: ' + ctx.state;
        playTestTone(ctx);
      });
    } else {
      playTestTone(ctx);
    }
  } catch(e) {
    debug.textContent = 'ERROR: ' + e.message;
  }
}

function playTestTone(ctx) {
  const debug = document.getElementById('debug-info');
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 440;
  gain.gain.value = 0.3;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc.stop(ctx.currentTime + 1.5);
  debug.textContent = '播放440Hz测试音... (应听到1.5秒嗡嗡声)';
}