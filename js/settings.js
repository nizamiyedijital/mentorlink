(function (App) {
  const S = App.Storage;

  function getUserSettings(userId) {
    const all = S.get('mp_user_settings', {});
    return all[userId] || {};
  }
  function setUserSettings(userId, data) {
    const all = S.get('mp_user_settings', {});
    all[userId] = { ...(all[userId] || {}), ...data };
    S.set('mp_user_settings', all);
  }
  App.getUserSettings = getUserSettings;
  App.setUserSettings = setUserSettings;

  App.initSettingsPage = function () {
    const user = App.requireAuth();
    if (!user) return;
    const isMentor = user.role === 'mentor';
    const settings = getUserSettings(user.id);
    const navHost = document.querySelector('[data-settings-nav]');
    const contentHost = document.querySelector('[data-settings-content]');

    const tabs = [
      { key: 'profile', icon: '👤', label: 'Profil' },
      { key: 'notifications', icon: '🔔', label: 'Bildirimler' },
      { key: 'preferences', icon: '⚙️', label: isMentor ? 'Seans & Fiyat' : 'Tercihler' },
      { key: 'payment', icon: '💳', label: isMentor ? 'Ödeme Bilgileri' : 'Ödeme' },
      { key: 'security', icon: '🔒', label: 'Güvenlik' }
    ];

    function renderNav(active) {
      navHost.innerHTML = `
        <nav class="settings-nav">
          ${tabs.map(t => `
            <a href="#" class="settings-nav-item ${t.key === active ? 'active' : ''}" data-stab="${t.key}">
              <span class="settings-nav-icon">${t.icon}</span>
              <span>${t.label}</span>
            </a>`).join('')}
        </nav>`;
      navHost.querySelectorAll('[data-stab]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); switchTab(el.dataset.stab); });
      });
    }

    let currentTab = 'profile';
    function switchTab(tab) {
      currentTab = tab;
      renderNav(tab);
      renderContent(tab);
    }

    function renderContent(tab) {
      const fn = {
        profile: renderProfile,
        notifications: renderNotifications,
        preferences: isMentor ? renderMentorPreferences : renderClientPreferences,
        payment: isMentor ? renderMentorPayment : renderClientPayment,
        security: renderSecurity
      }[tab];
      fn && fn();
    }

    // ===== PROFILE =====
    function renderProfile() {
      const profile = isMentor ? App.getMentorProfileForUser(user) : null;
      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Profil Bilgileri</h2>
          <p class="text-muted">Diğer kullanıcılara görünecek bilgilerin.</p>
        </div>
        <form class="card" data-profile-form>
          <div class="settings-avatar-row">
            <div class="settings-avatar">
              <img src="${profile?.avatar || settings.avatar || 'https://i.pravatar.cc/300?u=' + user.id}" alt="Avatar">
            </div>
            <div>
              <p style="font-weight:600;">${user.name}</p>
              <p class="text-muted" style="font-size:0.85rem;">Profil fotoğrafı</p>
              <label class="btn btn-ghost btn-sm" style="margin-top:0.5rem; cursor:pointer;">
                Değiştir <input type="file" accept="image/*" style="display:none;" data-avatar-input>
              </label>
            </div>
          </div>
          <div class="grid grid-2" style="gap:1rem; margin-top:1.5rem;">
            <div class="form-group"><label>Ad Soyad</label>
              <input type="text" class="form-input" name="name" value="${user.name}" required></div>
            <div class="form-group"><label>E-posta</label>
              <input type="email" class="form-input" name="email" value="${user.email}" required></div>
            <div class="form-group"><label>Telefon</label>
              <input type="tel" class="form-input" name="phone" value="${settings.phone || ''}" placeholder="+90 5XX XXX XXXX"></div>
            <div class="form-group"><label>Şehir</label>
              <input type="text" class="form-input" name="city" value="${settings.city || ''}" placeholder="İstanbul"></div>
          </div>
          <div class="form-group"><label>Hakkında</label>
            <textarea class="form-textarea" name="bio" rows="3" placeholder="Kendinizi kısaca tanıtın...">${settings.bio || profile?.bio || ''}</textarea></div>
          ${isMentor ? `
            <div class="form-group"><label>Profesyonel Ünvan</label>
              <input type="text" class="form-input" name="title" value="${profile?.title || settings.title || ''}"></div>
            <div class="form-group"><label>Uzmanlık Alanları (virgülle ayırın)</label>
              <input type="text" class="form-input" name="expertise" value="${(profile?.expertise || []).join(', ')}"></div>
            <div class="form-group"><label>Diller</label>
              <input type="text" class="form-input" name="languages" value="${(profile?.languages || []).join(', ')}" placeholder="Türkçe, İngilizce"></div>
            <div class="form-group"><label>Sertifika / Diploma</label>
              <div class="file-upload-area">
                <p class="text-muted">Sertifika veya diploma yükle (PDF/JPG)</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style="margin-top:0.5rem;">
                <p class="text-muted" style="font-size:0.75rem; margin-top:0.5rem;">Üretimde aktif olacak — şimdilik sadece görsel.</p>
              </div>
            </div>
          ` : `
            <div class="form-group"><label>İlgi Alanları</label>
              <div class="interest-chips">
                ${Object.entries(App.CATEGORIES).map(([k, v]) => `
                  <label class="chip-toggle ${(settings.interests || []).includes(k) ? 'active' : ''}">
                    <input type="checkbox" name="interests" value="${k}" ${(settings.interests || []).includes(k) ? 'checked' : ''}>
                    <span>${v.icon} ${v.label}</span>
                  </label>`).join('')}
              </div>
            </div>
          `}
          <div class="settings-actions">
            <button type="submit" class="btn btn-primary">Değişiklikleri Kaydet</button>
          </div>
        </form>`;

      contentHost.querySelector('[data-profile-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const updates = {
          phone: fd.get('phone'), city: fd.get('city'), bio: fd.get('bio')
        };
        if (isMentor) {
          updates.title = fd.get('title');
          updates.expertise = fd.get('expertise');
          updates.languages = fd.get('languages');
        } else {
          updates.interests = fd.getAll('interests');
        }
        const newName = fd.get('name').trim();
        const newEmail = fd.get('email').trim();
        if (newName && newEmail) {
          const users = S.get(S.keys.USERS, []);
          const u = users.find(x => x.id === user.id);
          if (u) { u.name = newName; u.email = newEmail; S.set(S.keys.USERS, users); }
        }
        setUserSettings(user.id, updates);
        App.toast('Profil güncellendi.', 'success');
      });

      contentHost.querySelectorAll('.chip-toggle').forEach(el => {
        el.addEventListener('click', () => el.classList.toggle('active'));
      });
    }

    // ===== NOTIFICATIONS =====
    function renderNotifications() {
      const n = settings.notifications || {};
      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Bildirim Tercihleri</h2>
          <p class="text-muted">Hangi durumlarda bildirim almak istediğini belirle.</p>
        </div>
        <form class="card" data-notif-form>
          <h3 class="mb-md">Randevu Bildirimleri</h3>
          ${toggle('remind1h', 'Seanstan 1 saat önce hatırlatma', n.remind1h !== false)}
          ${toggle('remind24h', 'Seanstan 24 saat önce hatırlatma', n.remind24h !== false)}
          ${isMentor
            ? toggle('newRequest', 'Yeni randevu isteği geldiğinde', n.newRequest !== false) +
              toggle('paymentDone', 'Ödeme tamamlandığında', n.paymentDone !== false) +
              toggle('weeklyReport', 'Haftalık kazanç özeti', n.weeklyReport !== false)
            : toggle('mentorApproved', 'Mentör randevuyu onayladığında', n.mentorApproved !== false) +
              toggle('reviewRemind', 'Seans sonrası yorum hatırlatması', n.reviewRemind !== false)
          }
          ${toggle('cancelled', 'Randevu iptal edildiğinde', n.cancelled !== false)}

          <h3 style="margin-top:2rem;" class="mb-md">Bildirim Kanalları</h3>
          ${toggle('channelEmail', 'E-posta bildirimleri', n.channelEmail !== false)}
          ${toggle('channelInApp', 'Uygulama içi bildirimler', n.channelInApp !== false)}
          ${toggle('channelSms', 'SMS bildirimleri (yakında)', n.channelSms || false)}

          <div class="settings-actions">
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </div>
        </form>`;

      contentHost.querySelector('[data-notif-form]').addEventListener('submit', e => {
        e.preventDefault();
        const toggles = {};
        contentHost.querySelectorAll('[data-toggle]').forEach(t => {
          toggles[t.dataset.toggle] = t.querySelector('input').checked;
        });
        setUserSettings(user.id, { notifications: toggles });
        App.toast('Bildirim tercihleri güncellendi.', 'success');
      });
    }

    function toggle(key, label, checked) {
      return `
        <div class="settings-toggle" data-toggle="${key}">
          <span>${label}</span>
          <label class="switch">
            <input type="checkbox" ${checked ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>`;
    }

    // ===== CLIENT PREFERENCES =====
    function renderClientPreferences() {
      const p = settings.preferences || {};
      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Seans Tercihleri</h2>
          <p class="text-muted">Varsayılan randevu tercihlerini belirle.</p>
        </div>
        <form class="card" data-pref-form>
          <div class="form-group"><label>Varsayılan Görüşme Tipi</label>
            <select class="form-select" name="defaultType">
              <option value="any" ${p.defaultType === 'any' ? 'selected' : ''}>Fark etmez</option>
              <option value="online" ${p.defaultType === 'online' ? 'selected' : ''}>Online (Meet/Zoom)</option>
              <option value="offline" ${p.defaultType === 'offline' ? 'selected' : ''}>Yüz yüze</option>
            </select></div>
          <div class="form-group"><label>Tercih Edilen Saat Aralığı</label>
            <select class="form-select" name="preferredTime">
              <option value="any" ${p.preferredTime === 'any' ? 'selected' : ''}>Fark etmez</option>
              <option value="morning" ${p.preferredTime === 'morning' ? 'selected' : ''}>Sabah (09:00-12:00)</option>
              <option value="afternoon" ${p.preferredTime === 'afternoon' ? 'selected' : ''}>Öğleden sonra (13:00-17:00)</option>
              <option value="evening" ${p.preferredTime === 'evening' ? 'selected' : ''}>Akşam (18:00-21:00)</option>
            </select></div>
          <div class="form-group"><label>Zaman Dilimi</label>
            <select class="form-select" name="timezone">
              <option value="Europe/Istanbul" ${(p.timezone || 'Europe/Istanbul') === 'Europe/Istanbul' ? 'selected' : ''}>Türkiye (GMT+3)</option>
              <option value="Europe/Berlin" ${p.timezone === 'Europe/Berlin' ? 'selected' : ''}>Almanya (GMT+1/+2)</option>
              <option value="Europe/London" ${p.timezone === 'Europe/London' ? 'selected' : ''}>İngiltere (GMT+0/+1)</option>
              <option value="America/New_York" ${p.timezone === 'America/New_York' ? 'selected' : ''}>ABD Doğu (GMT-5/-4)</option>
            </select></div>
          <div class="settings-actions">
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </div>
        </form>`;

      contentHost.querySelector('[data-pref-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setUserSettings(user.id, { preferences: {
          defaultType: fd.get('defaultType'),
          preferredTime: fd.get('preferredTime'),
          timezone: fd.get('timezone')
        }});
        App.toast('Tercihler güncellendi.', 'success');
      });
    }

    // ===== MENTOR PREFERENCES (Session & Pricing) =====
    function renderMentorPreferences() {
      const profile = App.getMentorProfileForUser(user);
      const mentorId = profile?.id;
      const avail = mentorId ? App.getAvailability(mentorId) : {};
      const p = settings.mentorPrefs || {};

      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Seans & Fiyat Ayarları</h2>
          <p class="text-muted">Seans fiyatı, politikalar ve otomatik kurallar.</p>
        </div>
        <form class="card" data-mpref-form>
          <div class="grid grid-2" style="gap:1rem;">
            <div class="form-group"><label>Seans Ücreti (₺)</label>
              <input type="number" class="form-input" name="price" min="100" max="10000" value="${profile?.pricePerSession || 600}"></div>
            <div class="form-group"><label>Para Birimi</label>
              <select class="form-select" name="currency">
                <option value="TRY" selected>₺ Türk Lirası</option>
                <option value="USD">$ ABD Doları</option>
                <option value="EUR">€ Euro</option>
              </select></div>
          </div>
          <div class="form-group"><label>İptal Politikası</label>
            <select class="form-select" name="cancellationHours">
              <option value="12" ${p.cancellationHours == 12 ? 'selected' : ''}>12 saat öncesine kadar ücretsiz</option>
              <option value="24" ${(p.cancellationHours || 24) == 24 ? 'selected' : ''}>24 saat öncesine kadar ücretsiz (önerilen)</option>
              <option value="48" ${p.cancellationHours == 48 ? 'selected' : ''}>48 saat öncesine kadar ücretsiz</option>
            </select></div>
          <div class="form-group"><label>Geç iptal ücreti</label>
            <select class="form-select" name="lateCancelFee">
              <option value="50" ${(p.lateCancelFee || 50) == 50 ? 'selected' : ''}>%50 ücret kesilsin</option>
              <option value="100" ${p.lateCancelFee == 100 ? 'selected' : ''}>%100 ücret kesilsin</option>
              <option value="0" ${p.lateCancelFee == 0 ? 'selected' : ''}>Ücret kesilmesin</option>
            </select></div>

          <h3 style="margin-top:1.5rem;" class="mb-md">Otomatik Kurallar</h3>
          ${toggle('autoApprove', 'Otomatik randevu onayı (istekler direkt ödeme adımına geçer)', p.autoApprove || false)}
          <div class="form-group" style="margin-top:1rem;"><label>Günlük maksimum seans</label>
            <select class="form-select" name="maxDaily">
              <option value="0" ${(p.maxDaily || 0) == 0 ? 'selected' : ''}>Sınırsız</option>
              ${[3,4,5,6,8].map(v => `<option value="${v}" ${p.maxDaily == v ? 'selected' : ''}>${v} seans</option>`).join('')}
            </select></div>

          <div class="settings-actions">
            <button type="submit" class="btn btn-primary">Kaydet</button>
          </div>
        </form>`;

      contentHost.querySelector('[data-mpref-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const autoApprove = contentHost.querySelector('[data-toggle="autoApprove"] input').checked;
        setUserSettings(user.id, { mentorPrefs: {
          price: parseInt(fd.get('price'), 10),
          currency: fd.get('currency'),
          cancellationHours: parseInt(fd.get('cancellationHours'), 10),
          lateCancelFee: parseInt(fd.get('lateCancelFee'), 10),
          autoApprove,
          maxDaily: parseInt(fd.get('maxDaily'), 10)
        }});
        App.toast('Seans ayarları güncellendi.', 'success');
      });
    }

    // ===== CLIENT PAYMENT =====
    function renderClientPayment() {
      const pay = settings.payment || {};
      const apts = App.getUserAppointments(user.id).filter(a => a.status === 'completed' || a.status === 'paid');
      const allPayments = S.get(S.keys.PAYMENTS, []);
      const aptIds = new Set(apts.map(a => a.id));
      const myPayments = allPayments.filter(p => aptIds.has(p.appointmentId)).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
      const totalSpent = myPayments.reduce((s, p) => s + p.amount, 0);

      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Ödeme Yönetimi</h2>
          <p class="text-muted">Kayıtlı kart bilgileri, fatura adresi ve geçmiş ödemeler.</p>
        </div>
        <div class="card mb-lg">
          <h3 class="mb-md">Kayıtlı Kart</h3>
          ${pay.cardLast4 ? `
            <div class="saved-card">
              <div class="card-icon">💳</div>
              <div>
                <p style="font-weight:600;">•••• •••• •••• ${pay.cardLast4}</p>
                <p class="text-muted" style="font-size:0.85rem;">${pay.cardHolder || ''} • ${pay.cardExp || ''}</p>
              </div>
              <button class="btn btn-ghost btn-sm" data-remove-card>Kaldır</button>
            </div>
          ` : `
            <p class="text-muted mb-md">Henüz kayıtlı kart yok.</p>
          `}
          <form data-card-form style="margin-top:1rem;">
            <div class="grid grid-2" style="gap:1rem;">
              <div class="form-group"><label>Kart Üzerindeki İsim</label>
                <input type="text" class="form-input" name="holder" placeholder="AD SOYAD" value="${pay.cardHolder || ''}"></div>
              <div class="form-group"><label>Kart Numarası</label>
                <input type="text" class="form-input" name="number" placeholder="4242 4242 4242 4242" maxlength="19"></div>
              <div class="form-group"><label>Son Kullanma</label>
                <input type="text" class="form-input" name="exp" placeholder="AA/YY" maxlength="5"></div>
              <div class="form-group"><label>CVV</label>
                <input type="text" class="form-input" name="cvv" placeholder="123" maxlength="4"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Kartı Kaydet</button>
            <span class="text-muted" style="font-size:0.75rem; margin-left:0.5rem;">Demo — gerçek kart bilgisi işlenmez.</span>
          </form>
        </div>
        <div class="card mb-lg">
          <h3 class="mb-md">Fatura Adresi</h3>
          <form data-billing-form>
            <div class="form-group"><label>Ad Soyad / Firma</label>
              <input type="text" class="form-input" name="billingName" value="${pay.billingName || user.name}"></div>
            <div class="form-group"><label>Adres</label>
              <textarea class="form-textarea" name="billingAddress" rows="2" placeholder="Mahalle, cadde, sokak, no...">${pay.billingAddress || ''}</textarea></div>
            <div class="grid grid-2" style="gap:1rem;">
              <div class="form-group"><label>TC / Vergi No</label>
                <input type="text" class="form-input" name="taxId" value="${pay.taxId || ''}" placeholder="Opsiyonel"></div>
              <div class="form-group"><label>Vergi Dairesi</label>
                <input type="text" class="form-input" name="taxOffice" value="${pay.taxOffice || ''}" placeholder="Opsiyonel"></div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Kaydet</button>
          </form>
        </div>
        <div class="card">
          <div class="flex-between mb-md">
            <h3>Ödeme Geçmişi</h3>
            <span class="text-muted">Toplam: ₺${totalSpent.toLocaleString('tr-TR')}</span>
          </div>
          ${myPayments.length === 0 ? `<p class="text-muted">Henüz ödeme yok.</p>` : `
            <table class="data-table">
              <thead><tr><th>Tarih</th><th>Mentör</th><th>Tutar</th><th>Durum</th><th></th></tr></thead>
              <tbody>
                ${myPayments.map(p => {
                  const a = apts.find(x => x.id === p.appointmentId);
                  return `<tr>
                    <td>${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                    <td>${a ? a.mentorName : '-'}</td>
                    <td>₺${p.amount.toLocaleString('tr-TR')}</td>
                    <td><span class="badge badge-success">Ödendi</span></td>
                    <td><button class="btn btn-ghost btn-sm">Makbuz</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
        </div>`;

      contentHost.querySelector('[data-card-form]')?.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const num = fd.get('number').replace(/\s/g, '');
        setUserSettings(user.id, { payment: {
          ...pay,
          cardHolder: fd.get('holder'),
          cardLast4: num.slice(-4),
          cardExp: fd.get('exp')
        }});
        App.toast('Kart kaydedildi.', 'success');
        renderContent('payment');
      });
      contentHost.querySelector('[data-remove-card]')?.addEventListener('click', () => {
        const next = { ...pay }; delete next.cardLast4; delete next.cardHolder; delete next.cardExp;
        setUserSettings(user.id, { payment: next });
        App.toast('Kart kaldırıldı.', 'success');
        renderContent('payment');
      });
      contentHost.querySelector('[data-billing-form]')?.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setUserSettings(user.id, { payment: {
          ...getUserSettings(user.id).payment,
          billingName: fd.get('billingName'),
          billingAddress: fd.get('billingAddress'),
          taxId: fd.get('taxId'),
          taxOffice: fd.get('taxOffice')
        }});
        App.toast('Fatura bilgileri güncellendi.', 'success');
      });
    }

    // ===== MENTOR PAYMENT =====
    function renderMentorPayment() {
      const pay = settings.mentorPayment || {};
      const profile = App.getMentorProfileForUser(user);
      const mentorId = profile?.id;
      const stats = mentorId ? App.getMentorStats(mentorId) : {};

      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Ödeme Bilgileri</h2>
          <p class="text-muted">Kazandığın ücretlerin aktarılacağı hesap bilgileri.</p>
        </div>
        <div class="dash-stats-grid mb-lg">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bekleyen Ödeme</div>
            <div class="stat-value">₺${(stats.earningsMonthNet || 0).toLocaleString('tr-TR')}</div>
            <div class="stat-sub">bu ay net</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Kazanç</div>
            <div class="stat-value">₺${(stats.earningsTotalNet || 0).toLocaleString('tr-TR')}</div>
            <div class="stat-sub">net (komisyon düşülmüş)</div>
          </div>
        </div>
        <form class="card mb-lg" data-bank-form>
          <h3 class="mb-md">Banka Hesabı</h3>
          <div class="form-group"><label>IBAN</label>
            <input type="text" class="form-input" name="iban" value="${pay.iban || ''}" placeholder="TR00 0000 0000 0000 0000 0000 00" maxlength="32"></div>
          <div class="grid grid-2" style="gap:1rem;">
            <div class="form-group"><label>Hesap Sahibi</label>
              <input type="text" class="form-input" name="accountHolder" value="${pay.accountHolder || user.name}"></div>
            <div class="form-group"><label>Banka</label>
              <select class="form-select" name="bank">
                <option value="">Seçiniz</option>
                ${['Ziraat Bankası','İş Bankası','Garanti BBVA','Akbank','Yapı Kredi','QNB Finansbank','Halkbank','Vakıfbank','ING','HSBC'].map(b =>
                  `<option value="${b}" ${pay.bank === b ? 'selected' : ''}>${b}</option>`).join('')}
              </select></div>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Kaydet</button>
        </form>
        <form class="card mb-lg" data-tax-form>
          <h3 class="mb-md">Vergi Bilgileri</h3>
          <div class="grid grid-2" style="gap:1rem;">
            <div class="form-group"><label>TC Kimlik No / Vergi No</label>
              <input type="text" class="form-input" name="taxId" value="${pay.taxId || ''}" maxlength="11"></div>
            <div class="form-group"><label>Vergi Dairesi</label>
              <input type="text" class="form-input" name="taxOffice" value="${pay.taxOffice || ''}"></div>
          </div>
          <div class="form-group"><label>Fatura Tipi</label>
            <div class="radio-group">
              <label class="radio-option"><input type="radio" name="invoiceType" value="personal" ${(pay.invoiceType || 'personal') === 'personal' ? 'checked' : ''}><span>Şahıs</span></label>
              <label class="radio-option"><input type="radio" name="invoiceType" value="corporate" ${pay.invoiceType === 'corporate' ? 'checked' : ''}><span>Şirket</span></label>
            </div></div>
          <button type="submit" class="btn btn-primary btn-sm">Kaydet</button>
        </form>
        <div class="card">
          <h3 class="mb-md">Ödeme Döngüsü</h3>
          <div class="form-group"><label>Kazançlarımı aktarım sıklığı</label>
            <select class="form-select" name="payoutCycle" data-payout>
              <option value="weekly" ${(pay.payoutCycle || 'weekly') === 'weekly' ? 'selected' : ''}>Haftalık (her Cuma)</option>
              <option value="biweekly" ${pay.payoutCycle === 'biweekly' ? 'selected' : ''}>2 haftada bir</option>
              <option value="monthly" ${pay.payoutCycle === 'monthly' ? 'selected' : ''}>Aylık (her ayın 1'i)</option>
            </select></div>
          <div class="alert alert-info" style="font-size:0.85rem;">
            Platform komisyonu: %${App.COMMISSION_RATE * 100}. Net kazanç = brüt - komisyon. Transferler iyzico altyapısıyla (üretimde) aktarılacaktır.
          </div>
        </div>`;

      contentHost.querySelector('[data-bank-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setUserSettings(user.id, { mentorPayment: {
          ...pay, iban: fd.get('iban'), accountHolder: fd.get('accountHolder'), bank: fd.get('bank')
        }});
        App.toast('Banka bilgileri güncellendi.', 'success');
      });
      contentHost.querySelector('[data-tax-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setUserSettings(user.id, { mentorPayment: {
          ...getUserSettings(user.id).mentorPayment,
          taxId: fd.get('taxId'), taxOffice: fd.get('taxOffice'), invoiceType: fd.get('invoiceType')
        }});
        App.toast('Vergi bilgileri güncellendi.', 'success');
      });
      contentHost.querySelector('[data-payout]')?.addEventListener('change', e => {
        setUserSettings(user.id, { mentorPayment: {
          ...getUserSettings(user.id).mentorPayment, payoutCycle: e.target.value
        }});
        App.toast('Ödeme döngüsü güncellendi.', 'success');
      });
    }

    // ===== SECURITY =====
    function renderSecurity() {
      contentHost.innerHTML = `
        <div class="settings-section">
          <h2>Güvenlik</h2>
          <p class="text-muted">Şifre değiştir, hesap kontrolü.</p>
        </div>
        <form class="card mb-lg" data-pw-form>
          <h3 class="mb-md">Şifre Değiştir</h3>
          <div class="form-group"><label>Mevcut Şifre</label>
            <input type="password" class="form-input" name="current" required></div>
          <div class="form-group"><label>Yeni Şifre</label>
            <input type="password" class="form-input" name="newPw" minlength="4" required></div>
          <div class="form-group"><label>Yeni Şifre (tekrar)</label>
            <input type="password" class="form-input" name="newPw2" minlength="4" required></div>
          <button type="submit" class="btn btn-primary btn-sm">Şifreyi Güncelle</button>
        </form>
        ${isMentor ? `
        <div class="card mb-lg">
          <h3 class="mb-md">Hesabı Askıya Al</h3>
          <p class="text-muted mb-md">Geçici olarak mentör listesinden çıkarsın. Mevcut randevular etkilenmez. İstediğin zaman tekrar aktifleştirebilirsin.</p>
          ${settings.suspended ? `
            <button class="btn btn-primary" data-unsuspend>Hesabı Aktifleştir</button>
          ` : `
            <button class="btn btn-outline" data-suspend>Askıya Al</button>
          `}
        </div>` : ''}
        <div class="card" style="border:2px solid var(--c-danger, #e74c3c);">
          <h3 class="mb-md" style="color:var(--c-danger,#e74c3c);">Tehlikeli Bölge</h3>
          <p class="text-muted mb-md">Hesabını kalıcı olarak silersen tüm veriler kaybolur. Bu işlem geri alınamaz.</p>
          <button class="btn btn-outline" style="border-color:var(--c-danger,#e74c3c); color:var(--c-danger,#e74c3c);" data-delete-account>Hesabımı Sil</button>
        </div>`;

      contentHost.querySelector('[data-pw-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (fd.get('current') !== user.password) {
          App.toast('Mevcut şifre yanlış.', 'error'); return;
        }
        if (fd.get('newPw') !== fd.get('newPw2')) {
          App.toast('Yeni şifreler eşleşmiyor.', 'error'); return;
        }
        const users = S.get(S.keys.USERS, []);
        const u = users.find(x => x.id === user.id);
        if (u) { u.password = fd.get('newPw'); S.set(S.keys.USERS, users); }
        App.toast('Şifre güncellendi.', 'success');
        e.target.reset();
      });

      contentHost.querySelector('[data-suspend]')?.addEventListener('click', () => {
        if (confirm('Hesabını askıya almak istediğinden emin misin?')) {
          setUserSettings(user.id, { suspended: true });
          App.toast('Hesap askıya alındı. Mentör listesinde görünmüyorsun.', 'success');
          renderContent('security');
        }
      });
      contentHost.querySelector('[data-unsuspend]')?.addEventListener('click', () => {
        setUserSettings(user.id, { suspended: false });
        App.toast('Hesap tekrar aktif!', 'success');
        renderContent('security');
      });

      contentHost.querySelector('[data-delete-account]')?.addEventListener('click', () => {
        if (confirm('Hesabını silmek istediğinden emin misin? Bu işlem geri alınamaz!')) {
          const users = S.get(S.keys.USERS, []).filter(u => u.id !== user.id);
          S.set(S.keys.USERS, users);
          S.remove(S.keys.CURRENT_USER);
          App.toast('Hesap silindi.', 'success');
          setTimeout(() => window.location.href = 'index.html', 800);
        }
      });
    }

    switchTab('profile');
  };
})(window.App);
