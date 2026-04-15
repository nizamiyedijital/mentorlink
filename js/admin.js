(function (App) {
  App.initAdminPage = function () {
    const host = document.querySelector('[data-admin]');
    if (!host) return;
    const user = App.requireRole('admin');
    if (!user) return;
    render();

    function render() {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const pending = apps.filter(a => a.status === 'pending' && a.trainingDone && a.quizScore >= 70);
      const allApps = apps;

      host.innerHTML = `
        <div class="grid grid-4 mb-xl">
          <div class="dash-stat"><div class="dash-stat-value">${allApps.length}</div><div class="text-muted">Toplam Başvuru</div></div>
          <div class="dash-stat"><div class="dash-stat-value">${pending.length}</div><div class="text-muted">Onay Bekleyen</div></div>
          <div class="dash-stat"><div class="dash-stat-value">${allApps.filter(a=>a.status==='approved').length}</div><div class="text-muted">Onaylanan</div></div>
          <div class="dash-stat"><div class="dash-stat-value">${users.filter(u=>u.role!=='admin').length}</div><div class="text-muted">Toplam Üye</div></div>
        </div>

        <h2 class="mb-md">Onay Bekleyen Başvurular</h2>
        ${pending.length === 0 ? `
          <div class="empty-state card">
            <div class="empty-state-icon">✨</div>
            <p>Şu anda onay bekleyen başvuru yok.</p>
          </div>` : `
          <table class="admin-table mb-xl">
            <thead><tr><th>Aday</th><th>Kategori</th><th>Sınav</th><th>Uzmanlık</th><th>İşlem</th></tr></thead>
            <tbody>
              ${pending.map(a => {
                const u = users.find(x => x.id === a.userId);
                const cat = App.CATEGORIES[a.category];
                return `<tr>
                  <td><strong>${u?.name || '-'}</strong><br><small class="text-muted">${u?.email || ''}</small></td>
                  <td><span class="badge">${cat?.icon || ''} ${cat?.label || a.category}</span></td>
                  <td><span class="badge badge-success">%${a.quizScore}</span></td>
                  <td style="max-width:240px; font-size:0.85rem;">${a.expertise}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost" data-view="${a.id}">İncele</button>
                    <button class="btn btn-sm btn-success" data-approve="${a.id}">✓ Onayla</button>
                    <button class="btn btn-sm btn-danger" data-reject="${a.id}">✕ Reddet</button>
                  </td></tr>`;
              }).join('')}
            </tbody>
          </table>`}

        <h2 class="mb-md">Tüm Başvurular</h2>
        ${allApps.length === 0
          ? `<div class="empty-state card"><p>Henüz başvuru yok.</p></div>`
          : `<table class="admin-table">
              <thead><tr><th>Aday</th><th>Eğitim</th><th>Sınav</th><th>Durum</th></tr></thead>
              <tbody>
                ${allApps.map(a => {
                  const u = users.find(x => x.id === a.userId);
                  const statusBadge = {
                    pending: '<span class="badge badge-warning">Bekliyor</span>',
                    approved: '<span class="badge badge-success">Onaylandı</span>',
                    rejected: '<span class="badge badge-danger">Reddedildi</span>'
                  }[a.status];
                  return `<tr>
                    <td>${u?.name || '-'}</td>
                    <td>${a.trainingDone ? '✓' : '—'}</td>
                    <td>${a.quizScore ? '%' + a.quizScore : '—'}</td>
                    <td>${statusBadge}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
      `;

      host.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => approve(b.dataset.approve)));
      host.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => reject(b.dataset.reject)));
      host.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
    }

    function approve(appId) {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const app = apps.find(a => a.id === appId);
      if (!app) return;
      app.status = 'approved';
      App.Storage.set(App.Storage.keys.APPLICATIONS, apps);
      const u = users.find(x => x.id === app.userId);
      if (u) { u.role = 'mentor'; App.Storage.set(App.Storage.keys.USERS, users); }

      const approvedMentors = App.Storage.get(App.Storage.keys.APPROVED_MENTORS, []);
      approvedMentors.push({
        id: App.uid('mnew'),
        name: u?.name || 'Yeni Mentör',
        title: app.title || 'Onaylı Mentör',
        category: app.category,
        bio: app.bio,
        expertise: app.expertise.split(',').map(s => s.trim()).filter(Boolean),
        pricePerSession: Number(app.price) || 600,
        rating: 5.0, reviewCount: 0, sessionsCompleted: 0,
        languages: ['Türkçe'],
        avatar: `https://i.pravatar.cc/300?u=${u?.id || appId}`,
        availability: app.availability || 'Esnek'
      });
      App.Storage.set(App.Storage.keys.APPROVED_MENTORS, approvedMentors);
      App.toast('Mentör başvurusu onaylandı.', 'success');
      render();
    }

    function reject(appId) {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const app = apps.find(a => a.id === appId);
      if (!app) return;
      app.status = 'rejected';
      App.Storage.set(App.Storage.keys.APPLICATIONS, apps);
      App.toast('Başvuru reddedildi.', 'error');
      render();
    }

    function view(appId) {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const app = apps.find(a => a.id === appId);
      const u = users.find(x => x.id === app.userId);
      App.openModal(`
        <div class="modal-header">
          <h3>Başvuru Detayı</h3>
          <button class="modal-close" data-modal-close>×</button>
        </div>
        <p><strong>Ad Soyad:</strong> ${u?.name}</p>
        <p><strong>E-posta:</strong> ${u?.email}</p>
        <p><strong>Kategori:</strong> ${App.CATEGORIES[app.category]?.label}</p>
        <p><strong>Uzmanlık:</strong> ${app.expertise}</p>
        <p><strong>Seans Ücreti:</strong> ₺${app.price || '-'}</p>
        <p><strong>Müsaitlik:</strong> ${app.availability || '-'}</p>
        <p style="margin-top:0.75rem;"><strong>Özgeçmiş / Bio:</strong></p>
        <p style="color:var(--c-text-light);">${app.bio}</p>
        <p style="margin-top:0.75rem;"><strong>Motivasyon:</strong></p>
        <p style="color:var(--c-text-light);">${app.motivation}</p>
        <p style="margin-top:0.75rem;"><strong>Sınav Skoru:</strong> %${app.quizScore || '-'}</p>
      `);
    }
  };
})(window.App);
