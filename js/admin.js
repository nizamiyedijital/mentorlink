(function (App) {
  App.initAdminPage = function () {
    const host = document.querySelector('[data-admin]');
    if (!host) return;
    const user = App.requireRole('admin');
    if (!user) return;

    const tabs = [
      { key:'dashboard', icon:'📊', label:'Dashboard' },
      { key:'users', icon:'👥', label:'Kullanıcılar' },
      { key:'mentors', icon:'🎓', label:'Mentör Yönetimi' },
      { key:'applications', icon:'📋', label:'Başvurular' },
      { key:'appointments', icon:'📅', label:'Randevular' },
      { key:'finance', icon:'💰', label:'Finans' },
      { key:'content', icon:'📝', label:'İçerik' },
      { key:'platform', icon:'⚙️', label:'Platform Ayarları' }
    ];

    let currentTab = 'dashboard';

    host.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar" data-admin-nav></aside>
        <section class="admin-content" data-admin-content></section>
      </div>`;

    const nav = host.querySelector('[data-admin-nav]');
    const content = host.querySelector('[data-admin-content]');

    function renderNav() {
      nav.innerHTML = `
        <div class="admin-brand">
          <span class="logo-mark">M</span> Admin
        </div>
        <nav class="settings-nav">
          ${tabs.map(t => `<a href="#" class="settings-nav-item ${t.key === currentTab ? 'active' : ''}" data-atab="${t.key}">
            <span class="settings-nav-icon">${t.icon}</span><span>${t.label}</span>
          </a>`).join('')}
        </nav>`;
      nav.querySelectorAll('[data-atab]').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); currentTab = el.dataset.atab; renderNav(); renderContent(); });
      });
    }

    function renderContent() {
      const fn = { dashboard: renderDashboard, users: renderUsers, mentors: renderMentors, applications: renderApplications, appointments: renderAppointments, finance: renderFinance, content: renderContentMgmt, platform: renderPlatform };
      fn[currentTab]();
    }

    function getStats() {
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
      const pays = App.Storage.get(App.Storage.keys.PAYMENTS, []);
      const subs = App.Storage.get(App.Storage.keys.SUBSCRIPTIONS, []);
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []);
      const mentors = App.loadMentors();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0,0,0,0);

      const totalRevenue = pays.reduce((s,p) => s + p.commission, 0);
      const monthRevenue = pays.filter(p => new Date(p.paidAt) >= monthStart).reduce((s,p) => s + p.commission, 0);
      const activeSubs = subs.filter(s => new Date(s.endDate) > now).length;
      const monthUsers = users.filter(u => new Date(u.createdAt) >= monthStart).length;
      const weekUsers = users.filter(u => new Date(u.createdAt) >= weekStart).length;
      const completedApts = apts.filter(a => a.status === 'completed');
      const monthCompleted = completedApts.filter(a => new Date(a.completedAt || a.date) >= monthStart).length;
      const noShows = apts.filter(a => a.status === 'no_show').length;

      const firstApt = users.filter(u => u.role === 'client').map(u => {
        return apts.some(a => a.clientId === u.id && a.status === 'completed');
      });
      const conversionRate = firstApt.length ? Math.round(firstApt.filter(Boolean).length / firstApt.length * 100) : 0;

      return { users, apts, pays, subs, apps, reviews, mentors, totalRevenue, monthRevenue, activeSubs, monthUsers, weekUsers, completedApts, monthCompleted, noShows, conversionRate, now, monthStart };
    }

    // ===== DASHBOARD =====
    function renderDashboard() {
      const s = getStats();
      const clients = s.users.filter(u => u.role === 'client');
      const mentorUsers = s.users.filter(u => u.role === 'mentor');
      const pendingApps = s.apps.filter(a => a.status === 'pending').length;

      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(s.now.getFullYear(), s.now.getMonth() - i, 1);
        const next = new Date(s.now.getFullYear(), s.now.getMonth() - i + 1, 1);
        const rev = s.pays.filter(p => { const t = new Date(p.paidAt); return t >= d && t < next; }).reduce((a,p) => a + p.commission, 0);
        const regs = s.users.filter(u => { const t = new Date(u.createdAt); return t >= d && t < next; }).length;
        last6.push({ label: d.toLocaleDateString('tr-TR',{month:'short'}), rev, regs });
      }
      const maxRev = Math.max(1, ...last6.map(x => x.rev));
      const maxRegs = Math.max(1, ...last6.map(x => x.regs));

      const topMentors = s.mentors.map(m => {
        const mApts = s.apts.filter(a => a.mentorId === m.id && a.status === 'completed');
        const mPays = s.pays.filter(p => s.apts.find(a => a.id === p.appointmentId && a.mentorId === m.id));
        return { ...m, sessions: mApts.length, revenue: mPays.reduce((x,p) => x + p.amount, 0) };
      }).sort((a,b) => b.sessions - a.sessions).slice(0, 5);

      const recentApts = s.apts.filter(a => a.status === 'requested').sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,5);

      content.innerHTML = `
        <h2 class="mb-lg">Platform Dashboard</h2>
        <div class="dash-stats-grid">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bu Ay Komisyon</div>
            <div class="stat-value">₺${s.monthRevenue.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Toplam: ₺${s.totalRevenue.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Kullanıcı</div>
            <div class="stat-value">${s.users.filter(u=>u.role!=='admin').length}</div>
            <div class="stat-sub">+${s.monthUsers} bu ay</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Aktif Mentör</div>
            <div class="stat-value">${s.mentors.length}</div>
            <div class="stat-sub">${pendingApps} başvuru bekliyor</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Aktif Abonelik</div>
            <div class="stat-value">${s.activeSubs}</div>
            <div class="stat-sub">${clients.length} danışan</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bu Ay Seans</div>
            <div class="stat-value">${s.monthCompleted}</div>
            <div class="stat-sub">Toplam: ${s.completedApts.length}</div>
          </div>
          <div class="stat-card ${s.conversionRate < 30 ? 'stat-warn' : ''}">
            <div class="stat-label">Dönüşüm Oranı</div>
            <div class="stat-value">%${s.conversionRate}</div>
            <div class="stat-sub">kayıt→seans</div>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:1.5rem; gap:1.5rem;">
          <div class="card">
            <h3 class="mb-md">Aylık Komisyon Geliri</h3>
            <div class="bar-chart">${last6.map(m => `
              <div class="bar-col"><div class="bar" style="height:${(m.rev/maxRev)*140}px;"></div>
              <div class="bar-label">${m.label}</div><div class="bar-value">₺${m.rev>=1000?(m.rev/1000).toFixed(1)+'k':m.rev}</div></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <h3 class="mb-md">Aylık Kayıt</h3>
            <div class="bar-chart">${last6.map(m => `
              <div class="bar-col"><div class="bar" style="height:${(m.regs/maxRegs)*140}px; background:var(--c-secondary);"></div>
              <div class="bar-label">${m.label}</div><div class="bar-value">${m.regs}</div></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:1.5rem; gap:1.5rem;">
          <div class="card">
            <h3 class="mb-md">En Aktif Mentörler</h3>
            ${topMentors.length === 0 ? '<p class="text-muted">Veri yok.</p>' : `
            <table class="data-table">
              <thead><tr><th>Mentör</th><th>Seans</th><th>Gelir</th><th>Puan</th></tr></thead>
              <tbody>${topMentors.map(m => `<tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.sessions}</td><td>₺${m.revenue.toLocaleString('tr-TR')}</td>
                <td>⭐ ${m.rating}</td></tr>`).join('')}
              </tbody>
            </table>`}
          </div>
          <div class="card">
            <h3 class="mb-md">Son Randevu İstekleri</h3>
            ${recentApts.length === 0 ? '<p class="text-muted">Bekleyen istek yok.</p>' : recentApts.map(a => `
              <div class="upcoming-item">
                <div>
                  <strong>${a.clientName}</strong> → ${a.mentorName}
                  <div class="text-muted" style="font-size:0.8rem;">${a.date} ${a.time}</div>
                </div>
                <span class="badge badge-warning">Bekliyor</span>
              </div>`).join('')}
          </div>
        </div>`;
    }

    // ===== USERS =====
    function renderUsers() {
      const s = getStats();
      const allUsers = s.users.filter(u => u.role !== 'admin');
      let filterRole = 'all';
      let searchQ = '';

      function render() {
        let list = allUsers.filter(u => filterRole === 'all' || u.role === filterRole);
        if (searchQ) list = list.filter(u => u.name.toLowerCase().includes(searchQ) || u.email.toLowerCase().includes(searchQ));

        content.innerHTML = `
          <div class="flex-between mb-lg" style="flex-wrap:wrap; gap:1rem;">
            <h2>Kullanıcı Yönetimi <span class="text-muted" style="font-size:1rem;">(${allUsers.length})</span></h2>
            <div class="flex" style="gap:0.5rem;">
              <input type="text" class="form-input" placeholder="Ara..." data-usearch style="width:200px;">
              <select class="form-select" data-urole style="width:150px;">
                <option value="all">Tüm Roller</option>
                <option value="client">Danışan</option>
                <option value="mentor">Mentör</option>
                <option value="mentor_candidate">Aday</option>
              </select>
            </div>
          </div>
          <div class="card" style="padding:0;">
            <table class="data-table">
              <thead><tr><th>Kullanıcı</th><th>Rol</th><th>Kayıt</th><th>Seans</th><th>İşlem</th></tr></thead>
              <tbody>${list.map(u => {
                const role = { client:'Danışan', mentor:'Mentör', mentor_candidate:'Aday' }[u.role] || u.role;
                const roleCls = { client:'badge-primary', mentor:'badge-success', mentor_candidate:'badge-warning' }[u.role] || '';
                const aptCount = s.apts.filter(a => a.clientId === u.id || a.mentorId === (u.linkedMentorId || '')).length;
                return `<tr>
                  <td><strong>${u.name}</strong><br><span class="text-muted" style="font-size:0.8rem;">${u.email}</span></td>
                  <td><span class="badge ${roleCls}">${role}</span></td>
                  <td>${new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>${aptCount}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" data-uview="${u.id}">Detay</button>
                    ${u.role !== 'admin' ? `<button class="btn btn-ghost btn-sm" data-ususpend="${u.id}" style="color:var(--c-danger,#e74c3c);">Askıya Al</button>` : ''}
                  </td></tr>`;
              }).join('')}</tbody>
            </table>
          </div>`;

        content.querySelector('[data-usearch]').addEventListener('input', e => { searchQ = e.target.value.toLowerCase(); render(); });
        content.querySelector('[data-urole]').addEventListener('change', e => { filterRole = e.target.value; render(); });
        content.querySelectorAll('[data-uview]').forEach(b => b.addEventListener('click', () => viewUser(b.dataset.uview)));
        content.querySelectorAll('[data-ususpend]').forEach(b => b.addEventListener('click', () => {
          if (confirm('Bu kullanıcıyı askıya almak istiyor musun?')) {
            const users = App.Storage.get(App.Storage.keys.USERS, []);
            const u = users.find(x => x.id === b.dataset.ususpend);
            if (u) { u.suspended = !u.suspended; App.Storage.set(App.Storage.keys.USERS, users); }
            App.toast(u.suspended ? 'Kullanıcı askıya alındı.' : 'Kullanıcı aktifleştirildi.', 'success');
            render();
          }
        }));
      }
      render();
    }

    function viewUser(uid) {
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const u = users.find(x => x.id === uid);
      if (!u) return;
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []).filter(a => a.clientId === uid || a.mentorId === (u.linkedMentorId || ''));
      const pays = App.Storage.get(App.Storage.keys.PAYMENTS, []);
      const aptIds = new Set(apts.map(a => a.id));
      const userPays = pays.filter(p => aptIds.has(p.appointmentId));
      const sub = App.getSubscription(uid);

      App.openModal(`
        <div class="modal-header"><h3>${u.name}</h3><button class="modal-close" data-modal-close>×</button></div>
        <div class="grid grid-2" style="gap:1rem;">
          <div><strong>E-posta:</strong> ${u.email}</div>
          <div><strong>Rol:</strong> ${u.role}</div>
          <div><strong>Kayıt:</strong> ${new Date(u.createdAt).toLocaleDateString('tr-TR')}</div>
          <div><strong>Abonelik:</strong> ${sub ? sub.plan : 'Yok'}</div>
        </div>
        <h4 style="margin-top:1rem;">Randevular (${apts.length})</h4>
        <table class="data-table" style="font-size:0.85rem;">
          <thead><tr><th>Tarih</th><th>Mentör/Danışan</th><th>Durum</th></tr></thead>
          <tbody>${apts.slice(0,10).map(a => `<tr>
            <td>${a.date} ${a.time}</td>
            <td>${u.role === 'client' ? a.mentorName : a.clientName}</td>
            <td><span class="badge ${(App.STATUS_LABEL[a.status]||{}).cls||''}">${(App.STATUS_LABEL[a.status]||{}).label||a.status}</span></td>
          </tr>`).join('')}</tbody>
        </table>
        <p class="text-muted" style="margin-top:1rem;">Toplam harcama/kazanç: ₺${userPays.reduce((s,p)=>s+p.amount,0).toLocaleString('tr-TR')}</p>
      `);
    }

    // ===== MENTORS =====
    function renderMentors() {
      const mentors = App.loadMentors();
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []);

      const mentorData = mentors.map(m => {
        const mApts = apts.filter(a => a.mentorId === m.id);
        const completed = mApts.filter(a => a.status === 'completed').length;
        const noshow = mApts.filter(a => a.status === 'no_show').length;
        const mRevs = reviews.filter(r => r.mentorId === m.id);
        const avgRating = mRevs.length ? (mRevs.reduce((s,r) => s + r.rating, 0) / mRevs.length).toFixed(1) : m.rating;
        const approveTimesMs = mApts.filter(a => a.approvedAt && a.createdAt).map(a => new Date(a.approvedAt) - new Date(a.createdAt));
        const avgResponse = approveTimesMs.length ? Math.round(approveTimesMs.reduce((s,t)=>s+t,0)/approveTimesMs.length/3600000) : '-';
        return { ...m, completed, noshow, noshowRate: completed+noshow > 0 ? Math.round(noshow/(completed+noshow)*100) : 0, avgRating, avgResponse, reviewCount: mRevs.length || m.reviewCount };
      });

      content.innerHTML = `
        <h2 class="mb-lg">Mentör Yönetimi <span class="text-muted" style="font-size:1rem;">(${mentors.length})</span></h2>
        <div class="card" style="padding:0; overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Mentör</th><th>Kategori</th><th>Seans</th><th>Puan</th><th>Yorum</th><th>No-Show</th><th>Yanıt</th><th>Ücret</th><th>İşlem</th></tr></thead>
            <tbody>${mentorData.map(m => {
              const cat = App.CATEGORIES[m.category];
              return `<tr>
                <td><strong>${m.name}</strong><br><span class="text-muted" style="font-size:0.8rem;">${m.title}</span></td>
                <td>${cat ? cat.icon + ' ' + cat.label : m.category}</td>
                <td>${m.completed}</td>
                <td>⭐ ${m.avgRating}</td>
                <td>${m.reviewCount}</td>
                <td>${m.noshowRate > 0 ? `<span style="color:var(--c-danger,#e74c3c);">${m.noshowRate}%</span>` : '-'}</td>
                <td>${m.avgResponse}s</td>
                <td>₺${m.pricePerSession}</td>
                <td><button class="btn btn-ghost btn-sm" data-mdetail="${m.id}">Detay</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;

      content.querySelectorAll('[data-mdetail]').forEach(b => b.addEventListener('click', () => {
        const m = mentorData.find(x => x.id === b.dataset.mdetail);
        App.openModal(`
          <div class="modal-header"><h3>${m.name}</h3><button class="modal-close" data-modal-close>×</button></div>
          <p class="text-muted">${m.title}</p>
          <div class="grid grid-3" style="gap:1rem; margin:1rem 0;">
            <div class="stat-card"><div class="stat-label">Seans</div><div class="stat-value">${m.completed}</div></div>
            <div class="stat-card"><div class="stat-label">Puan</div><div class="stat-value">⭐ ${m.avgRating}</div></div>
            <div class="stat-card"><div class="stat-label">No-Show</div><div class="stat-value">${m.noshowRate}%</div></div>
          </div>
          <p><strong>Bio:</strong> ${m.bio}</p>
          <p><strong>Uzmanlık:</strong> ${m.expertise.join(', ')}</p>
          <p><strong>Ücret:</strong> ₺${m.pricePerSession}/seans</p>
        `);
      }));
    }

    // ===== APPLICATIONS =====
    function renderApplications() {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const pending = apps.filter(a => a.status === 'pending' && a.trainingDone && a.quizScore >= 70);

      content.innerHTML = `
        <h2 class="mb-lg">Mentör Başvuruları</h2>
        ${pending.length > 0 ? `
          <h3 class="mb-md">Onay Bekleyenler (${pending.length})</h3>
          <div class="card mb-xl" style="padding:0;">
            <table class="data-table">
              <thead><tr><th>Aday</th><th>Kategori</th><th>Sınav</th><th>Uzmanlık</th><th>İşlem</th></tr></thead>
              <tbody>${pending.map(a => {
                const u = users.find(x => x.id === a.userId);
                const cat = App.CATEGORIES[a.category];
                return `<tr>
                  <td><strong>${u?.name||'-'}</strong><br><small class="text-muted">${u?.email||''}</small></td>
                  <td><span class="badge">${cat?.icon||''} ${cat?.label||a.category}</span></td>
                  <td><span class="badge badge-success">%${a.quizScore}</span></td>
                  <td style="max-width:200px; font-size:0.85rem;">${a.expertise}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost" data-view="${a.id}">İncele</button>
                    <button class="btn btn-sm btn-success" data-approve="${a.id}">✓</button>
                    <button class="btn btn-sm btn-danger" data-reject="${a.id}">✕</button>
                  </td></tr>`;
              }).join('')}</tbody>
            </table>
          </div>` : `<div class="empty-state card mb-lg"><div class="empty-state-icon">✨</div><p>Onay bekleyen başvuru yok.</p></div>`}

        <h3 class="mb-md">Tüm Başvurular (${apps.length})</h3>
        ${apps.length === 0 ? '<p class="text-muted">Henüz başvuru yok.</p>' : `
        <div class="card" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>Aday</th><th>Kategori</th><th>Eğitim</th><th>Sınav</th><th>Durum</th><th>Tarih</th></tr></thead>
            <tbody>${apps.map(a => {
              const u = users.find(x => x.id === a.userId);
              const st = {pending:'<span class="badge badge-warning">Bekliyor</span>',approved:'<span class="badge badge-success">Onaylandı</span>',rejected:'<span class="badge badge-danger">Reddedildi</span>'}[a.status];
              return `<tr><td>${u?.name||'-'}</td><td>${App.CATEGORIES[a.category]?.label||a.category}</td>
                <td>${a.trainingDone?'✓':'—'}</td><td>${a.quizScore?'%'+a.quizScore:'—'}</td>
                <td>${st}</td><td>${a.createdAt?new Date(a.createdAt).toLocaleDateString('tr-TR'):'-'}</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>`}`;

      content.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => { approve(b.dataset.approve); renderApplications(); }));
      content.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => { reject(b.dataset.reject); renderApplications(); }));
      content.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
    }

    // ===== APPOINTMENTS =====
    function renderAppointments() {
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      let filterStatus = 'all';

      function render() {
        const list = filterStatus === 'all' ? apts : apts.filter(a => a.status === filterStatus);
        const statusCounts = {};
        apts.forEach(a => { statusCounts[a.status] = (statusCounts[a.status]||0)+1; });

        content.innerHTML = `
          <h2 class="mb-lg">Tüm Randevular <span class="text-muted" style="font-size:1rem;">(${apts.length})</span></h2>
          <div class="flex" style="gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
            <button class="btn btn-sm ${filterStatus==='all'?'btn-primary':'btn-ghost'}" data-fstatus="all">Tümü (${apts.length})</button>
            ${Object.entries(App.STATUS_LABEL).map(([k,v]) => statusCounts[k] ? `<button class="btn btn-sm ${filterStatus===k?'btn-primary':'btn-ghost'}" data-fstatus="${k}">${v.label} (${statusCounts[k]})</button>` : '').join('')}
          </div>
          <div class="card" style="padding:0; overflow-x:auto;">
            <table class="data-table">
              <thead><tr><th>Tarih</th><th>Danışan</th><th>Mentör</th><th>Tip</th><th>Tutar</th><th>Durum</th></tr></thead>
              <tbody>${list.slice(0,50).map(a => {
                const st = App.STATUS_LABEL[a.status] || {};
                return `<tr>
                  <td>${a.date} ${a.time}</td><td>${a.clientName}</td><td>${a.mentorName}</td>
                  <td>${a.type==='online'?'🖥️':'🤝'}</td><td>₺${a.price||'-'}</td>
                  <td><span class="badge ${st.cls||''}">${st.label||a.status}</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>`;
        content.querySelectorAll('[data-fstatus]').forEach(b => b.addEventListener('click', () => { filterStatus = b.dataset.fstatus; render(); }));
      }
      render();
    }

    // ===== FINANCE =====
    function renderFinance() {
      const pays = App.Storage.get(App.Storage.keys.PAYMENTS, []).sort((a,b) => new Date(b.paidAt) - new Date(a.paidAt));
      const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, []);
      const totalGross = pays.reduce((s,p) => s+p.amount, 0);
      const totalCommission = pays.reduce((s,p) => s+p.commission, 0);
      const totalNet = pays.reduce((s,p) => s+p.net, 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthPays = pays.filter(p => new Date(p.paidAt) >= monthStart);
      const monthGross = monthPays.reduce((s,p) => s+p.amount, 0);
      const monthCommission = monthPays.reduce((s,p) => s+p.commission, 0);

      const mentorTotals = {};
      pays.forEach(p => {
        const a = apts.find(x => x.id === p.appointmentId);
        if (!a) return;
        if (!mentorTotals[a.mentorId]) mentorTotals[a.mentorId] = { name: a.mentorName, gross:0, commission:0, net:0, count:0 };
        mentorTotals[a.mentorId].gross += p.amount;
        mentorTotals[a.mentorId].commission += p.commission;
        mentorTotals[a.mentorId].net += p.net;
        mentorTotals[a.mentorId].count++;
      });
      const mentorList = Object.values(mentorTotals).sort((a,b) => b.gross - a.gross);

      content.innerHTML = `
        <h2 class="mb-lg">Finans</h2>
        <div class="dash-stats-grid mb-lg">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bu Ay Komisyon</div>
            <div class="stat-value">₺${monthCommission.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">brüt: ₺${monthGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Brüt</div>
            <div class="stat-value">₺${totalGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Komisyon</div>
            <div class="stat-value">₺${totalCommission.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">%${App.COMMISSION_RATE*100} oran</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mentörlere Aktarılan</div>
            <div class="stat-value">₺${totalNet.toLocaleString('tr-TR')}</div>
          </div>
        </div>

        <div class="card mb-lg">
          <div class="flex-between mb-md">
            <h3>Mentör Bazlı Gelir</h3>
            <button class="btn btn-ghost btn-sm" data-export-csv>📥 CSV İndir</button>
          </div>
          <table class="data-table">
            <thead><tr><th>Mentör</th><th>Seans</th><th>Brüt</th><th>Komisyon</th><th>Net (Mentöre)</th></tr></thead>
            <tbody>${mentorList.map(m => `<tr>
              <td><strong>${m.name}</strong></td><td>${m.count}</td>
              <td>₺${m.gross.toLocaleString('tr-TR')}</td>
              <td>₺${m.commission.toLocaleString('tr-TR')}</td>
              <td>₺${m.net.toLocaleString('tr-TR')}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="card">
          <h3 class="mb-md">Son Ödemeler</h3>
          <table class="data-table">
            <thead><tr><th>Tarih</th><th>Danışan</th><th>Mentör</th><th>Tutar</th><th>Komisyon</th><th>Durum</th></tr></thead>
            <tbody>${pays.slice(0,20).map(p => {
              const a = apts.find(x => x.id === p.appointmentId);
              return `<tr>
                <td>${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                <td>${a?a.clientName:'-'}</td><td>${a?a.mentorName:'-'}</td>
                <td>₺${p.amount.toLocaleString('tr-TR')}</td>
                <td>₺${p.commission.toLocaleString('tr-TR')}</td>
                <td><span class="badge badge-success">Ödendi</span></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;

      content.querySelector('[data-export-csv]')?.addEventListener('click', () => {
        let csv = 'Mentor,Seans,Brut,Komisyon,Net\n';
        mentorList.forEach(m => { csv += `${m.name},${m.count},${m.gross},${m.commission},${m.net}\n`; });
        const blob = new Blob([csv], { type:'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mentorlink_finans.csv'; a.click();
        App.toast('CSV indirildi.', 'success');
      });
    }

    // ===== CONTENT MANAGEMENT =====
    function renderContentMgmt() {
      const trainings = App.loadTrainings();
      const quiz = App.loadQuiz();

      content.innerHTML = `
        <h2 class="mb-lg">İçerik Yönetimi</h2>
        <div class="card mb-lg">
          <h3 class="mb-md">Eğitim Modülleri (${trainings.length} bölüm)</h3>
          <table class="data-table">
            <thead><tr><th>#</th><th>Başlık</th><th>Süre</th></tr></thead>
            <tbody>${trainings.map((t,i) => `<tr><td>${i+1}</td><td>${t.title}</td><td>${t.duration || '-'} dk</td></tr>`).join('')}</tbody>
          </table>
          <p class="text-muted" style="margin-top:1rem; font-size:0.85rem;">Eğitim içeriği düzenlemesi üretim fazında aktif olacaktır.</p>
        </div>
        <div class="card mb-lg">
          <h3 class="mb-md">Sınav Soruları (${quiz.length} soru)</h3>
          <table class="data-table">
            <thead><tr><th>#</th><th>Soru</th><th>Doğru Cevap</th></tr></thead>
            <tbody>${quiz.map((q,i) => `<tr><td>${i+1}</td><td style="max-width:400px;">${q.question}</td><td>${q.options ? q.options[q.correct] : q.correct}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="card">
          <h3 class="mb-md">Platform Duyuruları</h3>
          <form data-announce-form>
            <div class="form-group"><label>Başlık</label><input type="text" class="form-input" name="title" placeholder="Duyuru başlığı"></div>
            <div class="form-group"><label>İçerik</label><textarea class="form-textarea" name="body" rows="3" placeholder="Duyuru metni..."></textarea></div>
            <button type="submit" class="btn btn-primary btn-sm">Yayınla</button>
          </form>
          <p class="text-muted" style="margin-top:0.75rem; font-size:0.85rem;">Duyuru sistemi üretim fazında bildirim altyapısıyla entegre edilecektir.</p>
        </div>`;

      content.querySelector('[data-announce-form]')?.addEventListener('submit', e => {
        e.preventDefault();
        App.toast('Duyuru yayınlandı (demo).', 'success');
        e.target.reset();
      });
    }

    // ===== PLATFORM SETTINGS =====
    function renderPlatform() {
      const ps = App.Storage.get('mp_platform_settings', {});
      content.innerHTML = `
        <h2 class="mb-lg">Platform Ayarları</h2>
        <form class="card mb-lg" data-ps-form>
          <h3 class="mb-md">Genel</h3>
          <div class="grid grid-2" style="gap:1rem;">
            <div class="form-group"><label>Platform Komisyon Oranı (%)</label>
              <input type="number" class="form-input" name="commission" min="0" max="50" value="${(ps.commission || App.COMMISSION_RATE*100)}"></div>
            <div class="form-group"><label>Min. Seans Ücreti (₺)</label>
              <input type="number" class="form-input" name="minPrice" min="0" value="${ps.minPrice || 100}"></div>
            <div class="form-group"><label>Max. Seans Ücreti (₺)</label>
              <input type="number" class="form-input" name="maxPrice" min="0" value="${ps.maxPrice || 10000}"></div>
            <div class="form-group"><label>Geçme Notu (%)</label>
              <input type="number" class="form-input" name="passScore" min="0" max="100" value="${ps.passScore || 70}"></div>
          </div>
          <div class="settings-actions"><button type="submit" class="btn btn-primary">Kaydet</button></div>
        </form>
        <form class="card mb-lg" data-sub-form>
          <h3 class="mb-md">Abonelik Fiyatları</h3>
          <div class="grid grid-3" style="gap:1rem;">
            <div class="form-group"><label>Aylık (₺)</label>
              <input type="number" class="form-input" name="monthly" value="${ps.monthlyPrice || 299}"></div>
            <div class="form-group"><label>3 Aylık (₺)</label>
              <input type="number" class="form-input" name="quarterly" value="${ps.quarterlyPrice || 749}"></div>
            <div class="form-group"><label>Yıllık (₺)</label>
              <input type="number" class="form-input" name="yearly" value="${ps.yearlyPrice || 2499}"></div>
          </div>
          <div class="settings-actions"><button type="submit" class="btn btn-primary">Kaydet</button></div>
        </form>
        <div class="card" style="border:2px solid var(--c-danger,#e74c3c);">
          <h3 class="mb-md" style="color:var(--c-danger,#e74c3c);">Bakım Modu</h3>
          <p class="text-muted mb-md">Platform bakım moduna alınırsa yeni kullanıcılar kayıt olamaz ve randevu oluşturulamaz.</p>
          <button class="btn ${ps.maintenance ? 'btn-primary' : 'btn-outline'}" data-maintenance>
            ${ps.maintenance ? '🔴 Bakım Modu Aktif — Kapat' : '🟢 Platform Aktif — Bakıma Al'}
          </button>
        </div>`;

      content.querySelector('[data-ps-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        App.Storage.set('mp_platform_settings', { ...ps,
          commission: parseFloat(fd.get('commission')),
          minPrice: parseInt(fd.get('minPrice')), maxPrice: parseInt(fd.get('maxPrice')),
          passScore: parseInt(fd.get('passScore'))
        });
        App.toast('Platform ayarları güncellendi.', 'success');
      });
      content.querySelector('[data-sub-form]').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        App.Storage.set('mp_platform_settings', { ...App.Storage.get('mp_platform_settings',{}),
          monthlyPrice: parseInt(fd.get('monthly')), quarterlyPrice: parseInt(fd.get('quarterly')), yearlyPrice: parseInt(fd.get('yearly'))
        });
        App.toast('Abonelik fiyatları güncellendi.', 'success');
      });
      content.querySelector('[data-maintenance]').addEventListener('click', () => {
        const cur = App.Storage.get('mp_platform_settings', {});
        cur.maintenance = !cur.maintenance;
        App.Storage.set('mp_platform_settings', cur);
        App.toast(cur.maintenance ? 'Bakım modu aktif.' : 'Platform tekrar aktif.', 'success');
        renderPlatform();
      });
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
      const newId = App.uid('mnew');
      approvedMentors.push({
        id: newId, userId: app.userId,
        name: u?.name || 'Yeni Mentör', title: app.title || 'Onaylı Mentör',
        category: app.category, bio: app.bio,
        expertise: app.expertise.split(',').map(s => s.trim()).filter(Boolean),
        pricePerSession: Number(app.price) || 600,
        rating: 5.0, reviewCount: 0, sessionsCompleted: 0,
        languages: ['Türkçe'], avatar: `https://i.pravatar.cc/300?u=${u?.id||appId}`,
        availability: app.availability || 'Esnek'
      });
      App.Storage.set(App.Storage.keys.APPROVED_MENTORS, approvedMentors);
      if (u) { u.linkedMentorId = newId; App.Storage.set(App.Storage.keys.USERS, users); }
      App.toast('Mentör başvurusu onaylandı.', 'success');
    }

    function reject(appId) {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const app = apps.find(a => a.id === appId);
      if (!app) return;
      app.status = 'rejected';
      App.Storage.set(App.Storage.keys.APPLICATIONS, apps);
      App.toast('Başvuru reddedildi.', 'error');
    }

    function view(appId) {
      const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
      const users = App.Storage.get(App.Storage.keys.USERS, []);
      const app = apps.find(a => a.id === appId);
      const u = users.find(x => x.id === app.userId);
      App.openModal(`
        <div class="modal-header"><h3>Başvuru Detayı</h3><button class="modal-close" data-modal-close>×</button></div>
        <p><strong>Ad Soyad:</strong> ${u?.name}</p>
        <p><strong>E-posta:</strong> ${u?.email}</p>
        <p><strong>Kategori:</strong> ${App.CATEGORIES[app.category]?.label}</p>
        <p><strong>Uzmanlık:</strong> ${app.expertise}</p>
        <p><strong>Seans Ücreti:</strong> ₺${app.price||'-'}</p>
        <p><strong>Müsaitlik:</strong> ${app.availability||'-'}</p>
        <p style="margin-top:0.75rem;"><strong>Özgeçmiş:</strong></p>
        <p style="color:var(--c-text-light);">${app.bio}</p>
        <p style="margin-top:0.75rem;"><strong>Motivasyon:</strong></p>
        <p style="color:var(--c-text-light);">${app.motivation}</p>
        <p style="margin-top:0.75rem;"><strong>Sınav:</strong> %${app.quizScore||'-'}</p>
      `);
    }

    renderNav();
    renderContent();
  };
})(window.App);
