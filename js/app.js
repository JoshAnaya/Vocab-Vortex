// --- DATA ---
let originalVocabList = [];

// --- STATE ---
let activeList = [];
let currentTab = 'study';
let quizDifficulty = null;

let studyIndex = 0;
let quizIndex = 0;
let streak = 0;
let correctCount = 0;
let isProcessing = false;
let questionStartTime = 0;
let speedBonuses = 0;

// Timing State
let quizStartTime = 0;
let quizTimerInterval = null;

// --- DOM ---
const body = document.getElementById('app-body');
const cardDisplay = document.getElementById('card-display');
const controlsArea = document.getElementById('controls-area');
const footerNav = document.getElementById('footer-nav');
const streakContainer = document.getElementById('streak-container');
const streakCount = document.getElementById('streak-count');
const timerContainer = document.getElementById('timer-container');
const timerDisplay = document.getElementById('timer-display');
const weekTitle = document.getElementById('week-title');

// --- INIT ---
function init() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
    }
    loadVocabData();
}

async function loadVocabData() {
    try {
        const response = await fetch('vocab.json?t=' + new Date().getTime());

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        originalVocabList = data.words;
        weekTitle.innerText = data.title || "Current Week";

        restartApp();
    } catch (error) {
        console.error("Could not load vocab:", error);
        weekTitle.innerText = "Error Loading Data";

        // ERROR SCREEN
        cardDisplay.innerHTML = `
            <div class="text-center p-8 flex flex-col items-center justify-center h-full">
                <div class="text-6xl mb-4">⚠️</div>
                <h2 class="text-2xl font-black text-red-500 mb-2 fun-font">Data Error</h2>
                <p class="text-gray-600 dark:text-gray-400 font-bold mb-4 text-sm">Could not load 'vocab.json'.</p>
                <p class="text-xs text-gray-400 bg-gray-100 dark:bg-slate-900 p-3 rounded-lg text-left overflow-x-auto w-full font-mono mb-6 border-2 border-gray-200 dark:border-slate-700">
                    ${error.message}<br>
                    <span class="opacity-50 block mt-1">(Check if vocab.json exists in GitHub)</span>
                </p>
                <button onclick="location.reload()" class="btn-3d w-full bg-fun-purple hover:bg-fun-purpleDark text-white px-6 py-4 rounded-xl font-bold shadow-lg border-b-4 border-purple-800">
                    Try Again 🔄
                </button>
            </div>
        `;
        controlsArea.innerHTML = "";
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
    clickSound();
}

function restartApp() {
    if (originalVocabList.length === 0) return;

    activeList = JSON.parse(JSON.stringify(originalVocabList));
    shuffleArray(activeList);
    stopTimer();

    studyIndex = 0;
    quizIndex = 0;
    correctCount = 0;
    streak = 0;
    speedBonuses = 0;
    isProcessing = false;
    quizDifficulty = null;

    updateStreakUI();

    if (currentTab === 'quiz') {
        quizDifficulty = null;
        renderDifficultySelect();
    } else {
        setTab('study');
    }
}

function setTab(newTab) {
    clickSound();

    if (newTab === 'quiz') {
        quizDifficulty = null;
        stopTimer();
    }

    currentTab = newTab;
    const btnStudy = document.getElementById('btn-study');
    const btnQuiz = document.getElementById('btn-quiz');

    const inactiveClass = "flex-1 py-3 rounded-xl font-black text-gray-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-all text-sm md:text-base";
    const activeClass = "flex-1 py-3 rounded-xl font-black text-fun-purple dark:text-white bg-white dark:bg-slate-800 shadow-sm transition-all ring-2 ring-purple-100 dark:ring-slate-600 text-sm md:text-base";

    if (currentTab === 'study') {
        btnStudy.className = activeClass;
        btnQuiz.className = inactiveClass;
        footerNav.classList.remove('hidden');
        streakContainer.classList.add('hidden');
        timerContainer.classList.add('hidden');
        renderStudy();
    } else {
        btnQuiz.className = activeClass;
        btnStudy.className = inactiveClass;
        footerNav.classList.add('hidden');
        renderDifficultySelect();
    }
}

// --- TIMER FUNCTIONS ---
function startTimer() {
    stopTimer();
    quizStartTime = Date.now();
    timerContainer.classList.remove('hidden');
    timerDisplay.innerText = "0s";

    quizTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        timerDisplay.innerText = elapsed + "s";
    }, 1000);
}

function stopTimer() {
    if (quizTimerInterval) {
        clearInterval(quizTimerInterval);
        quizTimerInterval = null;
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getBestTime(diff) {
    const stored = localStorage.getItem(`vocab_best_${diff}`);
    return stored ? parseInt(stored) : null;
}

function setBestTime(diff, ms) {
    localStorage.setItem(`vocab_best_${diff}`, ms);
}

// --- STUDY MODE ---
function renderStudy() {
    if (activeList.length === 0) return;
    const item = activeList[studyIndex];
    updateProgressBar(studyIndex, activeList.length);

    cardDisplay.innerHTML = `
        <div class="bg-blue-50 dark:bg-slate-800 p-6 rounded-3xl mb-4 w-full border-2 border-blue-100 dark:border-slate-700 relative group">
            
            <div class="flex justify-between items-start">
                <h2 class="text-3xl md:text-4xl font-black text-fun-blue dark:text-blue-400 fun-font capitalize mb-2 floating">${item.word}</h2>
            </div>

            <div class="w-16 h-1 bg-blue-200 dark:bg-blue-900 rounded-full mb-4"></div>
            <p class="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium text-left">"${item.definition}"</p>
        </div>
        
        <div class="bg-yellow-50 dark:bg-slate-800 border-l-8 border-fun-yellow p-4 w-full text-left rounded-r-xl relative">
            <p class="italic text-gray-600 dark:text-gray-400 text-sm md:text-md"><span class="font-bold text-yellow-600 dark:text-yellow-500">Example:</span> ${item.sentence}</p>
        </div>
    `;
    controlsArea.innerHTML = ``;
}

function nextWord() {
    if (studyIndex < activeList.length - 1) {
        studyIndex++;
        renderStudy();
    } else {
        setTab('quiz');
    }
}
function prevWord() {
    if (studyIndex > 0) {
        studyIndex--;
        renderStudy();
    }
}

// --- DIFFICULTY SELECT ---
function renderDifficultySelect() {
    streakContainer.classList.add('hidden');
    timerContainer.classList.add('hidden');
    updateProgressBar(0, 10); // clear bar

    const bestEasy = getBestTime('easy');
    const bestMedium = getBestTime('medium');
    const bestHard = getBestTime('hard');

    const formatBest = (ms) => ms ? `🏆 Best: ${formatTime(ms)}` : 'No record yet';

    cardDisplay.innerHTML = `
        <h2 class="text-3xl font-black text-fun-purple dark:text-white mb-1 fun-font">Let's Play!</h2>
        <p class="text-gray-400 dark:text-gray-500 font-bold text-sm mb-6">Pick your challenge level</p>
        
        <div class="w-full space-y-4">
            <button onclick="clickSound(); startQuiz('easy')" class="btn-3d w-full p-4 bg-green-50 dark:bg-slate-800 border-fun-green border-b-4 rounded-2xl flex items-center justify-between group hover:bg-green-100 dark:hover:bg-slate-700 transition-colors">
                <div class="text-left">
                    <div class="font-black text-fun-green dark:text-green-400 text-lg md:text-xl">Easy Peasy</div>
                    <div class="text-green-600 dark:text-green-500 text-[10px] md:text-xs font-bold uppercase opacity-70">${formatBest(bestEasy)}</div>
                </div>
                <span class="text-3xl group-hover:scale-125 transition">😃</span>
            </button>
            
            <button onclick="clickSound(); startQuiz('medium')" class="btn-3d w-full p-4 bg-yellow-50 dark:bg-slate-800 border-fun-yellow border-b-4 rounded-2xl flex items-center justify-between group hover:bg-yellow-100 dark:hover:bg-slate-700 transition-colors">
                <div class="text-left">
                    <div class="font-black text-fun-yellow text-lg md:text-xl">Getting Tricky</div>
                    <div class="text-yellow-600 text-[10px] md:text-xs font-bold uppercase opacity-70">${formatBest(bestMedium)}</div>
                </div>
                <span class="text-3xl group-hover:scale-125 transition">🤔</span>
            </button>

            <button onclick="clickSound(); startQuiz('hard')" class="btn-3d w-full p-4 bg-red-50 dark:bg-slate-800 border-fun-red border-b-4 rounded-2xl flex items-center justify-between group hover:bg-red-100 dark:hover:bg-slate-700 transition-colors">
                <div class="text-left">
                    <div class="font-black text-fun-red text-lg md:text-xl">Big Brain Mode</div>
                    <div class="text-red-600 text-[10px] md:text-xs font-bold uppercase opacity-70">${formatBest(bestHard)}</div>
                </div>
                <span class="text-3xl group-hover:scale-125 transition">🤯</span>
            </button>
        </div>
    `;
    controlsArea.innerHTML = "";
}

function startQuiz(diff) {
    quizDifficulty = diff;
    activeList = JSON.parse(JSON.stringify(originalVocabList));
    shuffleArray(activeList);
    quizIndex = 0;
    streak = 0;
    correctCount = 0;
    speedBonuses = 0;
    updateStreakUI();
    startTimer();
    renderQuizQuestion();
}

// --- QUIZ LOGIC ---
function renderQuizQuestion() {
    if (quizIndex >= activeList.length) {
        renderFinalScore();
        return;
    }

    questionStartTime = Date.now();

    const item = activeList[quizIndex];
    updateProgressBar(quizIndex, activeList.length);
    streakContainer.classList.remove('hidden');

    cardDisplay.classList.remove('card-enter');
    void cardDisplay.offsetWidth;
    cardDisplay.classList.add('card-enter');

    if (quizDifficulty === 'easy') {
        renderMultipleChoice(item, 4);
    } else if (quizDifficulty === 'medium') {
        renderMultipleChoice(item, 10);
    } else {
        renderWriteMode(item);
    }
}

function renderMultipleChoice(item, count) {
    const options = [item.word];
    const pool = originalVocabList.map(i => i.word).filter(w => w !== item.word);
    while (options.length < count && pool.length > 0) {
        const r = Math.floor(Math.random() * pool.length);
        options.push(pool[r]);
        pool.splice(r, 1);
    }
    shuffleArray(options);

    const gridCols = count > 4 ? "grid-cols-2" : "grid-cols-2";
    const btnHeight = count > 4 ? "h-14 text-sm" : "h-20 md:h-24 text-lg md:text-xl";

    cardDisplay.innerHTML = `
        <div class="text-[10px] md:text-xs text-fun-purple dark:text-purple-400 uppercase tracking-widest font-bold mb-2">What word means:</div>
        <p class="text-xl md:text-2xl text-gray-800 dark:text-gray-200 mb-4 font-bold leading-tight fun-font">"${item.definition}"</p>
    `;

    controlsArea.innerHTML = `
        <div class="grid ${gridCols} gap-3" id="options-grid">
            ${options.map(opt => `
                <button onclick="checkChoice(this, '${opt.replace(/'/g, "\\'")}')" 
                    data-word="${opt.replace(/'/g, "\\'")}"
                    class="btn-3d ${btnHeight} bg-indigo-50 dark:bg-slate-700 border-4 border-indigo-100 dark:border-slate-600 rounded-2xl text-indigo-900 dark:text-white font-black hover:border-fun-purple hover:bg-white dark:hover:bg-slate-600 transition-all flex items-center justify-center break-words text-center leading-none px-1 shadow-sm">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;
}

function checkChoice(btn, selected) {
    if (isProcessing) return;
    const correct = activeList[quizIndex].word;
    const grid = document.getElementById('options-grid');
    const buttons = grid.getElementsByTagName('button');

    if (selected === correct) {
        btn.classList.remove('bg-indigo-50', 'border-indigo-100', 'text-indigo-900');
        btn.classList.add('bg-green-100', 'border-fun-green', 'text-green-700', 'dark:bg-green-900', 'dark:border-green-600', 'dark:text-green-100');
        handleResult(true, btn);
    } else {
        btn.classList.remove('bg-indigo-50', 'border-indigo-100', 'text-indigo-900');
        btn.classList.add('bg-red-100', 'border-fun-red', 'text-red-700', 'dark:bg-red-900', 'dark:border-red-600', 'dark:text-red-100', 'shake');
        for (let b of buttons) {
            if (b.getAttribute('data-word') === correct) {
                b.classList.remove('bg-indigo-50', 'border-indigo-100', 'text-indigo-900');
                b.classList.add('bg-green-100', 'border-fun-green', 'text-green-700', 'dark:bg-green-900', 'dark:border-green-600', 'dark:text-green-100', 'bounce-hint');
            }
        }
        handleResult(false);
    }
}

function renderWriteMode(item) {
    cardDisplay.innerHTML = `
        <div class="text-[10px] md:text-xs text-fun-purple dark:text-purple-400 uppercase tracking-widest font-bold mb-4">What word means:</div>
        <p class="text-xl md:text-2xl text-gray-800 dark:text-gray-200 mb-6 font-bold fun-font">"${item.definition}"</p>
    `;

    controlsArea.innerHTML = `
        <div class="relative mb-4">
            <input type="text" id="quiz-input" 
                class="w-full bg-gray-50 dark:bg-slate-900 border-4 border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-xl md:text-2xl outline-none focus:border-fun-purple focus:ring-0 transition-all text-center font-black text-gray-700 dark:text-white placeholder-gray-300" 
                placeholder="Type here..." 
                autocomplete="off"
                onkeypress="if(event.key==='Enter') checkInput()">
            <button onclick="giveHint()" class="absolute right-4 top-4 text-gray-400 hover:text-fun-purple font-bold text-sm" title="Get Hint (First Letter)">💡</button>
        </div>
        <div id="diff-area" class="h-8 text-center text-lg font-mono font-bold mb-2 tracking-widest"></div>
        <div class="flex gap-3">
            <button onclick="giveUp()" class="btn-3d w-1/3 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-bold py-3 rounded-xl border-gray-300 dark:border-slate-900">
                Pass 🏳️
            </button>
            <button onclick="checkInput()" class="btn-3d w-2/3 bg-fun-purple dark:bg-purple-700 text-white font-bold py-3 rounded-xl border-fun-purpleDark dark:border-purple-900 shadow-lg">
                Check It!
            </button>
        </div>
    `;
    setTimeout(() => document.getElementById('quiz-input').focus(), 100);
}

function giveHint() {
    const correct = activeList[quizIndex].word;
    const input = document.getElementById('quiz-input');
    if (input.value === "") {
        input.value = correct[0];
        input.focus();
    }
}

function giveUp() {
    if (isProcessing) return;
    const correct = activeList[quizIndex].word;
    const input = document.getElementById('quiz-input');
    input.value = correct;
    input.classList.add('text-fun-red');
    handleResult(false);
}

function checkInput() {
    if (isProcessing) return;

    const inputEl = document.getElementById('quiz-input');
    const diffEl = document.getElementById('diff-area');
    const userVal = inputEl.value.trim();
    const correctVal = activeList[quizIndex].word;

    if (userVal.toLowerCase() === correctVal.toLowerCase()) {
        inputEl.classList.add('border-fun-green', 'bg-green-50', 'text-fun-green');
        handleResult(true, inputEl);
    } else {
        errorSound();
        inputEl.classList.add('shake', 'border-fun-red');
        setTimeout(() => inputEl.classList.remove('shake'), 500);

        let diffHtml = "";
        const maxLen = Math.max(userVal.length, correctVal.length);
        for (let i = 0; i < maxLen; i++) {
            const u = userVal[i] || "_";
            const c = correctVal[i] || "";
            if (u.toLowerCase() === c.toLowerCase()) {
                diffHtml += `<span class="text-fun-green">${c}</span>`;
            } else {
                diffHtml += `<span class="text-fun-red border-b-2 border-fun-red">${c || "?"}</span>`;
            }
        }
        diffEl.innerHTML = diffHtml;
        streak = 0;
        updateStreakUI();
    }
}

function handleResult(success, targetEl = null) {
    isProcessing = true;
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    const isFast = timeTaken < 5;

    if (success) {
        streak++;
        correctCount++;
        if (isFast) speedBonuses++;
        successSound();
        fireConfetti(streak * 15);

        if (isFast) {
            const badge = document.createElement('div');
            badge.innerHTML = '⚡ FAST!';

            let style = '';
            let posClasses = 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const top = rect.top + (rect.height / 2);
                const left = rect.left + (rect.width / 2);
                style = `position: fixed; top: ${top}px; left: ${left}px; transform: translate(-50%, -50%) rotate(-12deg); pointer-events: none;`;
                posClasses = '';
            } else {
                posClasses += ' rotate-12';
            }

            badge.className = `absolute ${posClasses} bg-fun-yellow text-white font-black text-xl md:text-4xl border-2 md:border-4 border-white shadow-xl z-[100] px-3 py-1 md:px-6 md:py-2 rounded-xl animate-bounce whitespace-nowrap`;
            if (style) badge.style.cssText = style;

            document.body.appendChild(badge);
            setTimeout(() => badge.remove(), 1000);
        }

    } else {
        streak = 0;
        errorSound();
    }
    updateStreakUI();

    const delay = success ? 1000 : 1500;

    setTimeout(() => {
        quizIndex++;
        isProcessing = false;
        renderQuizQuestion();
    }, delay);
}

// --- UI HELPERS ---
function updateStreakUI() {
    streakCount.innerText = streak;
    if (streak > 0) {
        streakContainer.classList.remove('hidden');
        streakContainer.classList.remove('scale-90');
        streakContainer.classList.add('scale-110');
        setTimeout(() => {
            streakContainer.classList.remove('scale-110');
            streakContainer.classList.add('scale-90');
        }, 200);
    } else {
        streakContainer.classList.add('hidden');
    }
}

function updateProgressBar(idx, total) {
    document.getElementById('counter').innerText = `${idx + 1}/${total}`;

    const chunkIndex = Math.floor(idx / 2);

    for (let i = 0; i < 5; i++) {
        const chunk = document.getElementById(`chunk-${i + 1}`);
        if (i < chunkIndex) {
            chunk.className = "flex-1 rounded-full bg-fun-green dark:bg-green-600 shadow-sm transition-all duration-500";
        } else if (i === chunkIndex) {
            const isSecond = (idx % 2 !== 0);
            chunk.className = isSecond
                ? "flex-1 rounded-full bg-fun-green dark:bg-green-600 opacity-80 animate-pulse transition-all duration-500"
                : "flex-1 rounded-full bg-green-200 dark:bg-green-900 animate-pulse transition-all duration-500";
        } else {
            chunk.className = "flex-1 rounded-full bg-gray-200 dark:bg-slate-700 transition-all duration-500";
        }
    }
}

function renderFinalScore() {
    stopTimer();
    const endTime = Date.now();
    const durationMs = endTime - quizStartTime;

    streakContainer.classList.add('hidden');
    timerContainer.classList.add('hidden');

    const pct = Math.round((correctCount / activeList.length) * 100);

    let isNewRecord = false;
    let currentBest = getBestTime(quizDifficulty);

    if (pct === 100) {
        if (!currentBest || durationMs < currentBest) {
            setBestTime(quizDifficulty, durationMs);
            isNewRecord = true;
            currentBest = durationMs;
        }
    }

    let msg = "";
    let title = "Finished!";
    let showConfetti = false;

    if (pct === 100) {
        msg = "PERFECT SCORE! 🌟";
        showConfetti = true;
    } else if (pct >= 80) {
        msg = "Awesome work! 😎";
        showConfetti = true;
    } else if (pct >= 60) {
        msg = "Not bad! 👍";
        showConfetti = true;
    } else {
        msg = "Time to study more. 📚";
        title = "Keep Practicing";
        showConfetti = false;
    }

    let timeHtml = `
        <div class="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl mb-6 w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="text-gray-500 dark:text-gray-400 font-bold">Time Taken:</span>
                <span class="text-xl font-mono font-black text-gray-800 dark:text-white">${formatTime(durationMs)}</span>
            </div>
            ${pct === 100
            ? (isNewRecord
                ? `<div class="text-fun-green font-black animate-bounce">🏆 NEW RECORD! 🏆</div>`
                : `<div class="text-gray-400 text-sm font-bold">Best: ${formatTime(currentBest)}</div>`)
            : `<div class="text-orange-400 text-xs font-bold uppercase tracking-wide">Get 100% to save time!</div>`
        }
            ${speedBonuses > 0 ? `<div class="mt-2 text-fun-yellow font-black text-sm">⚡ ${speedBonuses} Speed Bonuses!</div>` : ''}
        </div>
    `;

    cardDisplay.innerHTML = `
        <div class="text-8xl mb-4 ${showConfetti ? 'animate-bounce' : ''}">${showConfetti ? '🎉' : '💪'}</div>
        <h2 class="text-4xl font-black text-fun-purple dark:text-white mb-2 fun-font">${title}</h2>
        <p class="text-gray-400 font-bold mb-6 text-lg">${msg}</p>
        
        <div class="flex items-center justify-center gap-4 mb-2 w-full">
                <div class="text-6xl font-black text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-slate-800 p-4 rounded-2xl shadow-inner border-4 border-gray-200 dark:border-slate-700">
                ${pct}%
                </div>
        </div>
        ${timeHtml}
    `;

    controlsArea.innerHTML = `
        <button onclick="clickSound(); restartApp()" class="btn-3d w-full py-4 rounded-xl bg-fun-purple hover:bg-fun-purpleDark text-white font-bold text-xl border-fun-purpleDark border-b-4 shadow-xl">
            Play Again 🔄
        </button>
    `;

    if (showConfetti) {
        fireConfetti(200);
    }
}

// --- AUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function clickSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function successSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.3);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function errorSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.2);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

// --- UTIL ---
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// --- CONFETTI ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function fireConfetti(amount = 50) {
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: canvas.width / 2, y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30 - 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5, rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15, life: 1, decay: Math.random() * 0.02 + 0.01
        });
    }
    requestAnimationFrame(updateConfetti);
}
function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.rotation += p.rotationSpeed; p.life -= p.decay;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
        if (p.life <= 0) particles.splice(index, 1);
    });
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
}

init();
