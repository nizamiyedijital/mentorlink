(function (App) {
  App.STATUS_LABEL = {
    requested: { label: 'Onay bekliyor', cls: 'badge-warning' },
    approved: { label: 'Ödeme bekliyor', cls: 'badge-info' },
    paid: { label: 'Yaklaşan', cls: 'badge-primary' },
    completed: { label: 'Tamamlandı', cls: 'badge-success' },
    cancelled: { label: 'İptal', cls: 'badge-danger' },
    no_show: { label: 'Gelinmedi', cls: 'badge-danger' },
    rejected: { label: 'Reddedildi', cls: 'badge-danger' }
  };

  App.initMentorDetail = function () {
    const host = document.querySelector('[data-mentor-detail]');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id');
    const mentors = App.loadMentors();
    const m = mentors.find(x => x.id === id);
    if (!m) {
      host.innerHTML = `<div class="empty-state"><h3>Mentör bulunamadı</h3>
        <a href="mentors.html" class="btn btn-primary">Tüm Mentörler</a></div>`;
      return;
    }
    const category = App.CATEGORIES[m.category];
    host.innerHTML = `
      <div class="detail-layout">
        <div>
          <div class="detail-hero">
            <div class="detail-avatar"><img src="${m.avatar}" alt="${m.name}"></div>
            <div>
              <span class="badge badge-primary">${category.icon} ${category.label}</span>
              <h1 style="margin: 0.5rem 0;">${m.name}</h1>
              <p class="text-muted mb-sm">${m.title}</p>
              <div class="flex" style="gap:1.5rem; flex-wrap:wrap;">
                <div class="mentor-rating">⭐ <strong>${m.rating}</strong> <span>(${m.reviewCount} değerlendirme)</span></div>
                <div class="text-muted">✅ ${m.sessionsCompleted} seans</div>
                <div class="text-muted">🌐 ${m.languages.join(', ')}</div>
              </div>
            </div>
          </div>
          <div class="card">
            <h3 class="mb-md">Hakkında</h3>
            <p style="color:var(--c-text-light); line-height:1.8;">${m.bio}</p>
            <h3 style="margin: 1.5rem 0 0.75rem;">Uzmanlık Alanları</h3>
            <div class="mentor-tags">
              ${m.expertise.map(e => `<span class="badge badge-secondary">${e}</span>`).join('')}
            </div>
          </div>
          <div class="card" style="margin-top:1.5rem;">
            <h3 class="mb-md">Müsait Zamanlar</h3>
            <div data-slot-picker></div>
          </div>
        </div>
        <aside class="booking-sidebar">
          <div class="booking-price">₺${m.pricePerSession}</div>
          <div class="text-muted mb-lg">seans başına</div>
          <button class="btn btn-primary btn-block btn-lg" data-scroll-slots>📅 Randevu Oluştur</button>
          <ul class="booking-meta">
            <li>✅ Mentör onayından sonra ödeme alınır</li>
            <li>✅ 24 saat öncesine kadar ücretsiz iptal</li>
            <li>✅ Online (Meet) veya yüz yüze</li>
          </ul>
        </aside>
      </div>`;

    renderSlotPicker(m);
    document.querySelector('[data-scroll-slots]')?.addEventListener('click', () => {
      document.querySelector('[data-slot-picker]').scrollIntoView({ behavior: 'smooth' });
    });
  };

  function renderSlotPicker(mentor) {
    const host = document.querySelector('[data-slot-picker]');
    const days = App.nextAvailableDays(mentor.id, 10);
    if (!days.length) {
      host.innerHTML = `<p class="text-muted">Önümüzdeki 2 hafta için müsait slot yok.</p>`;
      return;
    }
    host.innerHTML = `
      <div class="slot-days">
        ${days.map((d, i) => `
          <button class="slot-day ${i === 0 ? 'active' : ''}" data-day="${d.date}">
            <span class="slot-day-name">${d.dateObj.toLocaleDateString('tr-TR', { weekday: 'short' })}</span>
            <span class="slot-day-num">${d.dateObj.getDate()}</span>
            <span class="slot-day-mon">${d.dateObj.toLocaleDateString('tr-TR', { month: 'short' })}</span>
          </button>`).join('')}
      </div>
      <div class="slot-times" data-slot-times></div>`;

    function renderTimes(date) {
      const day = days.find(d => d.date === date);
      const host2 = host.querySelector('[data-slot-times]');
      host2.innerHTML = day.slots.map(t => `
        <button class="slot-time" data-slot="${date}|${t}">${t}</button>
      `).join('');
      host2.querySelectorAll('[data-slot]').forEach(btn => {
        btn.addEventListener('click', () => {
          const [d, t] = btn.dataset.slot.split('|');
          openBookingModal(mentor, d, t);
        });
      });
    }
    renderTimes(days[0].date);
    host.querySelectorAll('[data-day]').forEach(b => {
      b.addEventListener('click', () => {
        host.querySelectorAll('[data-day]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderTimes(b.dataset.day);
      });
    });
  }

  function openBookingModal(mentor, date, time) {
    const user = App.getCurrentUser();
    if (!user) {
      App.toast('Randevu için önce giriş yapmalısınız.', 'error');
      setTimeout(() => window.location.href = 'login.html', 800); return;
    }
    if (user.role !== 'client') { App.toast('Sadece danışan hesapları randevu alabilir.', 'error'); return; }
    if (!App.hasActiveSubscription(user.id)) {
      App.toast('Randevu için aktif aboneliğiniz olmalı.', 'error');
      setTimeout(() => window.location.href = 'pricing.html', 1000); return;
    }

    const dtStr = new Date(date + 'T' + time).toLocaleDateString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const types = (App.getAvailability(mentor.id).sessionTypes || ['online', 'offline']);

    const modal = App.openModal(`
      <div class="modal-header">
        <h3>Randevu İsteği</h3>
        <button class="modal-close" data-modal-close>×</button>
      </div>
      <div class="booking-summary">
        <div><strong>${mentor.name}</strong></div>
        <div class="text-muted">${dtStr} • ${time}</div>
        <div class="text-muted">Süre: ${App.getAvailability(mentor.id).sessionDuration} dk • ₺${mentor.pricePerSession}</div>
      </div>
      <form data-booking-form>
        ${types.length > 1 ? `
        <div class="form-group"><label>Görüşme Tipi</label>
          <div class="radio-group">
            ${types.includes('online') ? '<label class="radio-option"><input type="radio" name="type" value="online" checked><span>🖥️ Online (Meet)</span></label>' : ''}
            ${types.includes('offline') ? '<label class="radio-option"><input type="radio" name="type" value="offline"><span>🤝 Yüz Yüze</span></label>' : ''}
          </div></div>` : `<input type="hidden" name="type" value="${types[0]}">`}
        <div class="form-group"><label>Gündem / Not</label>
          <textarea class="form-textarea" name="note" placeholder="Bu seansta nelere odaklanmak istiyorsunuz?"></textarea></div>
        <div class="alert alert-info" style="font-size:0.85rem; margin-bottom:1rem;">
          ℹ️ Randevun mentör onayına gönderilir. Onaylandıktan sonra ödeme bağlantısı alacaksın. Ödeme tamamlanmadan seans kesinleşmez.
        </div>
        <button type="submit" class="btn btn-primary btn-block">Onay için Gönder</button>
      </form>`);

    modal.querySelector('[data-booking-form]').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      App.createAppointment({
        clientId: user.id, clientName: user.name,
        mentorId: mentor.id, mentorName: mentor.name,
        date, time, price: mentor.pricePerSession,
        type: fd.get('type'), note: fd.get('note') || ''
      });
      modal.remove();
      App.toast('Randevu isteğin gönderildi! Mentör onayı bekleniyor.', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 900);
    });
  }

  App.createAppointment = function (data) {
    const list = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
    list.push({
      id: App.uid('apt'),
      status: 'requested',
      meetLink: null,
      createdAt: new Date().toISOString(),
      ...data
    });
    App.Storage.set(App.Storage.keys.APPOINTMENTS, list);
  };

  App.updateAppointment = function (id, patch) {
    const list = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
    const apt = list.find(a => a.id === id);
    if (apt) Object.assign(apt, patch);
    App.Storage.set(App.Storage.keys.APPOINTMENTS, list);
    return apt;
  };

  App.approveAppointment = function (id) {
    return App.updateAppointment(id, { status: 'approved', approvedAt: new Date().toISOString() });
  };
  App.rejectAppointment = function (id) {
    return App.updateAppointment(id, { status: 'rejected', rejectedAt: new Date().toISOString() });
  };
  App.cancelAppointment = function (id) {
    return App.updateAppointment(id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
  };
  App.completeAppointment = function (id) {
    return App.updateAppointment(id, { status: 'completed', completedAt: new Date().toISOString() });
  };
  App.markNoShow = function (id) {
    return App.updateAppointment(id, { status: 'no_show', completedAt: new Date().toISOString() });
  };

  App.payForAppointment = function (id) {
    const apt = App.updateAppointment(id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      meetLink: 'https://meet.google.com/' + Math.random().toString(36).slice(2, 5) + '-' + Math.random().toString(36).slice(2, 6)
    });
    if (!apt) return null;
    const payments = App.Storage.get(App.Storage.keys.PAYMENTS, []);
    const amount = apt.price || 0;
    const commission = Math.round(amount * App.COMMISSION_RATE);
    payments.push({
      id: App.uid('pay'), appointmentId: id, amount,
      commission, net: amount - commission,
      status: 'paid', paidAt: new Date().toISOString()
    });
    App.Storage.set(App.Storage.keys.PAYMENTS, payments);
    return apt;
  };

  App.getUserAppointments = function (userId) {
    return App.Storage.get(App.Storage.keys.APPOINTMENTS, []).filter(a => a.clientId === userId);
  };
  App.getMentorAppointments = function (mentorId) {
    return App.Storage.get(App.Storage.keys.APPOINTMENTS, []).filter(a => a.mentorId === mentorId);
  };

  App.getMentorStats = function (mentorId) {
    const apts = App.getMentorAppointments(mentorId);
    const payments = App.Storage.get(App.Storage.keys.PAYMENTS, []);
    const aptIds = new Set(apts.map(a => a.id));
    const myPays = payments.filter(p => aptIds.has(p.appointmentId) && p.status === 'paid');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completed = apts.filter(a => a.status === 'completed');
    const completedThisMonth = completed.filter(a => new Date(a.date) >= monthStart);

    const totalGross = myPays.reduce((s, p) => s + p.amount, 0);
    const totalNet = myPays.reduce((s, p) => s + p.net, 0);
    const monthPays = myPays.filter(p => new Date(p.paidAt) >= monthStart);
    const monthGross = monthPays.reduce((s, p) => s + p.amount, 0);
    const monthNet = monthPays.reduce((s, p) => s + p.net, 0);

    return {
      pending: apts.filter(a => a.status === 'requested').length,
      upcoming: apts.filter(a => a.status === 'paid').length,
      awaitingPayment: apts.filter(a => a.status === 'approved').length,
      completedTotal: completed.length,
      completedMonth: completedThisMonth.length,
      earningsMonthGross: monthGross,
      earningsMonthNet: monthNet,
      earningsTotalGross: totalGross,
      earningsTotalNet: totalNet,
      payments: myPays
    };
  };
})(window.App);
