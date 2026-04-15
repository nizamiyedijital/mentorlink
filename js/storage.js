window.App = window.App || {};

(function (App) {
  const KEYS = {
    USERS: 'mp_users',
    APPLICATIONS: 'mp_applications',
    APPOINTMENTS: 'mp_appointments',
    SUBSCRIPTIONS: 'mp_subscriptions',
    APPROVED_MENTORS: 'mp_approved_mentors',
    CURRENT_USER: 'mp_current_user',
    TRAINING_PROGRESS: 'mp_training_progress',
    QUIZ_RESULTS: 'mp_quiz_results',
    SEEDED: 'mp_seeded_v1'
  };

  App.Storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    remove(key) { localStorage.removeItem(key); },
    keys: KEYS
  };

  App.uid = function (prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  };

  App.seedOnce = function () {
    if (App.Storage.get(KEYS.SEEDED)) return;
    const adminUser = {
      id: 'admin_demo',
      name: 'Admin',
      email: 'admin@demo',
      password: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    App.Storage.set(KEYS.USERS, [adminUser]);
    App.Storage.set(KEYS.APPLICATIONS, []);
    App.Storage.set(KEYS.APPOINTMENTS, []);
    App.Storage.set(KEYS.SUBSCRIPTIONS, []);
    App.Storage.set(KEYS.APPROVED_MENTORS, []);
    App.Storage.set(KEYS.TRAINING_PROGRESS, {});
    App.Storage.set(KEYS.QUIZ_RESULTS, {});
    App.Storage.set(KEYS.SEEDED, true);
  };

  App.loadMentors = function () {
    const seed = window.SEED_MENTORS || [];
    const approved = App.Storage.get(KEYS.APPROVED_MENTORS, []);
    return [...seed, ...approved];
  };

  App.loadTrainings = function () { return window.SEED_TRAININGS || []; };
  App.loadQuiz = function () { return window.SEED_QUIZ || []; };
})(window.App);
