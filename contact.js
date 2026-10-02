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
      sent: ['Tack.', 'Jag hör av mig inom ett dygn.'],
      invalid: 'Fyll i namn, en giltig e-post och några rader.',
      failed: 'Något gick fel. Försök igen om en stund.',
    },
    en: {
      subject: 'New enquiry: boudoir photography (EN)',
      sending: 'Sending...',
      sent: ['Thank you.', 'I’ll get back to you within a day.'],
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

  // "How it works" panel: its last button hands over to the form.
  const info = document.querySelector('.info');
  if (info) {
    document.querySelectorAll('[data-open-info]').forEach((b) =>
      b.addEventListener('click', () => info.showModal())
    );
    info.querySelector('[data-close-info]').addEventListener('click', () => info.close());
    info.addEventListener('click', (e) => { if (e.target === info) info.close(); });
  }

  document.querySelectorAll('[data-open-contact]').forEach((b) =>
    b.addEventListener('click', () => {
      if (info?.open) info.close();
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
          subject: form.dataset.subject || COPY.subject,
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
      // GA4's recommended lead event; mark it as a key event in GA to count enquiries.
      window.gtag?.('event', 'generate_lead', { language: document.documentElement.lang });
      // headline + line, styled like the hero
      const [title, line] = COPY.sent;
      const h = document.createElement('span');
      h.className = 'sent-title';
      h.textContent = title;
      const t = document.createElement('span');
      t.className = 'sent-text';
      t.textContent = line;
      status.replaceChildren(h, t);
      status.dataset.tone = 'ok';
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
