(() => {
  const SUPABASE_URL = 'https://pdibtleothnnmihhrbcr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_f74qPRFJj8MQHT1L1Z3GIw_ue3Jx3yK';
  if (!window.supabase) return;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function els(form) {
    const modern = form?.id === 'form-redeem-key';
    return {
      input: document.getElementById(modern ? 'input-license-key' : 'inputLicenseKey'),
      button: document.getElementById(modern ? 'btn-redeem-key' : 'btnRedeemKey'),
      alertBox: document.getElementById('profile-alert') || document.getElementById('profileAlert')
    };
  }

  function say(alertBox, msg, type='error') {
    if (typeof window.showAlert === 'function' && alertBox) {
      try { window.showAlert(alertBox, msg, type); return; } catch (_) {}
    }
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.style.display = 'block';
    } else {
      window.alert(msg);
    }
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!form || !['form-redeem-key', 'formRedeemKey'].includes(form.id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const { input, button, alertBox } = els(form);
    const code = (input?.value || '').trim().toUpperCase();
    if (!/^LUNAVISUALKEY-(\d{4}-){4}\d{4}$/.test(code)) {
      say(alertBox, 'Введите ключ формата LUNAVISUALKEY-0000-0000-0000-0000-0000.');
      return;
    }
    const oldText = button?.textContent || 'Применить';
    if (button) { button.disabled = true; button.textContent = 'Проверка...'; }

    try {
      const { data: { session }, error: sessionError } = await sb.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Сначала войдите в аккаунт.');

      const { data, error } = await sb.rpc('redeem_lunavisual_key', { p_code: code });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === 'used') say(alertBox, 'Этот ключ уже был активирован.');
        else say(alertBox, 'Ключ не найден или введён неверно.');
        return;
      }
      if (input) input.value = '';
      say(alertBox, `✓ Подписка активирована: ${data.subscription_until}`, 'success');
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      say(alertBox, e?.message || 'Ошибка активации ключа.');
    } finally {
      if (button) { button.disabled = false; button.textContent = oldText; }
    }
  }, true);

  // Single-key generator in the profile admin block. Uses the same secure RPC
  // as the main admin panel, so RLS does not block legitimate administrators.
  document.addEventListener('click', async (event) => {
    const btn = event.target?.closest?.('#btnAdminGenKey');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const daysRaw = parseInt(document.getElementById('selectKeyPlan')?.value || '9999', 10);
    const days = daysRaw >= 9000 ? 999999 : Math.max(1, daysRaw);
    const output = document.getElementById('adminLastKeyDisplay');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Генерация...';
    try {
      const { data: { session }, error: sessionError } = await sb.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('Сначала войдите в аккаунт.');
      const { data, error } = await sb.rpc('generate_lunavisual_keys', { p_count: 1, p_duration_days: days });
      if (error) throw error;
      const code = data?.[0]?.code;
      if (!code) throw new Error('База не вернула созданный ключ.');
      if (output) {
        output.style.display = 'block';
        output.innerHTML = `<div class="key-gen-result"><div class="key-gen-info"><span class="key-gen-label">Сгенерированный ключ</span><span class="key-gen-code">${code}</span></div><button type="button" class="btn-copy-key" id="btnCopyGenKey"><span>Скопировать</span></button></div>`;
        document.getElementById('btnCopyGenKey')?.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(code); } catch (_) {}
        });
      }
    } catch (e) {
      say(document.getElementById('profile-alert') || document.getElementById('profileAlert'), 'Ошибка генерации: ' + (e?.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }, true);

})();
