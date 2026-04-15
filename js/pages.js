(function (App) {
  App.initLoginPage = function () {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;
    const errEl = document.querySelector('[data-error]');
    form.addEventListener('submit', e => {
      e.preventDefault();
      errEl.classList.add('hidden');
      const fd = new FormData(form);
      try {
        const user = App.login(fd.get('email'), fd.get('password'));
        if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'mentor_candidate') window.location.href = 'become-mentor.html';
        else window.location.href = 'dashboard.html';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  };

  App.initRegisterPage = function () {
    const form = document.querySelector('[data-register-form]');
    if (!form) return;
    const errEl = document.querySelector('[data-error]');
    form.addEventListener('submit', e => {
      e.preventDefault();
      errEl.classList.add('hidden');
      const fd = new FormData(form);
      try {
        const user = App.register({
          name: fd.get('name'),
          email: fd.get('email'),
          password: fd.get('password'),
          role: fd.get('role')
        });
        if (user.role === 'mentor_candidate') window.location.href = 'become-mentor.html';
        else window.location.href = 'pricing.html';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  };

  App.initPricingPage = function () {
    document.querySelectorAll('[data-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = App.getCurrentUser();
        if (!user) {
          App.toast('Önce giriş yapmalısınız.', 'error');
          setTimeout(() => window.location.href = 'login.html', 800);
          return;
        }
        App.setSubscription(user.id, btn.dataset.plan);
        App.toast('Aboneliğiniz başarıyla aktifleşti!', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 900);
      });
    });
  };

  App.initDashboardPage = function () {
    const user = App.requireAuth();
    if (!user) return;
    document.querySelector('[data-hello]').textContent = `Merhaba ${user.name} 👋`;

    if (user.role === 'mentor') {
      App.initMentorDashboard(user);
      return;
    }

    render();

    function render() {
      const sub = App.getSubscription(user.id);
      const apts = App.getUserAppointments(user.id).sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
      const active = apts.filter(a => ['requested', 'approved', 'paid'].includes(a.status));
      const past = apts.filter(a => !['requested', 'approved', 'paid'].includes(a.status));
      const planLabels = { monthly: 'Aylık', quarterly: '3 Aylık', yearly: 'Yıllık' };
      const subActive = sub && new Date(sub.endDate) > new Date();
      const pendingPayment = apts.filter(a => a.status === 'approved').length;

      document.querySelector('[data-sidebar]').innerHTML = `
        <div class="dash-stat">
          <div class="dash-stat-value">${active.filter(a => a.status === 'paid').length}</div>
          <div class="text-muted">Yaklaşan Seans</div>
        </div>
        <div class="dash-stat ${pendingPayment ? 'dash-stat-alert' : ''}">
          <div class="dash-stat-value">${pendingPayment}</div>
          <div class="text-muted">Ödeme Bekleyen</div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-value">${apts.filter(a => a.status === 'completed').length}</div>
          <div class="text-muted">Tamamlanan</div>
        </div>
        <div class="card">
          <h4 style="font-size:0.85rem; color:var(--c-muted); text-transform:uppercase; letter-spacing:1px;">Üyelik</h4>
          ${subActive ? `
            <p style="font-weight:700; font-size:1.25rem; margin:0.5rem 0;">${planLabels[sub.plan]} Paket</p>
            <p class="text-muted" style="font-size:0.85rem;">Bitiş: ${new Date(sub.endDate).toLocaleDateString('tr-TR')}</p>
            <a href="pricing.html" class="btn btn-ghost btn-sm" style="padding-left:0;">Paketi Değiştir</a>
          ` : `
            <p class="text-muted" style="margin:0.5rem 0;">Aktif abonelik yok.</p>
            <a href="pricing.html" class="btn btn-primary btn-sm btn-block" style="margin-top:0.5rem;">Paket Al</a>
          `}
        </div>
        <div class="card">
          <h4 style="font-size:0.85rem; color:var(--c-muted); text-transform:uppercase; letter-spacing:1px;">Profil</h4>
          <p style="margin:0.5rem 0;"><strong>${user.name}</strong></p>
          <p class="text-muted" style="font-size:0.85rem;">${user.email}</p>
          <span class="badge badge-primary" style="margin-top:0.5rem;">Danışan</span>
        </div>`;

      document.querySelector('[data-content]').innerHTML = `
        <h2 class="mb-md">Randevularım</h2>
        ${active.length === 0 ? `
          <div class="empty-state card">
            <div class="empty-state-icon">📅</div>
            <p>Henüz aktif bir randevun yok.</p>
            <a href="mentors.html" class="btn btn-primary" style="margin-top:1rem;">Mentör Bul</a>
          </div>` : active.map(apptHtml).join('')}
        ${past.length ? `<h2 style="margin: 2rem 0 1rem;">Geçmiş</h2>
          ${past.map(apptHtml).join('')}` : ''}`;

      document.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) {
            App.cancelAppointment(btn.dataset.cancel);
            App.toast('Randevu iptal edildi.', 'success');
            render();
          }
        });
      });
    }

    function apptHtml(a) {
      const dt = new Date(a.date + 'T' + a.time);
      const st = App.STATUS_LABEL[a.status];
      const canCancel = ['requested', 'approved', 'paid'].includes(a.status) && dt.getTime() > Date.now();
      return `
        <div class="appointment-item">
          <div class="appointment-info">
            <h4>${a.mentorName}</h4>
            <p>${dt.toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })} • ${a.time} • ${a.type === 'online' ? '🖥️ Online' : '🤝 Yüz Yüze'} • ₺${a.price || ''}</p>
          </div>
          <div class="flex" style="align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <span class="badge ${st.cls}">${st.label}</span>
            ${a.status === 'approved' ? `<a href="payment.html?id=${a.id}" class="btn btn-sm btn-primary">💳 Ödeme Yap</a>` : ''}
            ${a.status === 'paid' && a.meetLink ? `<a href="${a.meetLink}" target="_blank" class="btn btn-sm btn-primary">Katıl</a>` : ''}
            ${canCancel ? `<button class="btn btn-sm btn-ghost" data-cancel="${a.id}">İptal</button>` : ''}
          </div>
        </div>`;
    }
  };

  App.initPaymentPage = function () {
    const user = App.requireAuth();
    if (!user) return;
    const host = document.querySelector('[data-payment]');
    const id = new URLSearchParams(location.search).get('id');
    const apt = App.Storage.get(App.Storage.keys.APPOINTMENTS, []).find(a => a.id === id);
    if (!apt || apt.clientId !== user.id) {
      host.innerHTML = `<div class="card"><h3>Randevu bulunamadı</h3>
        <a href="dashboard.html" class="btn btn-primary" style="margin-top:1rem;">Panele Dön</a></div>`;
      return;
    }
    if (apt.status !== 'approved') {
      const msg = {
        requested: 'Bu randevu henüz mentör onayını beklemekte.',
        paid: 'Bu randevunun ödemesi zaten alınmış.',
        cancelled: 'Bu randevu iptal edildi.',
        rejected: 'Bu randevu reddedildi.',
        completed: 'Bu randevu tamamlandı.'
      }[apt.status] || 'Bu randevu için ödeme alınamaz.';
      host.innerHTML = `<div class="card"><h3>${msg}</h3>
        <a href="dashboard.html" class="btn btn-primary" style="margin-top:1rem;">Panele Dön</a></div>`;
      return;
    }

    const dtStr = new Date(apt.date + 'T' + apt.time).toLocaleDateString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    host.innerHTML = `
      <div class="grid grid-2" style="gap:2rem; align-items:start;">
        <form class="card" data-pay-form>
          <h3 class="mb-md">Kart Bilgileri</h3>
          <div class="form-group"><label>Kart Üzerindeki İsim</label>
            <input type="text" class="form-input" name="name" required placeholder="AD SOYAD"></div>
          <div class="form-group"><label>Kart Numarası</label>
            <input type="text" class="form-input" name="number" required maxlength="19" placeholder="4242 4242 4242 4242"></div>
          <div class="grid grid-2" style="gap:1rem;">
            <div class="form-group"><label>Son Kullanma</label>
              <input type="text" class="form-input" name="exp" required placeholder="AA/YY" maxlength="5"></div>
            <div class="form-group"><label>CVV</label>
              <input type="text" class="form-input" name="cvv" required maxlength="4" placeholder="123"></div>
          </div>
          <div class="alert alert-info" style="font-size:0.85rem; margin-bottom:1rem;">
            🔒 Bu bir demo ödeme sayfasıdır. Gerçek ücret tahsil edilmez. Üretimde iyzico altyapısı kullanılacaktır.
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">₺${apt.price} Öde</button>
        </form>
        <aside class="card">
          <h4 class="mb-md">Sipariş Özeti</h4>
          <div class="pay-summary">
            <div class="flex-between"><span>Mentör</span><strong>${apt.mentorName}</strong></div>
            <div class="flex-between"><span>Tarih</span><span>${dtStr}</span></div>
            <div class="flex-between"><span>Saat</span><span>${apt.time}</span></div>
            <div class="flex-between"><span>Tip</span><span>${apt.type === 'online' ? '🖥️ Online' : '🤝 Yüz yüze'}</span></div>
            <hr>
            <div class="flex-between"><span>Seans ücreti</span><span>₺${apt.price}</span></div>
            <div class="flex-between" style="font-size:1.25rem; margin-top:0.5rem;">
              <strong>Toplam</strong><strong style="color:var(--c-primary);">₺${apt.price}</strong>
            </div>
          </div>
          <ul class="booking-meta" style="margin-top:1rem;">
            <li>✅ ${apt.type === 'online' ? 'Meet linki ödeme sonrası otomatik' : 'Adres bilgisi mentör tarafından paylaşılacak'}</li>
            <li>✅ 24 saat öncesine kadar ücretsiz iptal</li>
          </ul>
        </aside>
      </div>`;

    host.querySelector('[data-pay-form]').addEventListener('submit', e => {
      e.preventDefault();
      App.payForAppointment(id);
      App.toast('Ödeme başarılı! Seans kesinleşti.', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 900);
    });
  };

  App.initBecomeMentorPage = function () {
    const user = App.requireAuth();
    if (!user) return;
    render();

    function render() {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const app = apps.find(a => a.userId === user.id);
      const progress = App.Storage.get(App.Storage.keys.TRAINING_PROGRESS, {})[user.id] || [];
      const quizResult = App.Storage.get(App.Storage.keys.QUIZ_RESULTS, {})[user.id];
      const host = document.querySelector('[data-mentor-flow]');

      if (user.role === 'mentor') {
        host.innerHTML = `
          <div class="card text-center">
            <div class="empty-state-icon">🎉</div>
            <h2>Sen zaten onaylı bir mentörsün!</h2>
            <p class="text-muted mb-lg">Mentör listesinde yer alıyorsun.</p>
            <a href="dashboard.html" class="btn btn-primary">Panele Git</a>
          </div>`;
        return;
      }

      if (!app) {
        host.innerHTML = formHtml();
        document.querySelector('[data-app-form]').addEventListener('submit', e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          apps.push({
            id: App.uid('app'),
            userId: user.id,
            category: fd.get('category'),
            title: fd.get('title'),
            bio: fd.get('bio'),
            expertise: fd.get('expertise'),
            motivation: fd.get('motivation'),
            price: fd.get('price'),
            availability: fd.get('availability'),
            trainingDone: false, quizScore: null, status: 'pending',
            createdAt: new Date().toISOString()
          });
          App.Storage.set(App.Storage.keys.APPLICATIONS, apps);
          App.toast('Başvurunuz alındı! Şimdi eğitim aşamasına geçin.', 'success');
          setTimeout(render, 900);
        });
        return;
      }

      const statusLabel = {
        pending: '<span class="badge badge-warning">İnceleniyor</span>',
        approved: '<span class="badge badge-success">Onaylandı</span>',
        rejected: '<span class="badge badge-danger">Reddedildi</span>'
      }[app.status];

      const step2Done = progress.length >= 5;
      const step3Done = quizResult?.passed;

      host.innerHTML = `
        <div class="card mb-lg">
          <div class="flex-between" style="flex-wrap:wrap; gap:1rem;">
            <div><h3>Başvuru Durumun</h3><p class="text-muted">Mentörlük sertifikasyon sürecin</p></div>
            ${statusLabel}
          </div>
        </div>
        <div class="steps-grid">
          <div class="step" style="border:2px solid var(--c-success);">
            <h3>✓ Başvuru</h3>
            <p class="text-muted">Formunu doldurdun, inceleme için gönderildi.</p>
          </div>
          <div class="step" style="${step2Done ? 'border:2px solid var(--c-success);' : ''}">
            <h3>${step2Done ? '✓ ' : ''}Eğitim</h3>
            <p class="text-muted">${progress.length}/5 bölüm tamamlandı.</p>
            <a href="training.html" class="btn btn-primary btn-sm" style="margin-top:0.75rem;">
              ${step2Done ? 'Tekrar Gözden Geçir' : 'Eğitime Git'}
            </a>
          </div>
          <div class="step" style="${step3Done ? 'border:2px solid var(--c-success);' : ''}">
            <h3>${step3Done ? '✓ ' : ''}Sınav</h3>
            <p class="text-muted">
              ${quizResult ? (step3Done ? `Skor: %${quizResult.score}` : `Son skor: %${quizResult.score} (geçmedi)`) : 'Henüz girilmedi.'}
            </p>
            ${step2Done ? `<a href="quiz.html" class="btn btn-primary btn-sm" style="margin-top:0.75rem;">
              ${quizResult ? 'Tekrar Gir' : 'Sınava Başla'}
            </a>` : `<button class="btn btn-ghost btn-sm" disabled style="margin-top:0.75rem;">Önce eğitim</button>`}
          </div>
        </div>
        ${app.status === 'pending' && step3Done ? `
          <div class="card" style="margin-top:2rem; background: var(--c-gradient-soft);">
            <h3>⏳ Admin onayı bekleniyor</h3>
            <p>Tüm adımları tamamladın! Başvurun admin tarafından inceleniyor.</p>
          </div>` : ''}
        ${app.status === 'rejected' ? `
          <div class="card" style="margin-top:2rem; border:2px solid var(--c-danger);">
            <h3>Başvurun reddedildi</h3>
            <p class="text-muted">Ekibimizle iletişime geçebilirsin.</p>
          </div>` : ''}
      `;
    }

    function formHtml() {
      return `
        <form class="card" data-app-form>
          <h3 class="mb-lg">Mentörlük Başvuru Formu</h3>
          <div class="form-group"><label>Uzmanlık Kategorisi</label>
            <select class="form-select" name="category" required>
              <option value="">Seçiniz</option>
              <option value="kariyer">💼 Kariyer & İş Yaşamı</option>
              <option value="akademik">🎓 Akademik / Öğrenci</option>
              <option value="girisim">🚀 Girişimcilik & İş Kurma</option>
              <option value="kisisel">🌱 Kişisel Gelişim</option>
            </select></div>
          <div class="form-group"><label>Profesyonel Ünvan</label>
            <input type="text" class="form-input" name="title" placeholder="Örn: Yazılım Kariyer Mentörü" required></div>
          <div class="form-group"><label>Uzmanlık Alanları (virgülle ayırın)</label>
            <input type="text" class="form-input" name="expertise" placeholder="CV Hazırlama, Mülakat, Kariyer Değişimi" required></div>
          <div class="form-group"><label>Özgeçmiş / Bio</label>
            <textarea class="form-textarea" name="bio" minlength="50" required placeholder="Deneyimlerini kısaca anlat (en az 50 karakter)."></textarea></div>
          <div class="form-group"><label>Neden mentör olmak istiyorsun?</label>
            <textarea class="form-textarea" name="motivation" minlength="30" required></textarea></div>
          <div class="grid grid-2">
            <div class="form-group"><label>Seans Ücreti (₺)</label>
              <input type="number" class="form-input" name="price" min="200" max="3000" value="600" required></div>
            <div class="form-group"><label>Müsaitlik</label>
              <input type="text" class="form-input" name="availability" placeholder="Hafta içi akşam" required></div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block">Başvuruyu Gönder</button>
        </form>`;
    }
  };
})(window.App);
