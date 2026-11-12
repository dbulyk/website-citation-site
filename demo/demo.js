const panels = document.querySelectorAll('[data-panel]');
const steps = document.querySelectorAll('[data-step]');
const hint = document.querySelector('.cw-hint');
const captureAction = document.querySelector('.cw-capture-action');
const saveAction = document.querySelector('.cw-save-action');
const style = document.getElementById('cw-style');
const references = document.querySelectorAll('[data-style]');
const previewItems = document.querySelectorAll('[data-library="preview"]');
const savedItems = document.querySelectorAll('[data-library="saved"]');
const saveFromLibrary = document.getElementById('cw-save-from-library');
const install = document.querySelector('.cw-install');
const restart = document.querySelector('.cw-restart');

let captured = false;
let saved = false;

function showStep(step, focusTarget) {
  const next = document.querySelector(`[data-panel="${step}"]`);
  next.inert = false;

  hint.hidden = step !== 'style' && (step !== 'capture' || captured);
  if (!hint.hidden) (step === 'style' ? saveAction : captureAction).prepend(hint);

  for (const button of steps) {
    if (button.dataset.step === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  }

  focusTarget.focus();
  for (const panel of panels) panel.inert = panel !== next;
}

function updateReference() {
  for (const reference of references) {
    const selected = reference.dataset.style === style.value;
    reference.inert = !selected;
    reference.classList.toggle('cw-reference', selected);
  }
}

function setSaved(value) {
  saved = value;
  for (const item of saved ? savedItems : previewItems) item.inert = false;
  if (saved && document.activeElement === saveFromLibrary) install.focus();
  for (const item of saved ? previewItems : savedItems) item.inert = true;
}

function saveSample() {
  setSaved(true);
  showStep('library', install);
}

for (const step of steps) {
  step.addEventListener('click', () => showStep(step.dataset.step, step));
}
document.getElementById('cw-capture').addEventListener('click', () => {
  captured = true;
  showStep('style', style);
});
document.getElementById('cw-open-library').addEventListener('click', () => {
  showStep('library', saved ? install : saveFromLibrary);
});
document.getElementById('cw-save').addEventListener('click', saveSample);
saveFromLibrary.addEventListener('click', saveSample);
document.getElementById('cw-new-citation').addEventListener('click', () => showStep('style', style));
style.addEventListener('change', updateReference);
restart.addEventListener('click', () => {
  captured = false;
  style.value = 'apa';
  updateReference();
  showStep('capture', restart);
  setSaved(false);
});
