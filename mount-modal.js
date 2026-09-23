(function () {
  const dialog = document.createElement('dialog');
  dialog.className = 'mount-modal';
  dialog.innerHTML = '<div class="mount-modal-head"><span></span><button type="button" aria-label="Закрыть схему">×</button></div><img alt=""><small>СХЕМА КРЕПЛЕНИЯ · 4K VECTOR</small>';
  document.body.append(dialog);

  const image = dialog.querySelector('img');
  const title = dialog.querySelector('.mount-modal-head span');
  const close = () => dialog.close();

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.mount-trigger');
    if (!trigger) return;
    image.src = trigger.dataset.image;
    image.alt = `Схема крепления ${trigger.dataset.title}`;
    title.textContent = `BERGON / ${trigger.dataset.title}`;
    dialog.showModal();
  });
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
})();
