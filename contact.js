// Contact dialog. Submissions go to Web3Forms, which forwards them by email.
// The access key is public by design: it only lets people send to the inbox it
// was issued for, so the email address itself never appears on the page.
(() => {
  const WEB3FORMS_KEY = '65899100-3fe0-4f64-91c2-039ce3b08013';
  const ENDPOINT = 'https://api.web3forms.com/submit';
  const STRINGS = {
    sv: {
      subject: 'Ny förfrågan: boudoirfotografering',
      sending: 'Skickar...',
      sent: 'Tack. Jag hör av mig inom kort.',
      invalid: 'Fyll i namn, en giltig e-post och några rader.',
      failed: 'Något gick fel. Försök igen om en stund.',
    },
    en: {
      subject: 'New enquiry: boudoir photography (EN)',
      sending: 'Sending...',
      sent: "Thank you. I'll be in touch soon.",
      invalid: 'Please add your name, a valid email and a few lines.',
      failed: 'Something went wrong. Please try again shortly.',
    },
  };
  const COPY = STRINGS[document.documentElement.lang] || STRINGS.sv;

  const dialog = document.querySelector('.contact');
  const form = dialog?.querySelector('form');
  if (!dialog || !form) return;

  const status = form.querySelector('.status');
  const send = form.querySelector('.send');
  const say = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  document.querySelectorAll('[data-open-contact]').forEach((b) =>
    b.addEventListener('click', () => {
      dialog.showModal();
      form.querySelector('input[name="name"]').focus();
    })
  );
  dialog.querySelector('[data-close-contact]').addEventListener('click', () => dialog.close());
  // Click on the backdrop closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return; // honeypot tripped: silently drop

    const name = (data.name || '').trim();
    const email = (data.email || '').trim();
    const message = (data.message || '').trim();
    if (!name || !message || !form.email.checkValidity() || !email) {
      say(COPY.invalid, 'error');
      return;
    }

    send.disabled = true;
    say(COPY.sending);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: COPY.subject,
          from_name: 'bd.roamer.se',
          name,
          email,
          message,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || res.status);
      form.reset();
      form.classList.add('is-sent');
      say(COPY.sent, 'ok');
    } catch (err) {
      console.error('Contact form:', err);
      say(COPY.failed, 'error');
    } finally {
      send.disabled = false;
    }
  });

  dialog.addEventListener('close', () => {
    form.classList.remove('is-sent');
    say('');
  });
})();
