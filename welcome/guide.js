import { bindLanguageSelector, carryContext, readContext } from './context.js';

const FIRST_CHECK_MS = 1000;
const POLL_INTERVAL_MS = 1500;
const REQUEST_TIMEOUT_MS = 2000;

const initialContext = readContext();
const { extensionId } = initialContext;
const exampleLink = document.querySelector('#try-example');
const guides = {
  pin: document.querySelector('#pin-guide'),
  usage: document.querySelector('#usage-guide'),
};
const select = document.querySelector('#guide-mode');
const statusText = document.querySelector('#status-text');
const retry = document.querySelector('#retry');
const statusKeys = {
  unknown: 'unknown_status',
  unavailable: 'unavailable_status',
  pinned: 'pin_complete',
  unpinned: 'pin_title',
};

let copy = initialContext.copy;
let manualMode = readHashMode();
let mode = 'pin';
let status = 'unknown';
let pollTimer;
let inFlight = false;

function readHashMode() {
  if (location.hash === '#pin') return 'pin';
  if (location.hash === '#usage') return 'usage';
  return null;
}

function showGuide(next) {
  if (mode !== next) {
    guides[mode].hidden = true;
    guides[next].hidden = false;
    mode = next;
  }
  if (select.value !== next) select.value = next;
}

function guideHasFocus(element) {
  return element === select || guides[mode].contains(element);
}

function reconcileAutomaticMode() {
  if (manualMode || (status !== 'pinned' && status !== 'unpinned')) return;
  const next = status === 'pinned' ? 'usage' : 'pin';
  if (next !== mode && !guideHasFocus(document.activeElement)) showGuide(next);
}

function renderStatus() {
  const text = copy[statusKeys[status]];
  if (statusText.textContent !== text) statusText.textContent = text;
}

function updateStatus(next) {
  if (status === next) return;
  status = next;
  reconcileAutomaticMode();
  statusText.classList.toggle('visually-hidden', next === 'unpinned');
  renderStatus();

  const hideRetry = next !== 'unavailable';
  if (retry.hidden !== hideRetry) {
    if (hideRetry && document.activeElement === retry) select.focus({ preventScroll: true });
    retry.hidden = hideRetry;
  }
}

function requestPinStatus(extensionId) {
  return new Promise((resolve) => {
    let settled = false;
    let deadline;
    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(result);
    }

    try {
      const runtime = globalThis.chrome?.runtime;
      if (typeof runtime?.sendMessage !== 'function') {
        finish('unavailable');
        return;
      }

      deadline = setTimeout(() => finish('unavailable'), REQUEST_TIMEOUT_MS);
      runtime.sendMessage(extensionId, { type: 'wc-welcome-status', version: 1 }, (response) => {
        // Chrome requires lastError to be read during the callback, even after a timeout.
        const error = runtime.lastError;
        if (settled) return;
        if (error || response?.ok !== true || typeof response.pinned !== 'boolean') {
          finish('unavailable');
          return;
        }
        finish(response.pinned ? 'pinned' : 'unpinned');
      });
    } catch {
      finish('unavailable');
    }
  });
}

async function refresh() {
  if (document.hidden || inFlight) return;
  inFlight = true;
  const next = await requestPinStatus(extensionId);
  inFlight = false;
  updateStatus(next);
  if (!document.hidden && next !== 'unavailable') {
    pollTimer = setTimeout(refresh, POLL_INTERVAL_MS);
  }
}

bindLanguageSelector(initialContext, 'guide_title', (context) => {
  copy = context.copy;
  carryContext(exampleLink, context.params);
  renderStatus();
});

showGuide(manualMode ?? (initialContext.params.get('pinned') === 'true' ? 'usage' : 'pin'));

select.addEventListener('change', () => {
  manualMode = select.value;
  showGuide(manualMode);
  const hash = `#${manualMode}`;
  if (location.hash !== hash) history.replaceState(history.state, '', hash);
});

window.addEventListener('hashchange', () => {
  const next = readHashMode();
  if (!next) return;
  manualMode = next;
  showGuide(next);
});

if (extensionId) {
  document.addEventListener('focusout', (event) => {
    if (!guideHasFocus(event.relatedTarget)) queueMicrotask(reconcileAutomaticMode);
  });
  retry.addEventListener('click', refresh);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(pollTimer);
    if (!document.hidden && status !== 'unavailable') refresh();
  });
  if (!document.hidden) pollTimer = setTimeout(refresh, FIRST_CHECK_MS);
}
