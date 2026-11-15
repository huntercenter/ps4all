// Shared functions used by both index.html and exploit.html.

function sleep(ms) {
    ms = ms || 0;
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Taken from Feyzee61's ps4jb
// Pass isModule=true only for ES module scripts (.mjs).
function getScript(source, isModule, devMode) {
    return new Promise(function (resolve, reject) {
        var gs = document.createElement('script');
        gs.src = source;
        gs.type = isModule ? 'module' : 'text/javascript';
        gs.async = false;
        gs.onload = function () { resolve(); };
        gs.onerror = function () { reject(new Error('Script load failed: ' + source)); };
        document.body.appendChild(gs);
        if (devMode) log('[Debug] Script loaded as ' + gs.type + '; ' + source, "grey");
    });
}

// Taken from Feyzee61's ps4jb
// Loads a script and waits for it to signal readiness via window.script_loaded.
// The BadHoist exploit sets window.script_loaded = 1 when it is ready.
function loadScript(script_js, isModule, devMode) {
    window.script_loaded = 0;
    return getScript(script_js, isModule, devMode).then(function () {
        return new Promise(function (resolve) {
            function waitForLoad() {
                if (window.script_loaded >= 1) {
                    resolve();
                } else {
                    setTimeout(waitForLoad, 50);
                }
            }
            waitForLoad();
        });
    });
}

function isHttps() {
    return window.location.protocol === 'https:';
}

// Works in both index.html and exploit.html
function log(message, color, consoleEl) {
    var consoleEl = consoleEl ? consoleEl : ui.consoleElement;
    var consoleEl = (typeof ui !== 'undefined' && ui.consoleElement)
        ? ui.consoleElement
        : document.getElementById('console');

    if (typeof user !== 'undefined' && user.clearLog && consoleEl) {
        consoleEl.textContent = '';
        user.clearLog = false;
    }
    if (!consoleEl) return;

    var span = document.createElement('span');
    // break text into a new line to keep it visible
    span.style.whiteSpace = "pre-wrap";
    span.textContent = message + '\n';
    if (color) span.style.color = color;
    consoleEl.appendChild(span);
}

function getReloadAfterJbValue() {
    return storage.getBoolean('reloadAfterJb', false);
}

/**
 * Increment jailbreak attempt/success counters in storage and update the UI.
 * @param {boolean} attempt   - true when a new jailbreak attempt starts.
 * @param {boolean} isSuccess - true when the jailbreak succeeds.
 * Passing both false refreshes the UI display without changing stored counts.
 */
function updateJbStats(attempt, isSuccess, revert) {
    var total = storage.getNumber('jbTotal', 0);
    var success = storage.getNumber('jbSuccess', 0);

    if (revert) {
        total--;
        storage.set('jbTotal', total);
        return;
    }

    if (attempt) {
        total++;
        storage.set('jbTotal', total);
    }
    if (isSuccess) {
        success++;
        storage.set('jbSuccess', success);
    }

    if (typeof ui !== 'undefined' && ui.successRateText && window.lang) {
        var rate = total > 0 ? ((success / total) * 100).toFixed(0) : '0';
        var displayRate = total > 0 ? rate + '%' : '-';
        ui.successRateText.textContent =
            (window.lang.successRate || 'Success Rate: ') + displayRate + ' (' + success + '/' + total + ')';
    }
}



// HR Repair start indicator: show a real spinner while the exploit runs,
// then replace it with DONE only when an exploit implementation reports success.
function showHRStartIndicator() {
    var screen = document.getElementById('initial-screen');
    if (!screen) return false;

    var startButton = document.getElementById('pslogo');
    var indicator = document.getElementById('hr-start-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'hr-start-indicator';
        indicator.className = 'hr-start-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        indicator.setAttribute('aria-busy', 'true');

        var spinner = document.createElement('div');
        spinner.id = 'hr-start-indicator-spinner';
        spinner.className = 'hr-start-indicator-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        var mainText = document.createElement('div');
        mainText.id = 'hr-start-indicator-main';
        mainText.className = 'hr-start-indicator-main';
        mainText.textContent = 'PROCESSING...';

        var arabicText = document.createElement('div');
        arabicText.id = 'hr-start-indicator-arabic';
        arabicText.className = 'hr-start-indicator-arabic';
        arabicText.setAttribute('dir', 'rtl');
        arabicText.setAttribute('lang', 'ar');
        arabicText.textContent = 'جارٍ تنفيذ العملية...';

        indicator.appendChild(spinner);
        indicator.appendChild(mainText);
        indicator.appendChild(arabicText);

        if (startButton && startButton.parentNode) {
            startButton.parentNode.insertBefore(indicator, startButton.nextSibling);
        } else {
            screen.appendChild(indicator);
        }
    }

    screen.classList.remove('hidden');
    screen.style.removeProperty('display');
    screen.classList.add('hr-starting');

    if (startButton) startButton.style.setProperty('display', 'none', 'important');

    // Hide only the initial selection/navigation controls while the indicator runs.
    var hideIds = ['click-to-start-text', 'choosejb-initial', 'scrollDown'];
    for (var i = 0; i < hideIds.length; i++) {
        var el = document.getElementById(hideIds[i]);
        if (el) el.style.setProperty('display', 'none', 'important');
    }

    indicator.classList.remove('hr-start-indicator-done');
    indicator.setAttribute('aria-busy', 'true');
    var spinnerNode = document.getElementById('hr-start-indicator-spinner');
    var mainNode = document.getElementById('hr-start-indicator-main');
    var arabicNode = document.getElementById('hr-start-indicator-arabic');
    if (spinnerNode) spinnerNode.style.removeProperty('display');
    if (mainNode) mainNode.textContent = 'PROCESSING...';
    if (arabicNode) arabicNode.textContent = 'جارٍ تنفيذ العملية...';
    return true;
}

function completeHRStartIndicator() {
    var indicator = document.getElementById('hr-start-indicator');
    if (!indicator) return false;

    var spinner = document.getElementById('hr-start-indicator-spinner');
    var mainText = document.getElementById('hr-start-indicator-main');
    var arabicText = document.getElementById('hr-start-indicator-arabic');
    if (spinner) spinner.style.setProperty('display', 'none', 'important');
    if (mainText) mainText.textContent = 'DONE';
    if (arabicText) arabicText.textContent = 'تمت العملية بنجاح';

    indicator.classList.add('hr-start-indicator-done');
    indicator.setAttribute('aria-busy', 'false');
    return true;
}

// Called by exploit implementations after a successful jailbreak.
function jailbreakSuccess(statusMessage) {
    var isBinLoader = storage.session.getBoolean('binloader', false);
    if (storage.session.getBoolean('jailbreakNow', true)) {
        storage.session.remove('jailbreakNow');
    }
    storage.session.remove('autoJbRetry');
    storage.session.remove('payload_path');
    storage.session.remove('binloader');

    updateJbStats(0, 1);

    if (typeof completeHRStartIndicator === "function") {
        completeHRStartIndicator();
    }

    if (getReloadAfterJbValue() && !isBinLoader) {
        setTimeout(function () { window.location.href = mainPage; }, 5000);
    }

    if (typeof ui !== 'undefined' && ui.exploitState) {
        ui.exploitState.textContent = statusMessage
            || (window.lang && window.lang.jailbreakSuccess)
            || 'Jailbreak successful!';
    } else {
        var stateEl = document.getElementById('state');
        if (stateEl && statusMessage) {
            stateEl.textContent = statusMessage;
        }
    }
}

function isLocalIP(ip) {
    if (ip === 'localhost' || ip === '::1' || ip === '::ffff:127.0.0.1') {
        return true;
    }
    return /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip);
}

/**
 * Sets the .hidden class to an element.
 * @param {string} id   - the element ID to hide/show
 * @param {boolean} show - true to show, false to hide. otherwise toggle.
 */
function toggleVisibility(id, show) {
    var el = document.getElementById(id);
    if (!el) return;

    if (show === undefined) {
        el.classList.toggle('hidden');
    } else if (show) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}