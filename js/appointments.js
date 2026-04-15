(function (App) {
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
            <h3 style="margin: 1.5rem 0 0.75rem;">Müsaitlik</h3>
            <p class="text-muted">${m.availability}</p>
          </div>
        </div>
        <aside class="booking-sidebar">
          <div class="booking-price">₺${m.pricePerSession}</div>
          <div class="text-muted mb-lg">seans başına</div>
          <button class="btn btn-primary btn-block btn-lg" data-book="${m.id}">📅 Randevu Oluştur</button>
          <p class="text-muted" style="font-size:0.85rem; margin-top:1rem; text-align:center;">
            Aboneliğinize dahildir. Ücretsiz iptal 24 saat öncesine kadar.
          </p>
        </aside>
      </div>`;
    document.querySelector('[data-book]')?.addEventListener('click', () => openBookingModal(m));
  };

  function openBookingModal(mentor) {
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

    const today = new Date().toISOString().split('T')[0];
    const modal = App.openModal(`
      <div class="modal-header">
        <h3>Randevu Oluştur</h3>
        <button class="modal-close" data-modal-close>×</button>
      </div>
      <p class="text-muted mb-lg">${mentor.name} ile seans planlıyorsunuz.</p>
      <form data-booking-form>
        <div class="form-group"><label>Tarih</label>
          <input type="date" class="form-input" name="date" min="${today}" required></div>
        <div class="form-group"><label>Saat</label>
          <select class="form-select" name="time" required>
            <option value="">Seçiniz</option>
            <option>09:00</option><option>10:00</option><option>11:00</option>
            <option>13:00</option><option>14:00</option><option>15:00</option>
            <option>16:00</option><option>17:00</option><option>19:00</option><option>20:00</option>
          </select></div>
        <div class="form-group"><label>Görüşme Tipi</label>
          <div class="radio-group">
            <label class="radio-option"><input type="radio" name="type" value="online" checked><span>🖥️ Online (Zoom/Meet)</span></label>
            <label class="radio-option"><input type="radio" name="type" value="offline"><span>🤝 Yüz Yüze</span></label>
          </div></div>
        <div class="form-group"><label>Gündem / Not (opsiyonel)</label>
          <textarea class="form-textarea" name="note" placeholder="Bu seansta nelere odaklanmak istiyorsunuz?"></textarea></div>
        <button type="submit" class="btn btn-primary btn-block">Randevuyu Oluştur</button>
      </form>`);
    modal.querySelector('[data-booking-form]').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const type = fd.get('type');
      createAppointment({
        clientId: user.id, mentorId: mentor.id, mentorName: mentor.name,
        date: fd.get('date'), time: fd.get('time'), type, note: fd.get('note'),
        meetLink: type === 'online' ? 'https://meet.google.com/new' : null
      });
      modal.remove();
      App.toast('Randevunuz oluşturuldu!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    });
  }

  function createAppointment(data) {
    const list = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
    list.push({ id: App.uid('apt'), status: 'upcoming', createdAt: new Date().toISOString(), ...data });
    App.Storage.set(App.Storage.keys.APPOINTMENTS, list);
  }

  App.cancelAppointment = function (id) {
    const list = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
    const item = list.find(a => a.id === id);
    if (item) item.status = 'cancelled';
    App.Storage.set(App.Storage.keys.APPOINTMENTS, list);
  };

  App.getUserAppointments = function (userId) {
    return App.Storage.get(App.Storage.keys.APPOINTMENTS, []).filter(a => a.clientId === userId);
  };
})(window.App);
