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
      if (currentTab === 'overview') renderOverview();
      else if (currentTab === 'calendar') renderCalendar();
      else if (currentTab === 'requests') renderRequests();
      else if (currentTab === 'appointments') renderAppointments();
      else if (currentTab === 'earnings') renderEarnings();
      else if (currentTab === 'availability') renderAvailability();
    }

    function renderOverview() {
      const s = App.getMentorStats(mentorId);
      const apts = App.getMentorAppointments(mentorId);
      const now = Date.now();
      const upcoming = apts
        .filter(a => a.status === 'paid' && new Date(a.date + 'T' + a.time) > now)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 5);

      const monthlySeries = last6MonthsEarnings(s.payments);
      const maxM = Math.max(1, ...monthlySeries.map(x => x.value));

      content.innerHTML = `
        <div class="dash-stats-grid">
          <div class="stat-card stat-accent">
            <div class="stat-label">Bu Ay Kazanç (Net)</div>
            <div class="stat-value">₺${s.earningsMonthNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Brüt: ₺${s.earningsMonthGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Toplam Kazanç (Net)</div>
            <div class="stat-value">₺${s.earningsTotalNet.toLocaleString('tr-TR')}</div>
            <div class="stat-sub">Brüt: ₺${s.earningsTotalGross.toLocaleString('tr-TR')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Bu Ay Seans</div>
            <div class="stat-value">${s.completedMonth}</div>
            <div class="stat-sub">Toplam: ${s.completedTotal}</div>
          </div>
          <div class="stat-card stat-warn">
            <div class="stat-label">Onay Bekleyen</div>
            <div class="stat-value">${s.pending}</div>
            <div class="stat-sub">${s.awaitingPayment} ödeme bekliyor</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Yaklaşan Seans</div>
            <div class="stat-value">${s.upcoming}</div>
            <div class="stat-sub">ödenmiş &amp; planlı</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Puan / Değerlendirme</div>
            <div class="stat-value">⭐ ${profile.rating}</div>
            <div class="stat-sub">${profile.reviewCount} yorum</div>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:1.5rem; gap:1.5rem;">
          <div class="card">
            <h3 class="mb-md">Son 6 Ay Kazanç</h3>
            <div class="bar-chart">
              ${monthlySeries.map(m => `
                <div class="bar-col">
                  <div class="bar" style="height:${(m.value / maxM) * 140}px;" title="₺${m.value.toLocaleString('tr-TR')}"></div>
                  <div class="bar-label">${m.label}</div>
                  <div class="bar-value">₺${m.value >= 1000 ? (m.value/1000).toFixed(1) + 'k' : m.value}</div>
                </div>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="flex-between mb-md">
              <h3>Yaklaşan Seanslar</h3>
              <a href="#" class="btn btn-ghost btn-sm" data-goto-cal>Takvime Git</a>
            </div>
            ${upcoming.length === 0 ? `<p class="text-muted">Yaklaşan seans yok.</p>` :
              upcoming.map(a => `
                <div class="upcoming-item">
                  <div>
                    <strong>${a.clientName}</strong>
                    <div class="text-muted" style="font-size:0.85rem;">
                      ${new Date(a.date + 'T' + a.time).toLocaleDateString('tr-TR', { weekday:'short', day:'numeric', month:'short' })} • ${a.time}
                    </div>
                  </div>
                  <span class="badge ${a.type === 'online' ? 'badge-info' : 'badge-secondary'}">${a.type === 'online' ? '🖥️ Online' : '🤝 Yüz yüze'}</span>
                </div>`).join('')}
          </div>
        </div>`;

      content.querySelector('[data-goto-cal]')?.addEventListener('click', e => {
        e.preventDefault(); switchTab('calendar');
      });
    }

    function last6MonthsEarnings(payments) {
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const value = payments
          .filter(p => { const t = new Date(p.paidAt); return t >= d && t < next; })
          .reduce((s, p) => s + p.net, 0);
        months.push({ label: d.toLocaleDateString('tr-TR', { month: 'short' }), value });
      }
      return months;
    }

    function renderCalendar() {
      content.innerHTML = `<div class="card"><div data-calendar></div></div>`;
      App.renderWeeklyCalendar(content.querySelector('[data-calendar]'), {
        mentorId,
        onAppointmentClick: apt => openAptModal(apt)
      });
    }

    function renderRequests() {
      const apts = App.getMentorAppointments(mentorId)
        .filter(a => a.status === 'requested')
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
      content.innerHTML = `
        <h2 class="mb-md">Onay Bekleyen İstekler</h2>
        ${apts.length === 0 ? `<div class="empty-state card"><div class="empty-state-icon">🔔</div>
          <p>Onay bekleyen istek yok.</p></div>` :
          `<div class="card" style="padding:0;">
            ${apts.map(a => `
              <div class="request-row">
                <div>
                  <div class="flex" style="gap:0.5rem; align-items:center;">
                    <strong>${a.clientName}</strong>
                    <span class="badge ${a.type === 'online' ? 'badge-info' : 'badge-secondary'}">${a.type === 'online' ? '🖥️' : '🤝'}</span>
                  </div>
                  <div class="text-muted" style="font-size:0.9rem; margin-top:0.25rem;">
                    ${new Date(a.date + 'T' + a.time).toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })} • ${a.time}
                  </div>
                  ${a.note ? `<div class="note-box">${a.note}</div>` : ''}
                </div>
                <div class="flex" style="gap:0.5rem;">
                  <button class="btn btn-primary btn-sm" data-approve="${a.id}">Onayla</button>
                  <button class="btn btn-ghost btn-sm" data-reject="${a.id}">Reddet</button>
                </div>
              </div>`).join('')}
          </div>`}`;
      content.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
        App.approveAppointment(b.dataset.approve);
        App.toast('Randevu onaylandı. Danışana ödeme bağlantısı iletildi.', 'success');
        renderTab();
      }));
      content.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Bu isteği reddetmek istiyor musun?')) {
          App.rejectAppointment(b.dataset.reject);
          App.toast('İstek reddedildi.', 'success');
          renderTab();
        }
      }));
    }

    function renderAppointments() {
      const apts = App.getMentorAppointments(mentorId)
        .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
      const now = Date.now();
      const past = apts.filter(a => ['completed', 'cancelled', 'rejected', 'no_show'].includes(a.status)
        || (a.status === 'paid' && new Date(a.date + 'T' + a.time).getTime() < now - 2 * 3600 * 1000));
      const active = apts.filter(a => !past.includes(a));

      content.innerHTML = `
        <h2 class="mb-md">Aktif Randevular</h2>
        ${active.length === 0 ? `<div class="empty-state card"><p>Aktif randevu yok.</p></div>` :
          `<div class="card" style="padding:0;">${active.map(aptRow).join('')}</div>`}
        <h2 style="margin:2rem 0 1rem;">Geçmiş</h2>
        ${past.length === 0 ? `<p class="text-muted">Henüz geçmiş randevu yok.</p>` :
          `<div class="card" style="padding:0;">${past.map(aptRow).join('')}</div>`}`;

      content.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => {
        App.completeAppointment(b.dataset.complete);
        App.toast('Seans tamamlandı olarak işaretlendi.', 'success');
        renderTab();
      }));
      content.querySelectorAll('[data-noshow]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Danışan seansa gelmedi olarak işaretlensin mi?')) {
          App.markNoShow(b.dataset.noshow);
          renderTab();
        }
      }));
      content.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => {
        if (confirm('Bu randevuyu iptal etmek istiyor musun?')) {
          App.cancelAppointment(b.dataset.cancel);
          renderTab();
        }
      }));
    }

    function aptRow(a) {
      const st = App.STATUS_LABEL[a.status];
      const isPaid = a.status === 'paid';
      const past = new Date(a.date + 'T' + a.time).getTime() < Date.now();
      return `
        <div class="request-row">
          <div>
            <div class="flex" style="gap:0.5rem; align-items:center;">
              <strong>${a.clientName}</strong>
              <span class="badge ${st.cls}">${st.label}</span>
            </div>
            <div class="text-muted" style="font-size:0.9rem; margin-top:0.25rem;">
              ${new Date(a.date + 'T' + a.time).toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })} • ${a.time} • ${a.type === 'online' ? '🖥️ Online' : '🤝 Yüz yüze'}
            </div>
          </div>
          <div class="flex" style="gap:0.5rem;">
            ${isPaid && a.meetLink ? `<a href="${a.meetLink}" target="_blank" class="btn btn-sm btn-primary">Katıl</a>` : ''}
            ${isPaid && past ? `<button class="btn btn-sm btn-primary" data-complete="${a.id}">Tamamlandı</button>
              <button class="btn btn-sm btn-ghost" data-noshow="${a.id}">Gelmedi</button>` : ''}
            ${['requested', 'approved', 'paid'].includes(a.status) && !past ? `<button class="btn btn-sm btn-ghost" data-cancel="${a.id}">İptal</button>` : ''}
          </div>
        </div>`;
    }

    function renderEarnings() {
      const s = App.getMentorStats(mentorId);
      const rows = s.payments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
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
            <div class="stat-label">Komisyon (${(App.COMMISSION_RATE*100)}%)</div>
            <div class="stat-value">₺${(s.earningsTotalGross - s.earningsTotalNet).toLocaleString('tr-TR')}</div>
            <div class="stat-sub">platform payı</div>
          </div>
        </div>
        <div class="card" style="margin-top:1.5rem;">
          <h3 class="mb-md">Ödeme Geçmişi</h3>
          ${rows.length === 0 ? `<p class="text-muted">Henüz ödeme yok.</p>` :
            `<table class="data-table">
              <thead><tr><th>Tarih</th><th>Danışan</th><th>Brüt</th><th>Komisyon</th><th>Net</th><th>Durum</th></tr></thead>
              <tbody>
                ${rows.map(p => {
                  const a = aptMap[p.appointmentId];
                  return `<tr>
                    <td>${new Date(p.paidAt).toLocaleDateString('tr-TR')}</td>
                    <td>${a ? a.clientName : '-'}</td>
                    <td>₺${p.amount.toLocaleString('tr-TR')}</td>
                    <td class="text-muted">-₺${p.commission.toLocaleString('tr-TR')}</td>
                    <td><strong>₺${p.net.toLocaleString('tr-TR')}</strong></td>
                    <td><span class="badge badge-success">Ödendi</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
        </div>`;
    }

    function renderAvailability() {
      const avail = App.getAvailability(mentorId);
      content.innerHTML = `
        <div class="flex-between mb-md" style="flex-wrap:wrap; gap:1rem;">
          <div><h2>Müsaitlik Ayarları</h2><p class="text-muted">Haftalık çalışma şablonunu belirle. Danışanlar sadece bu aralıklardaki slot'lardan seçim yapabilir.</p></div>
        </div>
        <div class="card">
          <div class="grid grid-3" style="gap:1rem;">
            <div class="form-group"><label>Seans Süresi</label>
              <select class="form-select" data-avail-field="sessionDuration">
                ${[30, 45, 60, 90].map(v => `<option value="${v}" ${v === avail.sessionDuration ? 'selected' : ''}>${v} dk</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Ara Süresi (buffer)</label>
              <select class="form-select" data-avail-field="buffer">
                ${[0, 5, 10, 15, 30].map(v => `<option value="${v}" ${v === avail.buffer ? 'selected' : ''}>${v} dk</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Min. Ön Bildirim</label>
              <select class="form-select" data-avail-field="minNoticeHours">
                ${[2, 4, 12, 24, 48].map(v => `<option value="${v}" ${v === avail.minNoticeHours ? 'selected' : ''}>${v} saat</option>`).join('')}
              </select></div>
          </div>
          <div class="form-group"><label>Seans Tipleri</label>
            <div class="radio-group">
              <label class="radio-option"><input type="checkbox" data-type-opt="online" ${avail.sessionTypes.includes('online') ? 'checked' : ''}><span>🖥️ Online</span></label>
              <label class="radio-option"><input type="checkbox" data-type-opt="offline" ${avail.sessionTypes.includes('offline') ? 'checked' : ''}><span>🤝 Yüz yüze</span></label>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:1.5rem;">
          <h3 class="mb-md">Haftalık Çalışma Saatleri</h3>
          ${App.DAY_KEYS.slice(1).concat(['sun']).map(dk => `
            <div class="day-row" data-day-row="${dk}">
              <div class="day-label">${App.DAY_LABELS_LONG[dk]}</div>
              <div class="day-ranges" data-day-ranges="${dk}">
                ${(avail.weekly[dk] || []).map((r, i) => rangeHtml(dk, i, r)).join('')}
              </div>
              <button class="btn btn-ghost btn-sm" data-add-range="${dk}">+ Aralık Ekle</button>
            </div>`).join('')}
        </div>

        <div class="card" style="margin-top:1.5rem;">
          <h3 class="mb-md">Kapalı Tarihler</h3>
          <div class="flex" style="gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-group" style="margin:0;">
              <label>Yeni kapalı tarih</label>
              <input type="date" class="form-input" data-new-blocked>
            </div>
            <button class="btn btn-primary btn-sm" data-add-blocked>Ekle</button>
          </div>
          <div class="blocked-list" data-blocked-list>
            ${(avail.blockedDates || []).map(d => `<span class="chip">${new Date(d).toLocaleDateString('tr-TR')} <button data-del-blocked="${d}">×</button></span>`).join('') || '<p class="text-muted">Kapalı tarih yok.</p>'}
          </div>
        </div>

        <div style="margin-top:1.5rem; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary btn-lg" data-save-avail>💾 Kaydet</button>
        </div>`;

      function rangeHtml(dk, i, r) {
        return `<div class="range-row" data-range="${dk}|${i}">
          <input type="time" value="${r.start}" data-range-start>
          <span>–</span>
          <input type="time" value="${r.end}" data-range-end>
          <button class="range-del" data-del-range="${dk}|${i}">×</button>
        </div>`;
      }

      function readForm() {
        const next = JSON.parse(JSON.stringify(avail));
        content.querySelectorAll('[data-avail-field]').forEach(el => {
          next[el.dataset.availField] = parseInt(el.value, 10);
        });
        next.sessionTypes = [...content.querySelectorAll('[data-type-opt]')].filter(x => x.checked).map(x => x.dataset.typeOpt);
        App.DAY_KEYS.forEach(dk => {
          const ranges = [];
          content.querySelectorAll(`[data-day-ranges="${dk}"] .range-row`).forEach(row => {
            const start = row.querySelector('[data-range-start]').value;
            const end = row.querySelector('[data-range-end]').value;
            if (start && end && start < end) ranges.push({ start, end });
          });
          next.weekly[dk] = ranges;
        });
        return next;
      }

      content.querySelectorAll('[data-add-range]').forEach(b => b.addEventListener('click', () => {
        const dk = b.dataset.addRange;
        const host = content.querySelector(`[data-day-ranges="${dk}"]`);
        const i = host.querySelectorAll('.range-row').length;
        host.insertAdjacentHTML('beforeend', rangeHtml(dk, i, { start: '09:00', end: '12:00' }));
        bindRangeDel();
      }));
      function bindRangeDel() {
        content.querySelectorAll('[data-del-range]').forEach(b => {
          b.onclick = () => b.closest('.range-row').remove();
        });
      }
      bindRangeDel();

      content.querySelector('[data-add-blocked]')?.addEventListener('click', () => {
        const inp = content.querySelector('[data-new-blocked]');
        if (!inp.value) return;
        const next = readForm();
        next.blockedDates = [...new Set([...(next.blockedDates || []), inp.value])];
        App.setAvailability(mentorId, next);
        renderTab();
      });
      content.querySelectorAll('[data-del-blocked]').forEach(b => b.addEventListener('click', () => {
        const next = readForm();
        next.blockedDates = (next.blockedDates || []).filter(d => d !== b.dataset.delBlocked);
        App.setAvailability(mentorId, next);
        renderTab();
      }));

      content.querySelector('[data-save-avail]').addEventListener('click', () => {
        App.setAvailability(mentorId, readForm());
        App.toast('Müsaitlik güncellendi.', 'success');
      });
    }

    function openAptModal(apt) {
      if (!apt) return;
      const st = App.STATUS_LABEL[apt.status];
      App.openModal(`
        <div class="modal-header">
          <h3>${apt.clientName}</h3>
          <button class="modal-close" data-modal-close>×</button>
        </div>
        <p><span class="badge ${st.cls}">${st.label}</span></p>
        <p><strong>${new Date(apt.date + 'T' + apt.time).toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long' })}</strong> • ${apt.time}</p>
        <p class="text-muted">${apt.type === 'online' ? '🖥️ Online' : '🤝 Yüz yüze'} • ₺${apt.price}</p>
        ${apt.note ? `<div class="note-box">${apt.note}</div>` : ''}
        ${apt.meetLink ? `<a href="${apt.meetLink}" target="_blank" class="btn btn-primary btn-block" style="margin-top:1rem;">Meet Linkine Git</a>` : ''}
      `);
    }

    renderTab();
  };
})(window.App);
