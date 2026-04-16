(function (App) {
  App.initMentorDashboard = function (user) {
    const profile = App.getMentorProfileForUser(user);
    if (!profile) {
      document.querySelector('[data-content]').innerHTML = `
        <div class="card"><h3>Mentör profili bulunamadı</h3>
        <p class="text-muted">Bu hesap mentör rolünde ama henüz bir mentör profiline bağlı değil.</p></div>`;
      return;
    }
    const mentorId = profile.id;

    const sidebar = document.querySelector('[data-sidebar]');
    sidebar.innerHTML = `
      <div class="dash-profile-card">
        <img src="${profile.avatar}" alt="${profile.name}" class="dash-avatar">
        <h4>${profile.name}</h4>
        <p class="text-muted" style="font-size:0.85rem;">${profile.title}</p>
        <div class="mentor-rating" style="justify-content:center; margin-top:0.5rem;">
          ⭐ <strong>${profile.rating}</strong> <span>(${profile.reviewCount})</span>
        </div>
      </div>
      <nav class="dash-nav">
        <a href="#" class="dash-nav-item active" data-tab="overview">📊 Panorama</a>
        <a href="#" class="dash-nav-item" data-tab="calendar">📅 Takvim</a>
        <a href="#" class="dash-nav-item" data-tab="requests">🔔 İstekler <span class="dash-nav-badge" data-pending-badge></span></a>
        <a href="#" class="dash-nav-item" data-tab="appointments">👥 Randevular</a>
        <a href="#" class="dash-nav-item" data-tab="clients">📋 Danışanlarım</a>
        <a href="#" class="dash-nav-item" data-tab="reviews">⭐ Yorumlar</a>
        <a href="#" class="dash-nav-item" data-tab="earnings">💰 Kazanç</a>
        <a href="#" class="dash-nav-item" data-tab="availability">⏰ Müsaitlik</a>
      </nav>`;

    const content = document.querySelector('[data-content]');

    let currentTab = 'overview';
    function switchTab(tab) {
      currentTab = tab;
      sidebar.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
      renderTab();
    }

    sidebar.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); switchTab(el.dataset.tab); });
    });

    function refreshPendingBadge() {
      const stats = App.getMentorStats(mentorId);
      const badge = sidebar.querySelector('[data-pending-badge]');
      badge.textContent = stats.pending || '';
      badge.style.display = stats.pending ? 'inline-flex' : 'none';
    }

    function renderTab() {
      refreshPendingBadge();
      const fn = {
        overview: renderOverview, calendar: renderCalendar, requests: renderRequests,
        appointments: renderAppointments, clients: renderClients, reviews: renderReviews,
        earnings: renderEarnings, availability: renderAvailability
      };
      fn[currentTab]();
    }

    // ===== OVERVIEW =====
    function renderOverview() {
      const s = App.getMentorStats(mentorId);
      const apts = App.getMentorAppointments(mentorId);
      const now = Date.now();
      const upcoming = apts.filter(a => a.status === 'paid' && new Date(a.date+'T'+a.time) > now)
        .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time)).slice(0,5);
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []).filter(r => r.mentorId === mentorId);
      const avgRating = reviews.length ? (reviews.reduce((x,r) => x+r.rating, 0)/reviews.length).toFixed(1) : profile.rating;

      const approveTimesMs = apts.filter(a => a.approvedAt && a.createdAt).map(a => new Date(a.approvedAt) - new Date(a.createdAt));
      const avgResponseH = approveTimesMs.length ? Math.round(approveTimesMs.reduce((x,t)=>x+t,0)/approveTimesMs.length/3600000) : '-';

      const avail = App.getAvailability(mentorId);
      const totalSlots = Object.values(avail.weekly).reduce((sum, ranges) => {
        return sum + ranges.reduce((s, r) => s + Math.floor((App.toMin(r.end)-App.toMin(r.start))/(avail.sessionDuration+avail.buffer)), 0);
      }, 0);
      const bookedThisWeek = apts.filter(a => {
        const wk = new Date(); wk.setDate(wk.getDate()-wk.getDay()+1); wk.setHours(0,0,0,0);
        const wkEnd = new Date(wk); wkEnd.setDate(wkEnd.getDate()+7);
        const d = new Date(a.date);
        return d >= wk && d < wkEnd && ['requested','approved','paid'].includes(a.status);
      }).length;
      const occupancy = totalSlots > 0 ? Math.round(bookedThisWeek / totalSlots * 100) : 0;

      const noShows = apts.filter(a => a.status === 'no_show').length;
      const completed = apts.filter(a => a.status === 'completed').length;

      const settings = App.getUserSettings(user.id);
      const goal = settings.monthlyGoal || 15;
      const goalPct = Math.min(100, Math.round(s.completedMonth / goal * 100));

      const monthlySeries = last6MonthsEarnings(s.payments);
      const maxM = Math.max(1, ...monthlySeries.map(x => x.value));

      const nextMonth = monthlySeries.length ? monthlySeries[monthlySeries.length-1].value : 0;
      const avgIncome = monthlySeries.reduce((x,m) => x+m.value, 0) / Math.max(1, monthlySeries.filter(m => m.value > 0).length);

      content.innerHTML = `
        <div class="dash-stats-grid">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bu Ay Net Kazanç</div>
            <div class="stat-value">₺${s.earningsMonthNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Brüt: ₺${s.earningsMonthGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Kazanç</div>
            <div class="stat-value">₺${s.earningsTotalNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Brüt: ₺${s.earningsTotalGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bu Ay Seans</div>
            <div class="stat-value">${s.completedMonth}</div>
            <div class="stat-sub">Toplam: ${s.completedTotal}</div>
          </div>
          <div class="stat-card ${s.pending > 0 ? 'stat-warn' : ''}">
            <div class="stat-label">Onay Bekleyen</div>
            <div class="stat-value">${s.pending}</div>
            <div class="stat-sub">${s.awaitingPayment} ödeme bekliyor</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Yaklaşan</div>
            <div class="stat-value">${s.upcoming}</div>
            <div class="stat-sub">ödenmiş &amp; planlı</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Puan</div>
            <div class="stat-value">⭐ ${avgRating}</div>
            <div class="stat-sub">${reviews.length} yorum</div>
          </div>
        </div>

        <div class="grid grid-3" style="margin-top:1.5rem; gap:1rem;">
          <div class="card mini-metric">
            <span class="mini-metric-icon">⏱️</span>
            <div><div class="mini-metric-value">${avgResponseH}s</div><div class="text-muted">Ort. yanıt süresi</div></div>
          </div>
          <div class="card mini-metric">
            <span class="mini-metric-icon">📊</span>
            <div><div class="mini-metric-value">%${occupancy}</div><div class="text-muted">Haftalık doluluk</div></div>
          </div>
          <div class="card mini-metric">
            <span class="mini-metric-icon">🚫</span>
            <div><div class="mini-metric-value">${completed+noShows>0 ? Math.round(noShows/(completed+noShows)*100) : 0}%</div><div class="text-muted">No-show oranı</div></div>
          </div>
        </div>

        <div class="card" style="margin-top:1.5rem;">
          <div class="flex-between mb-sm">
            <h4>Aylık Hedef: ${s.completedMonth}/${goal} seans</h4>
            <button class="btn btn-ghost btn-sm" data-edit-goal>Düzenle</button>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${goalPct}%;"></div></div>
          <p class="text-muted" style="font-size:0.8rem; margin-top:0.5rem;">Gelir tahmini: ₺${Math.round(avgIncome).toLocaleString('tr-TR')}/ay ortalama</p>
        </div>

        <div class="grid grid-2" style="margin-top:1.5rem; gap:1.5rem;">
          <div class="card">
            <h3 class="mb-md">Son 6 Ay Kazanç</h3>
            <div class="bar-chart">${monthlySeries.map(m => `
              <div class="bar-col"><div class="bar" style="height:${(m.value/maxM)*140}px;"></div>
              <div class="bar-label">${m.label}</div><div class="bar-value">₺${m.value>=1000?(m.value/1000).toFixed(1)+'k':m.value}</div></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="flex-between mb-md">
              <h3>Yaklaşan Seanslar</h3>
              <a href="#" class="btn btn-ghost btn-sm" data-goto-cal>Takvime Git</a>
            </div>
            ${upcoming.length === 0 ? '<p class="text-muted">Yaklaşan seans yok.</p>' :
              upcoming.map(a => `
                <div class="upcoming-item">
                  <div>
                    <strong>${a.clientName}</strong>
                    <div class="text-muted" style="font-size:0.85rem;">
                      ${new Date(a.date+'T'+a.time).toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short'})} • ${a.time}
                    </div>
                  </div>
                  <span class="badge ${a.type==='online'?'badge-info':'badge-secondary'}">${a.type==='online'?'🖥️':'🤝'}</span>
                </div>`).join('')}
          </div>
        </div>`;

      content.querySelector('[data-goto-cal]')?.addEventListener('click', e => { e.preventDefault(); switchTab('calendar'); });
      content.querySelector('[data-edit-goal]')?.addEventListener('click', () => {
        const v = prompt('Aylık seans hedefini gir:', goal);
        if (v && !isNaN(v)) {
          App.setUserSettings(user.id, { monthlyGoal: parseInt(v) });
          renderTab();
        }
      });
    }

    function last6MonthsEarnings(payments) {
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const next = new Date(now.getFullYear(), now.getMonth()-i+1, 1);
        const value = payments.filter(p => { const t = new Date(p.paidAt); return t >= d && t < next; }).reduce((s,p) => s+p.net, 0);
        months.push({ label: d.toLocaleDateString('tr-TR',{month:'short'}), value });
      }
      return months;
    }

    // ===== CALENDAR =====
    function renderCalendar() {
      content.innerHTML = '<div class="card"><div data-calendar></div></div>';
      App.renderWeeklyCalendar(content.querySelector('[data-calendar]'), {
        mentorId, onAppointmentClick: apt => openAptModal(apt)
      });
    }

    // ===== REQUESTS =====
    function renderRequests() {
      const apts = App.getMentorAppointments(mentorId).filter(a => a.status === 'requested')
        .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
      content.innerHTML = `
        <div class="flex-between mb-md">
          <h2>Onay Bekleyen İstekler (${apts.length})</h2>
          ${apts.length > 1 ? `<button class="btn btn-primary btn-sm" data-approve-all>Tümünü Onayla</button>` : ''}
        </div>
        ${apts.length === 0 ? '<div class="empty-state card"><div class="empty-state-icon">🔔</div><p>Onay bekleyen istek yok.</p></div>' :
          `<div class="card" style="padding:0;">${apts.map(a => `
            <div class="request-row">
              <div>
                <div class="flex" style="gap:0.5rem; align-items:center;">
                  <strong>${a.clientName}</strong>
                  <span class="badge ${a.type==='online'?'badge-info':'badge-secondary'}">${a.type==='online'?'🖥️':'🤝'}</span>
                </div>
                <div class="text-muted" style="font-size:0.9rem; margin-top:0.25rem;">
                  ${new Date(a.date+'T'+a.time).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} • ${a.time}
                </div>
                ${a.note ? `<div class="note-box">${a.note}</div>` : ''}
              </div>
              <div class="flex" style="gap:0.5rem;">
                <button class="btn btn-primary btn-sm" data-approve="${a.id}">Onayla</button>
                <button class="btn btn-ghost btn-sm" data-reject="${a.id}">Reddet</button>
              </div>
            </div>`).join('')}
          </div>`}`;

      content.querySelector('[data-approve-all]')?.addEventListener('click', () => {
        apts.forEach(a => App.approveAppointment(a.id));
        App.toast(`${apts.length} randevu onaylandı.`, 'success');
        renderTab();
      });
      content.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
        App.approveAppointment(b.dataset.approve);
        App.toast('Randevu onaylandı.', 'success'); renderTab();
      }));
      content.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Bu isteği reddetmek istiyor musun?')) { App.rejectAppointment(b.dataset.reject); renderTab(); }
      }));
    }

    // ===== APPOINTMENTS =====
    function renderAppointments() {
      const apts = App.getMentorAppointments(mentorId).sort((a,b) => new Date(b.date+'T'+b.time) - new Date(a.date+'T'+a.time));
      const now = Date.now();
      const past = apts.filter(a => ['completed','cancelled','rejected','no_show'].includes(a.status) || (a.status==='paid'&&new Date(a.date+'T'+a.time).getTime()<now-2*3600*1000));
      const active = apts.filter(a => !past.includes(a));

      content.innerHTML = `
        <h2 class="mb-md">Aktif Randevular (${active.length})</h2>
        ${active.length===0 ? '<div class="empty-state card"><p>Aktif randevu yok.</p></div>' :
          `<div class="card" style="padding:0;">${active.map(aptRow).join('')}</div>`}
        <h2 style="margin:2rem 0 1rem;">Geçmiş (${past.length})</h2>
        ${past.length===0 ? '<p class="text-muted">Henüz geçmiş randevu yok.</p>' :
          `<div class="card" style="padding:0;">${past.map(aptRow).join('')}</div>`}`;

      content.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => {
        App.completeAppointment(b.dataset.complete); App.toast('Seans tamamlandı.','success'); renderTab();
      }));
      content.querySelectorAll('[data-noshow]').forEach(b => b.addEventListener('click', () => {
        if(confirm('Danışan gelmedi?')){App.markNoShow(b.dataset.noshow);renderTab();}
      }));
      content.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => {
        if(confirm('İptal et?')){App.cancelAppointment(b.dataset.cancel);renderTab();}
      }));
    }

    function aptRow(a) {
      const st = App.STATUS_LABEL[a.status];
      const isPaid = a.status === 'paid';
      const pastTime = new Date(a.date+'T'+a.time).getTime() < Date.now();
      return `
        <div class="request-row">
          <div>
            <div class="flex" style="gap:0.5rem; align-items:center;">
              <strong>${a.clientName}</strong>
              <span class="badge ${st.cls}">${st.label}</span>
            </div>
            <div class="text-muted" style="font-size:0.9rem; margin-top:0.25rem;">
              ${new Date(a.date+'T'+a.time).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} • ${a.time} • ${a.type==='online'?'🖥️':'🤝'}
            </div>
          </div>
          <div class="flex" style="gap:0.5rem;">
            ${isPaid && a.meetLink ? `<a href="${a.meetLink}" target="_blank" class="btn btn-sm btn-primary">Katıl</a>` : ''}
            ${isPaid && pastTime ? `<button class="btn btn-sm btn-primary" data-complete="${a.id}">Tamamlandı</button>
              <button class="btn btn-sm btn-ghost" data-noshow="${a.id}">Gelmedi</button>` : ''}
            ${['requested','approved','paid'].includes(a.status)&&!pastTime ? `<button class="btn btn-sm btn-ghost" data-cancel="${a.id}">İptal</button>` : ''}
          </div>
        </div>`;
    }

    // ===== CLIENTS (Portfolio) =====
    function renderClients() {
      const apts = App.getMentorAppointments(mentorId);
      const clientMap = {};
      apts.forEach(a => {
        if (!clientMap[a.clientId]) clientMap[a.clientId] = { name: a.clientName, id: a.clientId, sessions: 0, lastDate: null, notes: [] };
        if (a.status === 'completed') clientMap[a.clientId].sessions++;
        const d = new Date(a.date);
        if (!clientMap[a.clientId].lastDate || d > clientMap[a.clientId].lastDate) clientMap[a.clientId].lastDate = d;
      });
      const clients = Object.values(clientMap).sort((a,b) => b.sessions - a.sessions);
      const sessionNotes = App.Storage.get('mp_session_notes', {});
      const myNotes = sessionNotes[mentorId] || {};

      content.innerHTML = `
        <h2 class="mb-lg">Danışan Portfolyom (${clients.length})</h2>
        ${clients.length === 0 ? '<div class="empty-state card"><p>Henüz danışanın yok.</p></div>' :
          `<div class="client-grid">${clients.map(c => {
            const note = myNotes[c.id] || '';
            const clientApts = apts.filter(a => a.clientId === c.id);
            const upcoming = clientApts.filter(a => ['paid','approved','requested'].includes(a.status)).length;
            return `
              <div class="card client-card">
                <div class="flex-between">
                  <div>
                    <h4>${c.name}</h4>
                    <p class="text-muted" style="font-size:0.85rem;">${c.sessions} seans tamamlandı ${upcoming ? `• ${upcoming} aktif` : ''}</p>
                    <p class="text-muted" style="font-size:0.8rem;">Son: ${c.lastDate ? c.lastDate.toLocaleDateString('tr-TR') : '-'}</p>
                  </div>
                  <button class="btn btn-ghost btn-sm" data-client-history="${c.id}">Geçmiş</button>
                </div>
                <div style="margin-top:0.75rem;">
                  <label class="text-muted" style="font-size:0.8rem;">Özel notlar (sadece sen görürsün)</label>
                  <textarea class="form-textarea" rows="2" data-cnote="${c.id}" style="font-size:0.85rem; margin-top:0.25rem;">${note}</textarea>
                </div>
              </div>`;
          }).join('')}</div>`}`;

      content.querySelectorAll('[data-cnote]').forEach(ta => {
        let timer;
        ta.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            const notes = App.Storage.get('mp_session_notes', {});
            if (!notes[mentorId]) notes[mentorId] = {};
            notes[mentorId][ta.dataset.cnote] = ta.value;
            App.Storage.set('mp_session_notes', notes);
          }, 500);
        });
      });

      content.querySelectorAll('[data-client-history]').forEach(b => b.addEventListener('click', () => {
        const cId = b.dataset.clientHistory;
        const c = clients.find(x => x.id === cId);
        const cApts = apts.filter(a => a.clientId === cId).sort((a,b) => new Date(b.date) - new Date(a.date));
        App.openModal(`
          <div class="modal-header"><h3>${c.name} — Seans Geçmişi</h3><button class="modal-close" data-modal-close>×</button></div>
          <table class="data-table" style="font-size:0.85rem;">
            <thead><tr><th>Tarih</th><th>Saat</th><th>Tip</th><th>Durum</th></tr></thead>
            <tbody>${cApts.map(a => {
              const st = App.STATUS_LABEL[a.status]||{};
              return `<tr><td>${a.date}</td><td>${a.time}</td><td>${a.type==='online'?'🖥️':'🤝'}</td>
                <td><span class="badge ${st.cls||''}">${st.label||a.status}</span></td></tr>`;
            }).join('')}</tbody>
          </table>
        `);
      }));
    }

    // ===== REVIEWS =====
    function renderReviews() {
      const reviews = App.Storage.get(App.Storage.keys.REVIEWS, []).filter(r => r.mentorId === mentorId)
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : '-';
      const dist = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));
      const maxDist = Math.max(1, ...dist.map(d => d.count));

      content.innerHTML = `
        <h2 class="mb-lg">Yorumlar & Değerlendirmeler</h2>
        <div class="grid grid-2" style="gap:1.5rem; margin-bottom:1.5rem;">
          <div class="card" style="text-align:center;">
            <div style="font-size:3rem; font-weight:800; line-height:1;">${avgRating}</div>
            <div style="font-size:1.5rem; margin:0.5rem 0;">${'⭐'.repeat(Math.round(parseFloat(avgRating)||0))}</div>
            <p class="text-muted">${reviews.length} değerlendirme</p>
          </div>
          <div class="card">
            <h4 class="mb-md">Dağılım</h4>
            ${dist.map(d => `
              <div class="rating-bar-row">
                <span>${d.star} ⭐</span>
                <div class="rating-bar"><div class="rating-bar-fill" style="width:${(d.count/maxDist)*100}%;"></div></div>
                <span>${d.count}</span>
              </div>`).join('')}
          </div>
        </div>
        ${reviews.length === 0 ? '<p class="text-muted">Henüz yorum yok.</p>' : `
        <div class="card" style="padding:0;">
          ${reviews.map(r => {
            const users = App.Storage.get(App.Storage.keys.USERS, []);
            const cu = users.find(u => u.id === r.clientId);
            return `
              <div class="review-item">
                <div class="flex-between">
                  <div>
                    <strong>${cu?.name || 'Danışan'}</strong>
                    <span style="margin-left:0.5rem;">${'⭐'.repeat(r.rating)}</span>
                  </div>
                  <span class="text-muted" style="font-size:0.8rem;">${new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
                ${r.comment ? `<p style="margin-top:0.5rem; color:var(--c-text-light);">${r.comment}</p>` : ''}
              </div>`;
          }).join('')}
        </div>`}`;
    }

    // ===== EARNINGS =====
    function renderEarnings() {
      const s = App.getMentorStats(mentorId);
      const rows = s.payments.sort((a,b) => new Date(b.paidAt) - new Date(a.paidAt));
      const aptMap = {};
      App.getMentorAppointments(mentorId).forEach(a => aptMap[a.id] = a);

      content.innerHTML = `
        <div class="dash-stats-grid">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bu Ay Net</div>
            <div class="stat-value">₺${s.earningsMonthNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">${s.completedMonth} seans</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Net</div>
            <div class="stat-value">₺${s.earningsTotalNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">${s.completedTotal} seans</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Komisyon (%${App.COMMISSION_RATE*100})</div>
            <div class="stat-value">₺${(s.earningsTotalGross-s.earningsTotalNet).toLocaleString('tr-TR')}</div>
            <div class="stat-sub">platform payı</div>
          </div>
        </div>
        <div class="card" style="margin-top:1.5rem;">
          <div class="flex-between mb-md">
            <h3>Ödeme Geçmişi</h3>
            <button class="btn btn-ghost btn-sm" data-export-pdf>📥 PDF</button>
          </div>
          ${rows.length===0 ? '<p class="text-muted">Henüz ödeme yok.</p>' : `
            <table class="data-table">
              <thead><tr><th>Tarih</th><th>Danışan</th><th>Brüt</th><th>Komisyon</th><th>Net</th><th>Durum</th></tr></thead>
              <tbody>${rows.map(p => {
                const a = aptMap[p.appointmentId];
                return `<tr><td>${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                  <td>${a?a.clientName:'-'}</td><td>₺${p.amount.toLocaleString('tr-TR')}</td>
                  <td class="text-muted">-₺${p.commission.toLocaleString('tr-TR')}</td>
                  <td><strong>₺${p.net.toLocaleString('tr-TR')}</strong></td>
                  <td><span class="badge badge-success">Ödendi</span></td></tr>`;
              }).join('')}</tbody>
            </table>`}
        </div>`;

      content.querySelector('[data-export-pdf]')?.addEventListener('click', () => {
        App.toast('PDF raporu hazırlanıyor (demo).', 'success');
      });
    }

    // ===== AVAILABILITY =====
    function renderAvailability() {
      const avail = App.getAvailability(mentorId);
      content.innerHTML = `
        <div class="flex-between mb-md" style="flex-wrap:wrap; gap:1rem;">
          <div><h2>Müsaitlik Ayarları</h2><p class="text-muted">Haftalık şablonunu belirle.</p></div>
        </div>
        <div class="card">
          <div class="grid grid-3" style="gap:1rem;">
            <div class="form-group"><label>Seans Süresi</label>
              <select class="form-select" data-avail-field="sessionDuration">
                ${[30,45,60,90].map(v => `<option value="${v}" ${v===avail.sessionDuration?'selected':''}>${v} dk</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Ara Süresi</label>
              <select class="form-select" data-avail-field="buffer">
                ${[0,5,10,15,30].map(v => `<option value="${v}" ${v===avail.buffer?'selected':''}>${v} dk</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Min. Ön Bildirim</label>
              <select class="form-select" data-avail-field="minNoticeHours">
                ${[2,4,12,24,48].map(v => `<option value="${v}" ${v===avail.minNoticeHours?'selected':''}>${v} saat</option>`).join('')}
              </select></div>
          </div>
          <div class="form-group"><label>Seans Tipleri</label>
            <div class="radio-group">
              <label class="radio-option"><input type="checkbox" data-type-opt="online" ${avail.sessionTypes.includes('online')?'checked':''}><span>🖥️ Online</span></label>
              <label class="radio-option"><input type="checkbox" data-type-opt="offline" ${avail.sessionTypes.includes('offline')?'checked':''}><span>🤝 Yüz yüze</span></label>
            </div></div>
        </div>
        <div class="card" style="margin-top:1.5rem;">
          <h3 class="mb-md">Haftalık Çalışma Saatleri</h3>
          ${App.DAY_KEYS.slice(1).concat(['sun']).map(dk => `
            <div class="day-row" data-day-row="${dk}">
              <div class="day-label">${App.DAY_LABELS_LONG[dk]}</div>
              <div class="day-ranges" data-day-ranges="${dk}">
                ${(avail.weekly[dk]||[]).map((r,i) => rangeHtml(dk,i,r)).join('')}
              </div>
              <button class="btn btn-ghost btn-sm" data-add-range="${dk}">+ Ekle</button>
            </div>`).join('')}
        </div>
        <div class="card" style="margin-top:1.5rem;">
          <h3 class="mb-md">Kapalı Tarihler</h3>
          <div class="flex" style="gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-group" style="margin:0;"><label>Tarih</label><input type="date" class="form-input" data-new-blocked></div>
            <button class="btn btn-primary btn-sm" data-add-blocked>Ekle</button>
          </div>
          <div class="blocked-list" data-blocked-list>
            ${(avail.blockedDates||[]).map(d => `<span class="chip">${new Date(d).toLocaleDateString('tr-TR')} <button data-del-blocked="${d}">×</button></span>`).join('')||'<p class="text-muted">Kapalı tarih yok.</p>'}
          </div>
        </div>
        <div style="margin-top:1.5rem; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary btn-lg" data-save-avail>💾 Kaydet</button>
        </div>`;

      function rangeHtml(dk,i,r) {
        return `<div class="range-row" data-range="${dk}|${i}"><input type="time" value="${r.start}" data-range-start><span>–</span><input type="time" value="${r.end}" data-range-end><button class="range-del" data-del-range="${dk}|${i}">×</button></div>`;
      }
      function readForm() {
        const next = JSON.parse(JSON.stringify(avail));
        content.querySelectorAll('[data-avail-field]').forEach(el => { next[el.dataset.availField] = parseInt(el.value,10); });
        next.sessionTypes = [...content.querySelectorAll('[data-type-opt]')].filter(x=>x.checked).map(x=>x.dataset.typeOpt);
        App.DAY_KEYS.forEach(dk => {
          const ranges = [];
          content.querySelectorAll(`[data-day-ranges="${dk}"] .range-row`).forEach(row => {
            const s = row.querySelector('[data-range-start]').value, e = row.querySelector('[data-range-end]').value;
            if(s&&e&&s<e) ranges.push({start:s,end:e});
          });
          next.weekly[dk] = ranges;
        });
        return next;
      }
      content.querySelectorAll('[data-add-range]').forEach(b => b.addEventListener('click', () => {
        const dk = b.dataset.addRange, host = content.querySelector(`[data-day-ranges="${dk}"]`);
        host.insertAdjacentHTML('beforeend', rangeHtml(dk, host.querySelectorAll('.range-row').length, {start:'09:00',end:'12:00'}));
        bindDel();
      }));
      function bindDel() { content.querySelectorAll('[data-del-range]').forEach(b => { b.onclick = () => b.closest('.range-row').remove(); }); }
      bindDel();
      content.querySelector('[data-add-blocked]')?.addEventListener('click', () => {
        const inp = content.querySelector('[data-new-blocked]'); if(!inp.value) return;
        const next = readForm(); next.blockedDates = [...new Set([...(next.blockedDates||[]), inp.value])];
        App.setAvailability(mentorId, next); renderTab();
      });
      content.querySelectorAll('[data-del-blocked]').forEach(b => b.addEventListener('click', () => {
        const next = readForm(); next.blockedDates = (next.blockedDates||[]).filter(d => d !== b.dataset.delBlocked);
        App.setAvailability(mentorId, next); renderTab();
      }));
      content.querySelector('[data-save-avail]').addEventListener('click', () => {
        App.setAvailability(mentorId, readForm()); App.toast('Müsaitlik güncellendi.','success');
      });
    }

    function openAptModal(apt) {
      if (!apt) return;
      const st = App.STATUS_LABEL[apt.status];
      App.openModal(`
        <div class="modal-header"><h3>${apt.clientName}</h3><button class="modal-close" data-modal-close>×</button></div>
        <p><span class="badge ${st.cls}">${st.label}</span></p>
        <p><strong>${new Date(apt.date+'T'+apt.time).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})}</strong> • ${apt.time}</p>
        <p class="text-muted">${apt.type==='online'?'🖥️ Online':'🤝 Yüz yüze'} • ₺${apt.price}</p>
        ${apt.note ? `<div class="note-box">${apt.note}</div>` : ''}
        ${apt.meetLink ? `<a href="${apt.meetLink}" target="_blank" class="btn btn-primary btn-block" style="margin-top:1rem;">Meet Linkine Git</a>` : ''}
      `);
    }

    renderTab();
  };
})(window.App);
