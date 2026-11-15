/**
 * ONLINE EXAM SYSTEM - COUNTDOWN TIMER (timer.js)
 * Clean, lightweight timer demonstrating setInterval and automatic submission.
 * Strictly gated by candidate authentication and active paper lock state.
 */

let timeLeft = 600; // 10 minutes = 600 seconds

function startExamTimer() {
    const timerDisplay = document.getElementById('timerText');
    const examForm = document.getElementById('examForm');

    if (!timerDisplay || !examForm) return;

    const timerInterval = setInterval(() => {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;

        let formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        let formattedSeconds = seconds < 10 ? '0' + seconds : seconds;

        timerDisplay.textContent = `${formattedMinutes}:${formattedSeconds}`;

        if (timeLeft <= 120 && timeLeft > 0) {
            timerDisplay.parentElement.classList.add('pulse-warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Examination time has expired! Your responses are being submitted automatically.");
            if (examForm) {
                examForm.submit();
            }
        }

        timeLeft--;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Only run timer if candidate is authenticated and paper is not locked
    const userRaw = localStorage.getItem('examUser') || sessionStorage.getItem('examUser');
    if (!userRaw) {
        // Unauthenticated visitor (Option 2: Protected Mode) - timer remains dormant
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = (urlParams.get('subject') || 'WT').toUpperCase();
    let normalizedSubj = subjectParam;
    if (normalizedSubj === 'CS201') normalizedSubj = 'WT';
    else if (normalizedSubj === 'CS202') normalizedSubj = 'DS';
    else if (normalizedSubj === 'CS203') normalizedSubj = 'DBMS';

    // Locked paper checks — all base subjects (WT, DS, DBMS) and custom subjects
    try {
        const rawBaseState = localStorage.getItem('basePaperStatus') || sessionStorage.getItem('basePaperStatus');
        const baseState = rawBaseState ? JSON.parse(rawBaseState) : { WT: 'active', DS: 'active', DBMS: 'locked' };

        // Check base subject lock
        if (['WT', 'DS', 'DBMS'].includes(normalizedSubj)) {
            if (baseState[normalizedSubj] === 'locked') {
                return; // Paper sealed by admin
            }
            // Legacy: also check dbmsUnlocked key
            if (normalizedSubj === 'DBMS') {
                const legacy = (localStorage.getItem('dbmsUnlocked') || sessionStorage.getItem('dbmsUnlocked')) === '1';
                const dbmsActive = baseState['DBMS'] === 'active' || legacy;
                if (!dbmsActive) return;
            }
        } else {
            // Check custom subject lock
            const rawExtras = localStorage.getItem('adminExtraSubjects') || sessionStorage.getItem('adminExtraSubjects');
            const extras = rawExtras ? JSON.parse(rawExtras) : [];
            const customSubj = extras.find(e => 
                (e.code && e.code.toUpperCase() === normalizedSubj) ||
                (e.course_code && e.course_code.toUpperCase() === normalizedSubj) ||
                (e.name && e.name.toUpperCase() === normalizedSubj)
            );
            if (!customSubj || customSubj.status === 'locked') {
                return; // Unregistered or locked
            }
        }
    } catch (e) {}

    startExamTimer();
});
