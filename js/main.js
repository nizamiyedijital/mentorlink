(function (App) {
  App.seedOnce();
  App.renderNavbar();
  App.renderFooter();

  const page = document.body.dataset.page;
  switch (page) {
    case 'home':          App.initFeaturedMentors(); break;
    case 'mentors':       App.initMentorsPage(); break;
    case 'mentor-detail': App.initMentorDetail(); break;
    case 'training':      App.initTrainingPage(); break;
    case 'quiz':          App.initQuizPage(); break;
    case 'admin':         App.initAdminPage(); break;
    case 'login':         App.initLoginPage && App.initLoginPage(); break;
    case 'register':      App.initRegisterPage && App.initRegisterPage(); break;
    case 'pricing':       App.initPricingPage && App.initPricingPage(); break;
    case 'dashboard':     App.initDashboardPage && App.initDashboardPage(); break;
    case 'become-mentor': App.initBecomeMentorPage && App.initBecomeMentorPage(); break;
    case 'payment':       App.initPaymentPage && App.initPaymentPage(); break;
    case 'settings':      App.initSettingsPage && App.initSettingsPage(); break;
  }
})(window.App);
