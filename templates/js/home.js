let timesignalActivated = false;
let timerInterval;
let remainingSeconds = 0;
let isPaused = false;
let lastDate = new Date().getDate();
let timesignalInterval;

$('#searchbox').autocomplete({
    source: function (request, response) {
        var url = "/suggest?keyword=" + request.term;
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = function() {
            response(JSON.parse(xhr.responseText));
        }
        xhr.send();
    },
    delay: 300
});

$('#searchbox').on('keydown', function(event) {
    if (event.key === 'Enter') {
        const command = this.value.trim().toLowerCase();
        if (command === '/timesignal on') {
            timesignalActivated = true;
            updateStatusMessage("時報機能が有効になりました！");
            event.preventDefault();
        } else if (command === '/timesignal off') {
            timesignalActivated = false;
            updateStatusMessage("時報機能が無効になりました！");
            event.preventDefault();
        } else if (command === '/timer') {
            $('.timer').show();
            event.preventDefault();
        }
        this.value = '';  // エンターを押したら検索バー内の文字を消す
    }
});

function displayTime() {
    const padZero = value => value.toString().padStart(2, '0');
    const now = new Date();
    let hours = now.getUTCHours() + 9; // 日本時間に変換（UTC+9）
    if (hours >= 24) hours -= 24; // 24時を超えた場合の補正
    const minutes = padZero(now.getMinutes());
    const seconds = padZero(now.getSeconds());
    const day = padZero(now.getDate());
    const month = padZero(now.getMonth() + 1);
    const year = now.getFullYear();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // 0 を 12 に変換

    const h = padZero(displayHours);
    const currentTime = `${year}/${month}/${day} ${h}:${minutes}:${seconds} ${ampm}`;
    document.querySelector('.clock').textContent = currentTime;

    if (timesignalActivated) {
        checkTimeForTimesignal(displayHours, minutes, seconds, ampm);
    }

    if (now.getDate() !== lastDate) {
        lastDate = now.getDate();
        announceDate(year, month, day);
    }
}

function checkTimeForTimesignal(hours, minutes, seconds, ampm) {
    const alertTimes = [
        { hours: 12, ampm: 'AM' },
        { hours: 6, ampm: 'AM' },
        { hours: 12, ampm: 'PM' },
        { hours: 3, ampm: 'PM' },
        { hours: 10, ampm: 'PM' }
    ];
    const current24Hours = new Date().getUTCHours() + 9; // 日本時間に変換（UTC+9）
    if (current24Hours >= 24) current24Hours -= 24; // 24時を超えた場合の補正
    const currentAMPM = current24Hours >= 12 ? 'PM' : 'AM';
    const current12Hour = current24Hours % 12 || 12;

    if (alertTimes.some(t => t.hours === current12Hour && t.ampm === currentAMPM) && minutes === '59' && seconds >= '55') {
        playTimesignalSequence();
    }
}

function playTimesignalSequence() {
    let beepCount = 0;
    timesignalInterval = setInterval(() => {
        playBeep();
        beepCount++;
        if (beepCount >= 5) {
            clearInterval(timesignalInterval);
            announceTime();
        }
    }, 1000);
}

function announceTime() {
    const now = new Date();
    let hours = now.getUTCHours() + 9; // 日本時間に変換（UTC+9）
    if (hours >= 24) hours -= 24; // 24時を超えた場合の補正
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // 0 を 12 に変換
    const minutes = '00';

    const timeMessage = `時報: ただ今${displayHours}時${minutes}分 ${ampm}です。`;
    if (document.getElementById('soundToggle').checked) {
        speakText(timeMessage);
    }
    document.getElementById('message').textContent = timeMessage;
}

function startTimer() {
    if (isPaused) {
        resumeTimer();
        return;
    }
    const hours = parseInt(document.getElementById('timerHours').value);
    const minutes = parseInt(document.getElementById('timerMinutes').value);
    const seconds = parseInt(document.getElementById('timerSeconds').value);
    remainingSeconds = (hours * 3600) + (minutes * 60) + seconds;

    function updateTimerDisplay() {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        document.getElementById('timerDisplay').textContent = `残り: ${hours}時間 ${minutes}分 ${seconds}秒`;
        if (remainingSeconds <= 0) {
            document.getElementById('message').textContent = 'タイマーが終了しました！';
            if (document.getElementById('soundToggle').checked) {
                playBeep();
            }
            clearInterval(timerInterval);
        }
        remainingSeconds--;
    }

    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function pauseOrResumeTimer() {
    if (isPaused) {
        startTimer();
        document.getElementById('pauseButton').textContent = '一時停止';
    } else {
        clearInterval(timerInterval);
        document.getElementById('pauseButton').textContent = '再開';
    }
    isPaused = !isPaused;
}

function resetTimer() {
    clearInterval(timerInterval);
    remainingSeconds = 0;
    isPaused = false;
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('message').textContent = '';
    document.getElementById('pauseButton').textContent = '一時停止';
}

function updateStatusMessage(message) {
    document.getElementById('statusMessage').textContent = message;
    setTimeout(() => {
        document.getElementById('statusMessage').textContent = '';
    }, 5000);
}

function announceDate(year, month, day) {
    const dateMessage = `今日は${year}年${month}月${day}日です`;
    if (document.getElementById('soundToggle').checked) {
        speakText(dateMessage);
    }
    document.getElementById('message').textContent = dateMessage;
}

function speakText(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    synth.speak(utterance);
}

function playBeep() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, context.currentTime);
    gainNode.gain.setValueAtTime(1, context.currentTime);
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
}

displayTime();
setInterval(displayTime, 1000);
