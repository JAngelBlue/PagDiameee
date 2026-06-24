const DATA_MAP = {
  historia_bolivia: "../data/historia_bolivia.json",
  historia_universal: "../data/historia_universal.json",
  constitucion: "../data/constitucion.json",
  filosofia: "../data/filosofia.json",
};

const STATE = {
  topic: null,
  mode: "quick",
  totalQuestions: 10,
  timeLeft: 600,
  questions: [],
  currentIndex: 0,
  selectedOption: null,
  locked: false,
  timerId: null,
  answers: [],
};

const els = {
  menuPanel: document.getElementById("menuPanel"),
  quizPanel: document.getElementById("quizPanel"),
  resultPanel: document.getElementById("resultPanel"),
  choices: Array.from(document.querySelectorAll(".choice")),
  modeSelect: document.getElementById("modeSelect"),
  startBtn: document.getElementById("startBtn"),
  quizTitle: document.getElementById("quizTitle"),
  quizMeta: document.getElementById("quizMeta"),
  timer: document.getElementById("timer"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
  questionText: document.getElementById("questionText"),
  options: document.getElementById("options"),
  answerFeedback: document.getElementById("answerFeedback"),
  nextBtn: document.getElementById("nextBtn"),
  finishBtn: document.getElementById("finishBtn"),
  scoreText: document.getElementById("scoreText"),
  percentText: document.getElementById("percentText"),
  topicText: document.getElementById("topicText"),
  modeText: document.getElementById("modeText"),
  reviewList: document.getElementById("reviewList"),
  restartBtn: document.getElementById("restartBtn"),
};

const TOPIC_LABELS = {
  historia_bolivia: "Historia de Bolivia",
  historia_universal: "Historia Universal",
  constitucion: "Constitución",
  filosofia: "Filosofía",
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function minutesLabel(mode) {
  return mode === "quick" ? "10 minutos" : "50 minutos";
}

function questionCount(mode) {
  return mode === "quick" ? 10 : 50;
}

function secondsForMode(mode) {
  return mode === "quick" ? 10 * 60 : 50 * 60;
}

function setPanel(view) {
  els.menuPanel.classList.toggle("hidden", view !== "menu");
  els.quizPanel.classList.toggle("hidden", view !== "quiz");
  els.resultPanel.classList.toggle("hidden", view !== "result");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadTopicQuestions(topic) {
  const response = await fetch(DATA_MAP[topic], { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${DATA_MAP[topic]}`);
  }
  const data = await response.json();
  return data;
}

function buildSampleFallback(topic) {
  const label = TOPIC_LABELS[topic];
  return [
    {
      id: 1,
      tema: label,
      pregunta: `Pregunta de ejemplo para ${label}. Reemplaza este archivo por el banco real de preguntas.`,
      opciones: ["Opción A", "Opción B", "Opción C", "Opción D"],
      correcta: 0,
      explicacion: "Este es un ejemplo temporal mientras se cargan las 933 preguntas.",
    },
    {
      id: 2,
      tema: label,
      pregunta: `Segunda pregunta de ejemplo para ${label}.`,
      opciones: ["Respuesta uno", "Respuesta dos", "Respuesta tres", "Respuesta cuatro"],
      correcta: 1,
      explicacion: "Ejemplo temporal.",
    },
    {
      id: 3,
      tema: label,
      pregunta: `Tercera pregunta de ejemplo para ${label}.`,
      opciones: ["Primera", "Segunda", "Tercera", "Cuarta"],
      correcta: 2,
      explicacion: "Ejemplo temporal.",
    },
    {
      id: 4,
      tema: label,
      pregunta: `Cuarta pregunta de ejemplo para ${label}.`,
      opciones: ["Primera", "Segunda", "Tercera", "Cuarta"],
      correcta: 3,
      explicacion: "Ejemplo temporal.",
    },
  ];
}

function pickQuestions(allQuestions, mode) {
  const total = questionCount(mode);
  const shuffled = shuffle(allQuestions);
  return shuffled.slice(0, Math.min(total, shuffled.length));
}

function renderQuestion() {
  const question = STATE.questions[STATE.currentIndex];
  STATE.locked = false;
  STATE.selectedOption = null;
  els.nextBtn.disabled = true;
  els.answerFeedback.textContent = "";
  els.answerFeedback.className = "answerFeedback";
  els.questionText.textContent = question.pregunta;

  els.progressText.textContent = `Pregunta ${STATE.currentIndex + 1} de ${STATE.questions.length}`;
  els.progressFill.style.width = `${((STATE.currentIndex) / STATE.questions.length) * 100}%`;

  els.options.innerHTML = "";
  const labels = ["A", "B", "C", "D"];

  question.opciones.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.dataset.index = String(index);
    btn.innerHTML = `<span class="label">${labels[index]}</span><span>${option}</span>`;
    btn.addEventListener("click", () => selectOption(index));
    els.options.appendChild(btn);
  });

  els.quizTitle.textContent = `Simulador - ${TOPIC_LABELS[STATE.topic]}`;
  els.quizMeta.textContent = `${STATE.questions.length} preguntas · ${minutesLabel(STATE.mode)}`;
}

function selectOption(index) {
  if (STATE.locked) return;

  const question = STATE.questions[STATE.currentIndex];
  STATE.selectedOption = index;
  STATE.locked = true;

  const buttons = Array.from(els.options.querySelectorAll(".option"));
  buttons.forEach((btn) => {
    const optionIndex = Number(btn.dataset.index);
    btn.classList.remove("selected", "correct", "wrong");

    if (optionIndex === question.correcta) {
      btn.classList.add("correct");
    }

    if (optionIndex === index) {
      btn.classList.add("selected");
      if (index === question.correcta) {
        btn.classList.add("correct");
      } else {
        btn.classList.add("wrong");
      }
    }
  });

  const isCorrect = index === question.correcta;
  STATE.answers.push({
    id: question.id,
    pregunta: question.pregunta,
    opciones: question.opciones,
    correcta: question.correcta,
    seleccionada: index,
    correctaTexto: question.opciones[question.correcta],
    seleccionadaTexto: question.opciones[index],
    tema: question.tema,
    explicacion: question.explicacion || "",
    isCorrect,
  });

  els.answerFeedback.textContent = isCorrect
    ? "Correcto. La opción marcada es la respuesta correcta."
    : `Incorrecto. La respuesta correcta es: ${question.opciones[question.correcta]}`;
  els.answerFeedback.className = `answerFeedback ${isCorrect ? "good" : "bad"}`;

  els.nextBtn.disabled = false;
}

function nextQuestion() {
  if (!STATE.locked) {
    alert("Selecciona una respuesta primero.");
    return;
  }

  if (STATE.currentIndex < STATE.questions.length - 1) {
    STATE.currentIndex += 1;
    renderQuestion();
    return;
  }

  finishExam();
}

function finishExam() {
  clearInterval(STATE.timerId);
  const correctCount = STATE.answers.filter((a) => a.isCorrect).length;
  const total = STATE.questions.length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;

  els.scoreText.textContent = `${correctCount}/${total}`;
  els.percentText.textContent = `${percent}%`;
  els.topicText.textContent = TOPIC_LABELS[STATE.topic];
  els.modeText.textContent = STATE.mode === "quick" ? "Rápido" : "Completo";

  els.reviewList.innerHTML = "";
  STATE.answers.forEach((answer, i) => {
    const item = document.createElement("div");
    item.className = `reviewItem ${answer.isCorrect ? "correctReview" : "wrongReview"}`;
    item.innerHTML = `
      <span class="tag ${answer.isCorrect ? "good" : "bad"}">
        ${answer.isCorrect ? "Correcta" : "Incorrecta"}
      </span>
      <h3>Pregunta ${i + 1}</h3>
      <p>${answer.pregunta}</p>
      <p><strong>Tu respuesta:</strong> ${answer.seleccionadaTexto}</p>
      <p><strong>Respuesta correcta:</strong> ${answer.correctaTexto}</p>
      ${answer.explicacion ? `<p><strong>Explicación:</strong> ${answer.explicacion}</p>` : ""}
    `;
    els.reviewList.appendChild(item);
  });

  setPanel("result");
}

function startTimer() {
  els.timer.textContent = formatTime(STATE.timeLeft);
  clearInterval(STATE.timerId);

  STATE.timerId = setInterval(() => {
    STATE.timeLeft -= 1;
    els.timer.textContent = formatTime(STATE.timeLeft);

    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timerId);
      finishExam();
    }
  }, 1000);
}

async function startExam() {
  if (!STATE.topic) return;

  STATE.mode = els.modeSelect.value;
  STATE.totalQuestions = questionCount(STATE.mode);
  STATE.timeLeft = secondsForMode(STATE.mode);
  STATE.currentIndex = 0;
  STATE.selectedOption = null;
  STATE.locked = false;
  STATE.answers = [];

  let allQuestions;
  try {
    allQuestions = await loadTopicQuestions(STATE.topic);
  } catch (err) {
    console.warn(err);
    allQuestions = buildSampleFallback(STATE.topic);
  }

  STATE.questions = pickQuestions(allQuestions, STATE.mode);

  if (!STATE.questions.length) {
    alert("No hay preguntas disponibles en esta materia.");
    return;
  }

  setPanel("quiz");
  renderQuestion();
  startTimer();
}

els.choices.forEach((btn) => {
  btn.addEventListener("click", () => {
    els.choices.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    STATE.topic = btn.dataset.topic;
    els.startBtn.disabled = false;
  });
});

els.startBtn.addEventListener("click", startExam);
els.nextBtn.addEventListener("click", nextQuestion);
els.finishBtn.addEventListener("click", finishExam);
els.restartBtn.addEventListener("click", () => {
  clearInterval(STATE.timerId);
  STATE.topic = null;
  STATE.mode = "quick";
  STATE.questions = [];
  STATE.answers = [];
  STATE.currentIndex = 0;
  STATE.locked = false;
  STATE.selectedOption = null;
  els.choices.forEach((b) => b.classList.remove("selected"));
  els.startBtn.disabled = true;
  els.modeSelect.value = "quick";
  els.timer.textContent = "10:00";
  setPanel("menu");
});
