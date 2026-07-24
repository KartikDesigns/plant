(function initPlantQuiz() {
  const questions = [
    { q: "How much sunlight does your space get?", sub: "This is the most important factor for plant health.", options: [ { icon: "☀️", label: "Bright, direct sun", value: "sunny", desc: "South-facing window or balcony" }, { icon: "⛅", label: "Bright, indirect light", value: "bright", desc: "Near a window but not direct" }, { icon: "🌤️", label: "Low light", value: "low", desc: "North-facing or away from windows" }, { icon: "💡", label: "Artificial light only", value: "artificial", desc: "Office or room without windows" } ] },
    { q: "How often can you water your plant?", sub: "Be honest — this determines which plants will thrive with you.", options: [ { icon: "💧", label: "Daily or every other day", value: "frequent", desc: "I love tending to my plants" }, { icon: "📅", label: "Once a week", value: "weekly", desc: "I can stick to a schedule" }, { icon: "⏰", label: "Every 2-3 weeks", value: "rarely", desc: "I sometimes forget" }, { icon: "🏜️", label: "Once a month or less", value: "never", desc: "I want a low-maintenance plant" } ] },
    { q: "What size plant are you looking for?", sub: "Think about where you want to place it.", options: [ { icon: "🪴", label: "Small (desktop)", value: "small", desc: "Sits on a desk or shelf" }, { icon: "🌿", label: "Medium (floor)", value: "medium", desc: "Floor plant, 2-4 feet tall" }, { icon: "🌴", label: "Large (statement)", value: "large", desc: "Makes a bold impression" }, { icon: "🪢", label: "Hanging / Trailing", value: "hanging", desc: "Hangs from ceiling or shelf" } ] },
    { q: "Do you have pets at home?", sub: "Some plants can be toxic to cats and dogs.", options: [ { icon: "🐱", label: "Yes, I have pets", value: "pets", desc: "Need pet-safe plants only" }, { icon: "🐶", label: "No pets", value: "nopets", desc: "Any plant is fine" } ] },
    { q: "What's your experience level?", sub: "Everyone starts somewhere!", options: [ { icon: "🌱", label: "Complete beginner", value: "beginner", desc: "Never kept a plant alive" }, { icon: "🌻", label: "Some experience", value: "intermediate", desc: "I've kept plants before" }, { icon: "🌳", label: "Green thumb", value: "expert", desc: "Plants thrive under my care" } ] }
  ];

  const plants = [
    { name: "Snake Plant", price: "₹22.00", category: "Indoor Plant", badge: "Bestseller",image: "../assets/white_background_202607131940.jpeg",
    care: "Low to bright indirect light, water every 2-3 weeks",
    link: "shop.html", match: function(answers) { return (answers[0] === 'low' || answers[0] === 'artificial') && (answers[1] === 'rarely' || answers[1] === 'never'); }},
    { name: "Spider Plant", price: "₹20.00", category: "Indoor Plant", badge: "Pet Friendly",image: "../assets/Spider_Plant_white_background_202607131940.jpeg",
    care: "Bright indirect light, water weekly",
    link: "shop.html", match: function(answers) { return answers[3] === 'pets' && answers[4] === 'beginner'; }},
    { name: "Syngonium", price: "₹18.00", category: "Indoor Plant", badge: "Trending",image: "../assets/Syngonium_white_background_202607131940.jpeg",
    care: "Low to bright indirect light, water when dry",
    link: "shop.html", match: function(answers) { return (answers[0] === 'bright' || answers[0] === 'low') && answers[2] === 'hanging'; }},
    { name: "ZZ Plant", price: "₹35.00", category: "Indoor Plant", badge: "Nearly Unkillable",image: "../assets/ZZ_Plant_white_background_202607131940.jpeg",
    care: "Thrives in low light, water every 3-4 weeks",
    link: "shop.html", match: function(answers) { return (answers[0] === 'low' || answers[0] === 'artificial') && (answers[1] === 'rarely' || answers[1] === 'never') && answers[3] === 'nopets'; }},
    { name: "Peace Lily", price: "₹28.00", category: "Indoor Plant", badge: "Premium",image: "../assets/Peace_Lily_white_background_202607131940.jpeg",
    care: "Low to medium indirect light, water weekly",
    link: "shop.html", match: function(answers) { return answers[0] === 'bright' && answers[2] === 'medium' && (answers[4] === 'intermediate' || answers[4] === 'expert'); }},
    { name: "Jade Plant", price: "₹25.00", category: "Succulent", badge: "Popular",image: "../assets/Jade_Plant_white_background_202607131940.jpeg",
    care: "Bright indirect to direct sun, water every 2-3 weeks",
    link: "shop.html", match: function(answers) { return answers[0] === 'sunny' && (answers[1] === 'weekly' || answers[1] === 'rarely') && answers[2] === 'small'; }},
    { name: "Haworthia", price: "₹20.00", category: "Succulent", badge: "Trending",image: "../assets/Haworthia_white_background_202607131940.jpeg",
    care: "Bright indirect light, water every 3 weeks",
    link: "shop.html", match: function(answers) { return answers[0] === 'bright' && answers[1] === 'rarely' && answers[2] === 'small'; }},
    { name: "Kalanchoe", price: "₹22.00", category: "Succulent", badge: "Popular",image: "../assets/Kalanchoe_white_background_202607131940.jpeg",
    care: "Bright direct to indirect sun, water every 2 weeks",
    link: "shop.html", match: function(answers) { return answers[0] === 'sunny' && answers[1] === 'weekly' && answers[4] === 'beginner'; }},
    { name: "Adenium", price: "₹35.00", category: "Succulent", badge: "Premium",image: "../assets/Adenium_white_background_202607131940.jpeg",
    care: "Full sun, water weekly in summer",
    link: "shop.html", match: function(answers) { return answers[0] === 'sunny' && answers[1] === 'frequent' && (answers[4] === 'intermediate' || answers[4] === 'expert'); }},
    { name: "Portulaca", price: "₹15.00", category: "Succulent", badge: "Bestseller",image: "../assets/Portulaca_white_background_202607131940.jpeg",
    care: "Full sun, water every 2-3 days",
    link: "shop.html", match: function(answers) { return answers[0] === 'sunny' && answers[1] === 'frequent' && answers[4] === 'beginner'; }}
  ];

  let currentStep = 0;
  let answers = {};

  const questionText = document.getElementById('question-text');
  const questionSub = document.getElementById('question-sub');
  const optionsContainer = document.getElementById('options-container');
  const btnNext = document.getElementById('btn-next');
  const progressBar = document.getElementById('quiz-progress-bar');
  const questionArea = document.getElementById('question-area');
  const resultArea = document.getElementById('result-area');

  function renderQuestion() {
    const q = questions[currentStep];
    questionText.textContent = q.q;
    questionSub.textContent = q.sub;
    btnNext.disabled = true;

    optionsContainer.innerHTML = q.options.map((opt, i) => `
      <div class="col-md-6 col-12">
        <div class="quiz-option" data-value="${opt.value}" data-index="${i}">
          <span class="icon">${opt.icon}</span>
          <div class="text-label-md fw-bold text-on-surface mb-1">${opt.label}</div>
          <div class="text-label-sm text-on-surface-variant">${opt.desc}</div>
        </div>
      </div>
    `).join('');

    optionsContainer.querySelectorAll('.quiz-option').forEach(el => {
      el.addEventListener('click', function() {
        optionsContainer.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        answers[currentStep] = this.dataset.value;
        btnNext.disabled = false;
      });
    });

    const pct = ((currentStep) / questions.length) * 100;
    progressBar.style.width = pct + '%';
  }

  function showResult() {
    questionArea.classList.add('d-none');
    resultArea.classList.remove('d-none');
    progressBar.style.width = '100%';

    let bestPlant = null;
    let bestScore = -1;

    plants.forEach(plant => {
      try {
        if (plant.match(answers)) {
          const score = Math.floor(Math.random() * 5) + 3;
          if (score > bestScore) {
            bestScore = score;
            bestPlant = plant;
          }
        }
      } catch(e) {}
    });

    if (!bestPlant) {
      bestPlant = plants[0]; // Pothos as default (first available plant)
    }

    document.getElementById('result-image').src = bestPlant.image;
    document.getElementById('result-image').alt = bestPlant.name;
    document.getElementById('result-name').textContent = bestPlant.name;
    document.getElementById('result-badge').textContent = bestPlant.badge;
    document.getElementById('result-price').textContent = bestPlant.price;
    document.getElementById('result-care').textContent = bestPlant.care;
    document.getElementById('result-description').innerHTML = `Based on your answers, we recommend the <strong>${bestPlant.name}</strong>!`;
    document.getElementById('result-shop-link').href = bestPlant.link;

    setTimeout(() => resultArea.classList.add('show'), 100);

    const colors = ['#4A7C59', '#D4A24C', '#C1623B', '#2D5A3E', '#A8D5B0'];
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '40%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (4 + Math.random() * 8) + 'px';
      piece.style.height = (4 + Math.random() * 8) + 'px';
      piece.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      piece.style.animationDelay = (Math.random() * 1.5) + 's';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  btnNext.addEventListener('click', function() {
    if (currentStep < questions.length - 1) {
      currentStep++;
      renderQuestion();
    } else {
      showResult();
    }
  });

  document.getElementById('result-retake').addEventListener('click', function() {
    currentStep = 0;
    answers = {};
    resultArea.classList.remove('show', 'd-none');
    questionArea.classList.remove('d-none');
    resultArea.classList.add('d-none');
    renderQuestion();
  });

  renderQuestion();
})();
