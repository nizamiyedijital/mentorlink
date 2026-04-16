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

    const sidebarEl = document.querySelector('[data-sidebar]');
    const contentEl = document.querySelector('[data-content]');
    const tabs = [
      { key:'overview', icon:'📊', label:'Panorama' },
      { key:'appointments', icon:'📅', label:'Randevular' },
      { key:'favorites', icon:'❤️', label:'Favoriler' },
      { key:'spending', icon:'💰', label:'Harcamalar' },
      { key:'reviews', icon:'⭐', label:'Değerlendirmeler' }
    ];
    let currentTab = 'overview';

    function renderSidebar() {
      const sub = App.getSubscription(user.id);
      const planLabels = { monthly:'Aylık', quarterly:'3 Aylık', yearly:'Yıllık' };
      const subActive = sub && new Date(sub.endDate) > new Date();

      sidebarEl.innerHTML = `
        <div class="card" style="text-align:center; padding:1.25rem;">
          <p style="font-weight:700; font-size:1.1rem;">${user.name}</p>
          <p class="text-muted" style="font-size:0.85rem;">${user.email}</p>
          <span class="badge badge-primary" style="margin-top:0.5rem;">Danışan</span>
          ${subActive ? `<div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--c-border,#eee);">
            <p style="font-weight:600;">${planLabels[sub.plan]} Paket</p>
            <p class="text-muted" style="font-size:0.8rem;">Bitiş: ${new Date(sub.endDate).toLocaleDateString('tr-TR')}</p>
          </div>` : `<a href="pricing.html" class="btn btn-primary btn-sm btn-block" style="margin-top:0.75rem;">Paket Al</a>`}
        </div>
        <nav class="dash-nav">
          ${tabs.map(t => `<a href="#" class="dash-nav-item ${t.key===currentTab?'active':''}" data-ctab="${t.key}">
            <span>${t.icon} ${t.label}</span>
          </a>`).join('')}
        </nav>`;
      sidebarEl.querySelectorAll('[data-ctab]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); currentTab = el.dataset.ctab; renderSidebar(); renderContent(); });
      });
    }

    function renderContent() {
      const fn = { overview: renderOverview, appointments: renderAppointments, favorites: renderFavorites, spending: renderSpending, reviews: renderClientReviews };
      fn[currentTab]();
    }

    function renderOverview() {
      const apts = App.getUserAppointments(user.id);
      const upcoming = apts.filter(a => a.status === 'paid' && new Date(a.date+'T'+a.time) > Date.now())
        .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
      const pendingPay = apts.filter(a => a.status === 'approved');
      const requested = apts.filter(a => a.status === 'requested');
      const completed = apts.filter(a => a.status === 'completed');

      const pays = App.Storage.get(App.Storage.keys.PAYMENTS, []);
      const aptIds = new Set(apts.map(a => a.id));
      const myPays = pays.filter(p => aptIds.has(p.appointmentId));
      const totalSpent = myPays.reduce((s,p) => s+p.amount, 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSpent = myPays.filter(p => new Date(p.paidAt) >= monthStart).reduce((s,p) => s+p.amount, 0);

      const settings = App.getUserSettings(user.id);
      const goal = settings.sessionGoal || 4;
      const monthSessions = completed.filter(a => new Date(a.date) >= monthStart).length;
      const goalPct = Math.min(100, Math.round(monthSessions / goal * 100));

      const mentors = App.loadMentors();
      const interests = settings.interests || [];
      const recommended = mentors.filter(m => {
        if (interests.length && !interests.includes(m.category)) return false;
        return !apts.some(a => a.mentorId === m.id);
      }).sort((a,b) => b.rating - a.rating).slice(0, 3);

      const nextApt = upcoming[0];
      const countdown = nextApt ? Math.max(0, Math.round((new Date(nextApt.date+'T'+nextApt.time) - Date.now())/3600000)) : null;

      contentEl.innerHTML = `
        <div class="dash-stats-grid">
          <div class="stat-card ${upcoming.length ? 'stat-accent' : ''}">
            <div class="stat-label">Yaklaşan Seans</div>
            <div class="stat-value">${upcoming.length}</div>
            ${countdown !== null ? `<div class="stat-sub">${countdown < 24 ? countdown + ' saat sonra' : Math.ceil(countdown/24) + ' gün sonra'}</div>` : ''}
          </div>
          <div class="stat-card ${pendingPay.length ? 'stat-warn' : ''}">
            <div class="stat-label">Ödeme Bekleyen</div>
            <div class="stat-value">${pendingPay.length}</div>
            ${pendingPay.length ? `<div class="stat-sub">hemen öde</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-label">Onay Bekleyen</div>
            <div class="stat-value">${requested.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tamamlanan</div>
            <div class="stat-value">${completed.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bu Ay Harcama</div>
            <div class="stat-value">₺${monthSpent.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Toplam: ₺${totalSpent.toLocaleString('tr-TR')}</div>
          </div>
        </div>

        ${nextApt ? `
        <div class="card" style="margin-top:1.5rem; background:var(--c-gradient); color:white;">
          <div class="flex-between" style="flex-wrap:wrap; gap:1rem;">
            <div>
              <h3 style="margin:0;">Sonraki Seansın</h3>
              <p style="opacity:0.9; margin-top:0.25rem;"><strong>${nextApt.mentorName}</strong> • ${new Date(nextApt.date+'T'+nextApt.time).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} • ${nextApt.time}</p>
            </div>
            ${nextApt.meetLink ? `<a href="${nextApt.meetLink}" target="_blank" class="btn" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3);">Katıl</a>` : ''}
          </div>
        </div>` : ''}

        ${pendingPay.length ? `
        <div class="card" style="margin-top:1.5rem; border:2px solid #f39c12;">
          <h3 class="mb-md" style="color:#f39c12;">Ödeme Bekleyen Randevular</h3>
          ${pendingPay.map(a => `
            <div class="upcoming-item">
              <div><strong>${a.mentorName}</strong> <span class="text-muted">• ${a.date} ${a.time}</span></div>
              <a href="payment.html?id=${a.id}" class="btn btn-sm btn-primary">💳 Öde (₺${a.price})</a>
            </div>`).join('')}
        </div>` : ''}

        <div class="card" style="margin-top:1.5rem;">
          <div class="flex-between mb-sm">
            <h4>Aylık Hedef: ${monthSessions}/${goal} seans</h4>
            <button class="btn btn-ghost btn-sm" data-edit-cgoal>Düzenle</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${goalPct}%;"></div></div>
        </div>

        ${recommended.length ? `
        <div style="margin-top:1.5rem;">
          <h3 class="mb-md">Senin İçin Önerilen Mentörler</h3>
          <div class="grid grid-3" style="gap:1rem;">
            ${recommended.map(m => `
              <div class="card" style="padding:1rem;">
                <div class="flex" style="gap:0.75rem;">
                  <img src="${m.avatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
                  <div>
                    <strong>${m.name}</strong>
                    <div class="text-muted" style="font-size:0.8rem;">⭐ ${m.rating} • ₺${m.pricePerSession}/seans</div>
                  </div>
                </div>
                <a href="mentor-detail.html?id=${m.id}" class="btn btn-ghost btn-sm btn-block" style="margin-top:0.75rem;">Profili Gör</a>
              </div>`).join('')}
          </div>
        </div>` : ''}
      `;

      contentEl.querySelector('[data-edit-cgoal]')?.addEventListener('click', () => {
        const v = prompt('Aylık seans hedefinizi girin:', goal);
        if (v && !isNaN(v)) { App.setUserSettings(user.id, { sessionGoal: parseInt(v) }); renderContent(); }
      });
    }

    function renderAppointments() {
      const apts = App.getUserAppointments(user.id).sort((a,b) => new Date(b.date+'T'+b.time) - new Date(a.date+'T'+a.time));
      const active = apts.filter(a => ['requested','approved','paid'].includes(a.status));
      const past = apts.filter(a => !['requested','approved','paid'].includes(a.status));

      contentEl.innerHTML = `
        <h2 class="mb-md">Aktif Randevular (${active.length})</h2>
        ${active.length === 0 ? `<div class="empty-state card"><div class="empty-state-icon">📅</div>
          <p>Aktif randevun yok.</p><a href="mentors.html" class="btn btn-primary" style="margin-top:1rem;">Mentör Bul</a></div>` : active.map(apptHtml).join('')}
        <h2 style="margin: 2rem 0 1rem;">Geçmiş (${past.length})</h2>
        ${past.length === 0 ? '<p class="text-muted">Henüz geçmiş randevu yok.</p>' : past.map(apptHtml).join('')}`;

      contentEl.querySelectorAll('[data-cancel]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('İptal et?')) { App.cancelAppointment(btn.dataset.cancel); App.toast('İptal edildi.','success'); renderContent(); }
        });
      });
      contentEl.querySelectorAll('[data-review]').forEach(btn => {
        btn.addEventListener('click', () => openReviewModal(btn.dataset.review));
      });
    }

    function apptHtml(a) {
      const dt = new Date(a.date + 'T' + a.time);
      const st = App.STATUS_LABEL[a.status];
      const canCancel = ['requested','approved','paid'].includes(a.status) && dt.getTime() > Date.now();
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []);
      const hasReview = reviews.some(r => r.appointmentId === a.id);
      const needsReview = a.status === 'completed' && !hasReview;
      return `
        <div class="appointment-item">
          <div class="appointment-info">
            <h4>${a.mentorName}</h4>
            <p>${dt.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} • ${a.time} • ${a.type==='online'?'🖥️ Online':'🤝 Yüz Yüze'} • ₺${a.price||''}</p>
          </div>
          <div class="flex" style="align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <span class="badge ${st.cls}">${st.label}</span>
            ${a.status==='approved' ? `<a href="payment.html?id=${a.id}" class="btn btn-sm btn-primary">💳 Öde</a>` : ''}
            ${a.status==='paid'&&a.meetLink ? `<a href="${a.meetLink}" target="_blank" class="btn btn-sm btn-primary">Katıl</a>` : ''}
            ${needsReview ? `<button class="btn btn-sm btn-primary" data-review="${a.id}">⭐ Değerlendir</button>` : ''}
            ${hasReview ? '<span class="text-muted" style="font-size:0.8rem;">✓ Değerlendirildi</span>' : ''}
            ${canCancel ? `<button class="btn btn-sm btn-ghost" data-cancel="${a.id}">İptal</button>` : ''}
          </div>
        </div>`;
    }

    function openReviewModal(aptId) {
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
      const apt = apts.find(a => a.id === aptId);
      if (!apt) return;
      let selectedRating = 5;

      const modal = App.openModal(`
        <div class="modal-header"><h3>${apt.mentorName} — Değerlendir</h3><button class="modal-close" data-modal-close>×</button></div>
        <p class="text-muted mb-md">${apt.date} • ${apt.time} seansı için</p>
        <div class="star-picker" data-stars>
          ${[1,2,3,4,5].map(n => `<span class="star-btn active" data-star="${n}">⭐</span>`).join('')}
        </div>
        <form data-review-form>
          <div class="form-group"><label>Yorum (opsiyonel)</label>
            <textarea class="form-textarea" name="comment" rows="3" placeholder="Seansla ilgili düşünceleriniz..."></textarea></div>
          <button type="submit" class="btn btn-primary btn-block">Gönder</button>
        </form>
      `);

      const stars = modal.querySelectorAll('[data-star]');
      stars.forEach(s => s.addEventListener('click', () => {
        selectedRating = parseInt(s.dataset.star);
        stars.forEach(x => x.classList.toggle('active', parseInt(x.dataset.star) <= selectedRating));
      }));

      modal.querySelector('[data-review-form]').addEventListener('submit', e => {
        e.preventDefault();
        const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []);
        reviews.push({
          id: App.uid('rev'), appointmentId: aptId, mentorId: apt.mentorId,
          clientId: user.id, rating: selectedRating,
          comment: new FormData(e.target).get('comment') || '',
          createdAt: new Date().toISOString()
        });
        App.Storage.set(App.Storage.keys.REVIEWS, reviews);
        modal.remove();
        App.toast('Değerlendirme gönderildi!', 'success');
        renderContent();
      });
    }

    function renderFavorites() {
      const favs = App.Storage.get('mp_favorites', {})[user.id] || [];
      const mentors = App.loadMentors();
      const favMentors = mentors.filter(m => favs.includes(m.id));

      contentEl.innerHTML = `
        <h2 class="mb-lg">Favori Mentörlerim</h2>
        ${favMentors.length === 0 ? `
          <div class="empty-state card">
            <div class="empty-state-icon">❤️</div>
            <p>Henüz favori mentörün yok.</p>
            <p class="text-muted">Mentör detay sayfasında kalp ikonuna tıklayarak favori ekleyebilirsin.</p>
            <a href="mentors.html" class="btn btn-primary" style="margin-top:1rem;">Mentörleri Keşfet</a>
          </div>` : `
          <div class="grid grid-3" style="gap:1rem;">
            ${favMentors.map(m => `
              <div class="card" style="padding:1rem;">
                <div class="flex" style="gap:1rem; margin-bottom:0.75rem;">
                  <img src="${m.avatar}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">
                  <div>
                    <strong>${m.name}</strong>
                    <p class="text-muted" style="font-size:0.8rem;">${m.title}</p>
                    <div class="text-muted" style="font-size:0.85rem;">⭐ ${m.rating} • ₺${m.pricePerSession}/seans</div>
                  </div>
                </div>
                <div class="flex" style="gap:0.5rem;">
                  <a href="mentor-detail.html?id=${m.id}" class="btn btn-primary btn-sm" style="flex:1;">Randevu Al</a>
                  <button class="btn btn-ghost btn-sm" data-unfav="${m.id}">❤️ Kaldır</button>
                </div>
              </div>`).join('')}
          </div>`}`;

      contentEl.querySelectorAll('[data-unfav]').forEach(b => b.addEventListener('click', () => {
        const all = App.Storage.get('mp_favorites', {});
        all[user.id] = (all[user.id]||[]).filter(id => id !== b.dataset.unfav);
        App.Storage.set('mp_favorites', all);
        App.toast('Favorilerden kaldırıldı.', 'success');
        renderContent();
      }));
    }

    function renderSpending() {
      const apts = App.getUserAppointments(user.id);
      const pays = App.Storage.get(App.Storage.keys.PAYMENTS, []);
      const aptIds = new Set(apts.map(a => a.id));
      const myPays = pays.filter(p => aptIds.has(p.appointmentId)).sort((a,b) => new Date(b.paidAt) - new Date(a.paidAt));
      const totalSpent = myPays.reduce((s,p) => s+p.amount, 0);

      const now = new Date();
      const monthly = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const next = new Date(now.getFullYear(), now.getMonth()-i+1, 1);
        const value = myPays.filter(p => { const t = new Date(p.paidAt); return t >= d && t < next; }).reduce((s,p) => s+p.amount, 0);
        monthly.push({ label: d.toLocaleDateString('tr-TR',{month:'short'}), value });
      }
      const maxM = Math.max(1, ...monthly.map(x => x.value));

      contentEl.innerHTML = `
        <h2 class="mb-lg">Harcama Özeti</h2>
        <div class="dash-stats-grid mb-lg">
          <div class="stat-card stat-accent">
            <div class="stat-label">Toplam Harcama</div>
            <div class="stat-value">₺${totalSpent.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">${myPays.length} ödeme</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bu Ay</div>
            <div class="stat-value">₺${monthly[monthly.length-1].value.toLocaleString('tr-TR')}</div>
          </div>
        </div>
        <div class="card mb-lg">
          <h3 class="mb-md">Son 6 Ay</h3>
          <div class="bar-chart">${monthly.map(m => `
            <div class="bar-col"><div class="bar" style="height:${(m.value/maxM)*140}px;"></div>
            <div class="bar-label">${m.label}</div><div class="bar-value">₺${m.value>=1000?(m.value/1000).toFixed(1)+'k':m.value}</div></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3 class="mb-md">Ödeme Geçmişi</h3>
          ${myPays.length === 0 ? '<p class="text-muted">Henüz ödeme yok.</p>' : `
          <table class="data-table">
            <thead><tr><th>Tarih</th><th>Mentör</th><th>Tutar</th><th>Durum</th></tr></thead>
            <tbody>${myPays.map(p => {
              const a = apts.find(x => x.id === p.appointmentId);
              return `<tr><td>${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                <td>${a?a.mentorName:'-'}</td><td>₺${p.amount.toLocaleString('tr-TR')}</td>
                <td><span class="badge badge-success">Ödendi</span></td></tr>`;
            }).join('')}</tbody>
          </table>`}
        </div>`;
    }

    function renderClientReviews() {
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []).filter(r => r.clientId === user.id)
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
      const awaitingReview = App.getUserAppointments(user.id).filter(a => {
        return a.status === 'completed' && !reviews.some(r => r.appointmentId === a.id);
      });

      contentEl.innerHTML = `
        <h2 class="mb-lg">Değerlendirmelerim</h2>
        ${awaitingReview.length ? `
        <div class="card mb-lg" style="border:2px solid var(--c-primary);">
          <h3 class="mb-md">Değerlendirme Bekleyen Seanslar (${awaitingReview.length})</h3>
          ${awaitingReview.map(a => `
            <div class="upcoming-item">
              <div><strong>${a.mentorName}</strong> <span class="text-muted">• ${a.date}</span></div>
              <button class="btn btn-sm btn-primary" data-review="${a.id}">⭐ Değerlendir</button>
            </div>`).join('')}
        </div>` : ''}
        <h3 class="mb-md">Gönderilen Değerlendirmeler (${reviews.length})</h3>
        ${reviews.length === 0 ? '<p class="text-muted">Henüz değerlendirme yok.</p>' : `
        <div class="card" style="padding:0;">
          ${reviews.map(r => {
            const a = apts.find(x => x.id === r.appointmentId);
            return `<div class="review-item">
              <div class="flex-between">
                <div><strong>${a?a.mentorName:'Mentör'}</strong> <span>${'⭐'.repeat(r.rating)}</span></div>
                <span class="text-muted" style="font-size:0.8rem;">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
              ${r.comment ? `<p style="margin-top:0.5rem; color:var(--c-text-light);">${r.comment}</p>` : ''}
            </div>`;
          }).join('')}
        </div>`}`;

      contentEl.querySelectorAll('[data-review]').forEach(btn => {
        btn.addEventListener('click', () => openReviewModal(btn.dataset.review));
      });
    }

    renderSidebar();
    renderContent();
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
