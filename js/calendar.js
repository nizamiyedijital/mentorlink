(function (App) {
  const HOURS_START = 8;
  const HOURS_END = 22;

  function startOfWeek(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  App.renderWeeklyCalendar = function (host, opts) {
    const { mentorId, weekStart: wsInput, onAppointmentClick, onEmptyClick } = opts;
    const weekStart = startOfWeek(wsInput || new Date());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
    const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, [])
      .filter(a => a.mentorId === mentorId && ['requested', 'approved', 'paid', 'completed'].includes(a.status));
    const avail = App.getAvailability(mentorId);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const fmtRange = `${weekStart.toLocaleDateString('tr-TR', { day:'numeric', month:'short' })} – ${weekEnd.toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' })}`;

    const hoursCol = [];
    for (let h = HOURS_START; h < HOURS_END; h++) {
      hoursCol.push(`<div class="cal-hour-label">${String(h).padStart(2, '0')}:00</div>`);
    }

    const dayCols = days.map(d => {
      const dateStr = App.dateKey(d);
      const dayKey = App.dayKeyOf(d);
      const ranges = (avail.weekly && avail.weekly[dayKey]) || [];
      const isBlocked = (avail.blockedDates || []).includes(dateStr);
      const isToday = App.dateKey(new Date()) === dateStr;

      const availBands = isBlocked ? '' : ranges.map(r => {
        const top = (App.toMin(r.start) - HOURS_START * 60) / 60 * 48;
        const h = (App.toMin(r.end) - App.toMin(r.start)) / 60 * 48;
        return `<div class="cal-available-band" style="top:${top}px; height:${h}px;"></div>`;
      }).join('');

      const dayApts = apts.filter(a => a.date === dateStr).map(a => {
        const top = (App.toMin(a.time) - HOURS_START * 60) / 60 * 48;
        const h = (avail.sessionDuration || 60) / 60 * 48;
        return `<div class="cal-event cal-event-${a.status}" data-apt-id="${a.id}" style="top:${top}px; height:${h - 4}px;">
          <div class="cal-event-time">${a.time}</div>
          <div class="cal-event-title">${a.clientName || 'Danışan'}</div>
        </div>`;
      }).join('');

      return `<div class="cal-day ${isToday ? 'is-today' : ''}" data-cal-date="${dateStr}">
        <div class="cal-day-header">
          <div class="cal-day-name">${App.DAY_LABELS[dayKey]}</div>
          <div class="cal-day-num">${d.getDate()}</div>
        </div>
        <div class="cal-day-body">
          ${Array.from({ length: HOURS_END - HOURS_START }, () => '<div class="cal-slot"></div>').join('')}
          ${availBands}
          ${dayApts}
          ${isBlocked ? '<div class="cal-blocked">Kapalı</div>' : ''}
        </div>
      </div>`;
    }).join('');

    host.innerHTML = `
      <div class="cal-toolbar">
        <div class="flex" style="gap:0.5rem;">
          <button class="btn btn-ghost btn-sm" data-cal-prev>‹</button>
          <button class="btn btn-ghost btn-sm" data-cal-today>Bugün</button>
          <button class="btn btn-ghost btn-sm" data-cal-next>›</button>
        </div>
        <div class="cal-range">${fmtRange}</div>
        <div class="cal-legend">
          <span><i class="dot dot-requested"></i>Onay bekliyor</span>
          <span><i class="dot dot-approved"></i>Onaylı</span>
          <span><i class="dot dot-paid"></i>Ödendi</span>
          <span><i class="dot dot-completed"></i>Tamamlandı</span>
        </div>
      </div>
      <div class="cal-grid">
        <div class="cal-hours">
          <div class="cal-day-header"></div>
          <div class="cal-day-body">${hoursCol.join('')}</div>
        </div>
        ${dayCols}
      </div>`;

    host.querySelector('[data-cal-prev]').addEventListener('click', () => {
      const ws = new Date(weekStart); ws.setDate(ws.getDate() - 7);
      App.renderWeeklyCalendar(host, { ...opts, weekStart: ws });
    });
    host.querySelector('[data-cal-next]').addEventListener('click', () => {
      const ws = new Date(weekStart); ws.setDate(ws.getDate() + 7);
      App.renderWeeklyCalendar(host, { ...opts, weekStart: ws });
    });
    host.querySelector('[data-cal-today]').addEventListener('click', () => {
      App.renderWeeklyCalendar(host, { ...opts, weekStart: new Date() });
    });
    host.querySelectorAll('[data-apt-id]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const apt = apts.find(a => a.id === el.dataset.aptId);
        onAppointmentClick && onAppointmentClick(apt);
      });
    });
    if (onEmptyClick) {
      host.querySelectorAll('[data-cal-date]').forEach(el => {
        el.addEventListener('click', () => onEmptyClick(el.dataset.calDate));
      });
    }
  };
})(window.App);
