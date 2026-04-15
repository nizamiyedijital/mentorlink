(function (App) {
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  App.DAY_KEYS = DAY_KEYS;
  App.DAY_LABELS = { mon: 'Pzt', tue: 'Sal', wed: 'Çar', thu: 'Per', fri: 'Cum', sat: 'Cmt', sun: 'Paz' };
  App.DAY_LABELS_LONG = { mon: 'Pazartesi', tue: 'Salı', wed: 'Çarşamba', thu: 'Perşembe', fri: 'Cuma', sat: 'Cumartesi', sun: 'Pazar' };

  App.getAvailability = function (mentorId) {
    const all = App.Storage.get(App.Storage.keys.AVAILABILITY, {});
    return all[mentorId] || App.defaultAvailability();
  };

  App.setAvailability = function (mentorId, data) {
    const all = App.Storage.get(App.Storage.keys.AVAILABILITY, {});
    all[mentorId] = data;
    App.Storage.set(App.Storage.keys.AVAILABILITY, all);
  };

  function toMin(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  function fromMin(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  App.toMin = toMin;
  App.fromMin = fromMin;

  App.dateKey = function (d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  App.dayKeyOf = function (d) { return DAY_KEYS[d.getDay()]; };

  App.generateSlots = function (mentorId, dateStr) {
    const avail = App.getAvailability(mentorId);
    if (avail.blockedDates && avail.blockedDates.includes(dateStr)) return [];
    const d = new Date(dateStr + 'T00:00:00');
    const dayKey = DAY_KEYS[d.getDay()];
    const ranges = (avail.weekly && avail.weekly[dayKey]) || [];
    const duration = avail.sessionDuration || 60;
    const buffer = avail.buffer || 0;
    const step = duration + buffer;

    const slots = [];
    ranges.forEach(r => {
      const startMin = toMin(r.start), endMin = toMin(r.end);
      for (let t = startMin; t + duration <= endMin; t += step) {
        slots.push(fromMin(t));
      }
    });

    const minNotice = (avail.minNoticeHours || 0) * 60 * 60 * 1000;
    const now = Date.now();
    const apts = App.Storage.get(App.Storage.keys.APPOINTMENTS, [])
      .filter(a => a.mentorId === mentorId && a.date === dateStr && ['requested', 'approved', 'paid'].includes(a.status));
    const taken = new Set(apts.map(a => a.time));

    return slots
      .filter(t => !taken.has(t))
      .filter(t => new Date(dateStr + 'T' + t + ':00').getTime() - now >= minNotice);
  };

  App.nextAvailableDays = function (mentorId, count = 14) {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60 && out.length < count; i++) {
      const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const key = App.dateKey(d);
      const slots = App.generateSlots(mentorId, key);
      if (slots.length) out.push({ date: key, dateObj: d, slots });
    }
    return out;
  };
})(window.App);
