(function (App) {
  const PASS_THRESHOLD = 70;

  App.initQuizPage = function () {
    const host = document.querySelector('[data-quiz]');
    if (!host) return;
    const user = App.requireAuth();
    if (!user) return;

    const trainings = App.loadTrainings();
    const trainingProgress = App.Storage.get(App.Storage.keys.TRAINING_PROGRESS, {})[user.id] || [];
    if (trainingProgress.length < trainings.length) {
      host.innerHTML = `
        <div class="quiz-card text-center">
          <div class="empty-state-icon">📚</div>
          <h2>Önce eğitimi tamamlayın</h2>
          <p class="text-muted mb-lg">Sınava girebilmek için tüm eğitim bölümlerini tamamlamanız gerekiyor.</p>
          <a href="training.html" class="btn btn-primary">Eğitime Git</a>
        </div>`;
      return;
    }

    const questions = App.loadQuiz();
    const answers = new Array(questions.length).fill(null);
    let idx = 0;

    function renderQuestion() {
      const q = questions[idx];
      host.innerHTML = `
        <div class="quiz-card">
          <div class="quiz-progress">
            <span>Soru ${idx + 1} / ${questions.length}</span>
            <span>Geçme notu: %${PASS_THRESHOLD}</span>
          </div>
          <div class="training-progress mb-lg">
            <div class="training-progress-bar" style="width:${((idx + 1) / questions.length) * 100}%"></div>
          </div>
          <h3 class="quiz-question">${q.question}</h3>
          <form data-q-form>
            ${q.options.map((opt, i) => `
              <label class="quiz-option">
                <input type="radio" name="answer" value="${i}" ${answers[idx] === i ? 'checked' : ''}>
                <span>${opt}</span>
              </label>`).join('')}
            <div class="flex-between" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-ghost" data-prev ${idx === 0 ? 'disabled' : ''}>← Önceki</button>
              <button type="submit" class="btn btn-primary">
                ${idx === questions.length - 1 ? 'Sınavı Bitir' : 'Sonraki →'}
              </button>
            </div>
          </form>
        </div>`;
      host.querySelector('[data-prev]')?.addEventListener('click', () => {
        const chosen = host.querySelector('input[name="answer"]:checked');
        if (chosen) answers[idx] = Number(chosen.value);
        idx--; renderQuestion();
      });
      host.querySelector('[data-q-form]').addEventListener('submit', e => {
        e.preventDefault();
        const chosen = host.querySelector('input[name="answer"]:checked');
        if (!chosen) { alert('Lütfen bir seçenek işaretleyin.'); return; }
        answers[idx] = Number(chosen.value);
        if (idx === questions.length - 1) finish();
        else { idx++; renderQuestion(); }
      });
    }

    function finish() {
      const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= PASS_THRESHOLD;

      const results = App.Storage.get(App.Storage.keys.QUIZ_RESULTS, {});
      results[user.id] = { score, passed, takenAt: new Date().toISOString() };
      App.Storage.set(App.Storage.keys.QUIZ_RESULTS, results);

      if (passed) {
        const apps = App.Storage.get(App.Storage.keys.APPLICATIONS, []);
        const app = apps.find(a => a.userId === user.id);
        if (app) {
          app.trainingDone = true;
          app.quizScore = score;
          App.Storage.set(App.Storage.keys.APPLICATIONS, apps);
        }
      }

      host.innerHTML = `
        <div class="quiz-card quiz-result">
          <div class="quiz-score">%${score}</div>
          <h2 class="mb-sm">${passed ? '🎉 Tebrikler, başardınız!' : '😕 Maalesef geçemediniz'}</h2>
          <p class="text-muted mb-lg">
            ${correct}/${questions.length} doğru cevap verdiniz.
            ${passed
              ? 'Başvurunuz admin onayına iletildi. Onaylandığında mentör listesinde yer alacaksınız.'
              : `Geçme notu %${PASS_THRESHOLD}. Eğitimi tekrar gözden geçirip sınava tekrar girebilirsiniz.`}
          </p>
          <div class="flex" style="justify-content:center; gap:1rem;">
            ${passed
              ? `<a href="dashboard.html" class="btn btn-primary">Panele Dön</a>`
              : `<a href="training.html" class="btn btn-outline">Eğitime Dön</a>
                 <button class="btn btn-primary" onclick="location.reload()">Tekrar Dene</button>`}
          </div>
        </div>`;
    }

    renderQuestion();
  };
})(window.App);
