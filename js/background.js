var settings,
    timerRunning = false,
    rules = {
        "50-10": {
            "name" : "50-10",
            "workTime" : 50 * 60, 
            "breakTime" : 10 * 60 
        },
        "pomodoro": {
            "name" : "Pomodoro",
            "workTime" : 25 * 60, 
            "breakTime" : 5 * 60 
        },
        "custom": {
            "name" : "Custom",
            "workTime" : 30 * 60, 
            "breakTime" : 10 * 60 
        }
    };

if (typeof localStorage.settings === "undefined") {
    settings = {
        "rule" : "pomodoro",
        "workTime" : rules.pomodoro.workTime,
        "breakTime" : rules.pomodoro.breakTime,
        "playSound" : 0
    };
    localStorage.settings = JSON.stringify(settings); 
} else {
    settings = $.parseJSON(localStorage["settings"]);
    if(settings.rule == "custom") {
        rules["custom"].workTime = settings.workTime * 60;
        rules["custom"].breakTime = settings.breakTime * 60;
    }
}

var notification, breakTime, workTime, rule, iCloseNotification = 0, timer, nextBreak, breakTimeLeft;
resetTimes();
$(document).ready(function () {
    chrome.notifications.onButtonClicked.addListener(handleNotificationInteraction);
    chrome.notifications.onClosed.addListener(handleNotificationClosed);
    waitForNext();
    updateBadge();
});

function resetTimes() {
    "use strict";
    if (settings.rule === "custom") {
        breakTime = settings.breakTime * 60;
        workTime = settings.workTime * 60;
    } else {
        breakTime = rules[settings.rule].breakTime;
        workTime = rules[settings.rule].workTime;
    }
}

function displayNotification() {
    "use strict";
    notification = chrome.notifications.create('bh-notification', {
        type: 'basic',
        title: 'Pomodoro and friends',
        message: "You've been working for quite a while. Take a break.",
        iconUrl: 'icon128.png',
        buttons: [
          { title: "Take a break" },
          { title: "Continue working" }
        ],
        requireInteraction: true,
    });
    doSoundNotification();
}

function handleNotificationInteraction(notificationId, buttonIndex) {
  if (notificationId === 'bh-notification') {
    if (buttonIndex === 0) {
      doBreak();
    } else if (buttonIndex === 1) {
      skipBreak();
      closeNotification();
    }
  }
}

function handleNotificationClosed(notificationId, byUser) {
  if (notificationId === 'bh-notification' && byUser && breakTimeLeft === 0) {
    skipBreak();
  }
}

function closeNotification() {
    "use strict";
    iCloseNotification = 1;
    chrome.notifications.clear('bh-notification', function () {
        notification = null;
        iCloseNotification = 0;
    });
}

function skipBreak() {
    "use strict";
    closeNotification();
    waitForNext();
}

function doBreak() {
    breakTimeLeft = breakTime;
    timer = setTimeout(waitAndClose, 1000 * breakTime);
    updateBreakNotificationTimer();
}

function updateBreakNotificationTimer() {
  if (breakTimeLeft <= 0){
    doSoundNotification();
    return;
    };
  breakTimeLeft -= 1;
  var progress = breakTimeLeft / breakTime * 100;
  chrome.notifications.update('bh-notification', {
    type: 'progress',
    title: 'Pomodoro and friends',
    message: "Time left in your break ($%1s).".replace("$%1s", secondsToClock(breakTimeLeft)),
    iconUrl: 'icon128.png',
    buttons: [],
    progress: Math.round(progress)
  });
  setTimeout(updateBreakNotificationTimer, 1000);
};


function waitAndClose() {
    closeNotification();
    waitForNext();
}

function waitForNext() {
    timer = setTimeout(displayNotification, 1000 * workTime);
    timerRunning = true;
    setNextBreak(1000 * workTime);
}

function updateSettings() {
    localStorage.settings = JSON.stringify(settings);
    reassignVariables();
}


function reassignVariables() {
    settings = $.parseJSON(localStorage.settings);
    if (settings.rule === "custom") {
        rules.custom.workTime = settings.workTime;
        rules.custom.breakTime = settings.breakTime;
    }
    resetTimes();
    resetTimer();
}

function resetTimer() {
    stopTimer();
    if (notification !== null) {
        closeNotification();
    }
    waitForNext();
}

function stopTimer() {
    clearTimeout(timer);
    setNextBreak(0);
    timerRunning = false;
}

function getCurrentTimestamp() {
    return (new Date()).getTime();
}

function setNextBreak(time) {
    nextBreak = getCurrentTimestamp() + time;
}

function timeLeft() {
    var left = nextBreak - getCurrentTimestamp();
    //var left = nextBreak;
    return (left > 0) ? left : 0;
}

function updateBadgeClock() {
    var left = Math.round(timeLeft() / 1000),
        tempLeft,
        h,
        m,
        s;
    if (left > 0) {
        h = Math.floor(left / 3600);
        tempLeft = left % 3600;
        s = tempLeft % 60;
        m = (tempLeft - s) / 60;
    if (left > 300) {
        chrome.browserAction.setBadgeBackgroundColor({color : [0, 255, 0, 255]});
    }

    if (left <= 300 && left > 60) {
        chrome.browserAction.setBadgeBackgroundColor({color : [255, 140, 0, 255]});
    }

    if (left <= 60) {
        chrome.browserAction.setBadgeBackgroundColor({color : [255, 0, 0, 255]});
    }
    chrome.browserAction.setBadgeText({text: m.pad(2) + ':' + s.pad(2)});

    } else {
        chrome.browserAction.setBadgeBackgroundColor({color : [255, 0, 0, 255]});
        chrome.browserAction.setBadgeText({text: '00:00'});
    }
}

function updateBadge() {
    setTimeout(updateBadge, 1000);
    updateBadgeClock();
}

function playSound ( url ) {
    (new Audio(url)).play();
}

function doSoundNotification() {
  if (settings.playSound) {
    playSound('notification.mp3');
  }
}

function secondsToClock(leftSeconds) {
    var h, m, s, tempLeft;
    h = Math.floor(leftSeconds / 3600);
    tempLeft = leftSeconds % 3600;
    s = tempLeft % 60;
    m = (tempLeft - s) / 60;

    return h.pad(2) + ":" + m.pad(2) + ":" + s.pad(2);
}
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}
