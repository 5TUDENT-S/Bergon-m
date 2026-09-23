const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

// Источники референсов не выводим в пользовательском блоке выполненных работ.
document.querySelectorAll('.project-source').forEach(source => source.remove());

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 90}ms`;
  observer.observe(element);
});

window.switchFinishes = (filter, tab) => {
  const finishTabs = document.querySelectorAll('.finish-tab');
  const finishCards = document.querySelectorAll('[data-finish]');
  finishTabs.forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  finishCards.forEach(card => {
    card.hidden = card.dataset.finish !== filter;
  });
};

document.querySelectorAll('.ceiling-rails').forEach(ceiling => {
  ceiling.replaceChildren(...Array.from({ length: 11 }, () => document.createElement('i')));
});

const form = document.querySelector('.contact-form');
const toast = document.querySelector('.toast');
let toastTimer;

const showToast = (message, isError = false) => {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 5000);
};

form.querySelectorAll('input, textarea').forEach(field => {
  field.addEventListener('input', () => field.classList.remove('invalid'));
});

let sending = false;
let lastSentAt = 0;
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || form.elements.website.value) return;
  const invalidFields = [...form.querySelectorAll('input, textarea')]
    .filter(field => field.name !== 'website' && !field.checkValidity());
  if (invalidFields.length) {
    invalidFields.forEach(field => field.classList.add('invalid'));
    invalidFields[0].focus();
    showToast('Заполните обязательные поля и дайте согласие на обработку данных.', true);
    return;
  }
  if (Date.now() - lastSentAt < 15000) {
    showToast('Заявка уже отправлена. Подождите немного перед повторной отправкой.', true);
    return;
  }
  const config = window.EMAILJS_CONFIG;
  if (!config?.serviceId || !config?.templateId || !config?.publicKey || typeof emailjs === 'undefined') {
    showToast('Сервис отправки недоступен. Напишите на bergon@internet.ru или позвоните нам.', true);
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('span');
  sending = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  label.textContent = 'Отправляем…';
  const consentTime = new Date().toISOString();
  const consentRecord = `Согласие на обработку данных: дано отдельной галочкой. Цель: ответ на заявку и расчёт. Редакция: 52 от 22.09.2026. Время UTC: ${consentTime}. Документ: ${new URL('consent.html', location.href).href}`;
  try {
    await emailjs.send(config.serviceId, config.templateId, {
      from_name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      message: `${form.elements.message.value.trim() || 'Не указано'}\n\n${consentRecord}`,
      to_email: 'bergon@internet.ru',
      page_url: location.origin + location.pathname,
      submitted_at: new Intl.DateTimeFormat('ru-RU', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Novosibirsk'}).format(new Date()),
      consent_version: '52',
      consent_at: consentTime
    }, {publicKey: config.publicKey, blockHeadless: true, limitRate: {id:'bergon-calculation-form',throttle:15000}});
    lastSentAt = Date.now();
    form.reset();
    showToast('Спасибо! Заявка отправлена. Мы свяжемся с вами в рабочее время.');
  } catch {
    showToast('Не удалось отправить заявку. Данные сохранены в форме — повторите попытку или напишите на bergon@internet.ru.', true);
  } finally {
    sending = false;
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    label.textContent = 'Получить расчёт';
  }
});
