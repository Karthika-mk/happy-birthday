/* ===========================
   Birthday Gift Site: little bits of magic
   - Confetti on the surprise button
   - Background music (Happy Birthday, played by the browser)
   - Candle you can blow out (Wishes page)
   - Coupons you can redeem (Fun page)
   - Countdown to the next birthday (Letter page)
   =========================== */

(function () {
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Safe localStorage helpers (private windows can block storage)
  function getStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setStore(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /* ---------- Confetti ---------- */
  var colors = ["#C7644A", "#FCD7B6", "#F4A261", "#FFD166", "#E07A5F"];

  function confetti(count) {
    if (reduceMotion) return;
    for (var i = 0; i < count; i++) {
      var piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      piece.style.setProperty("--drift", Math.random() * 160 - 80 + "px");
      if (Math.random() < 0.4) piece.style.borderRadius = "50%";
      piece.addEventListener("animationend", function () { this.remove(); });
      document.body.appendChild(piece);
    }
  }

  var surprise = document.querySelector("[data-surprise]");
  if (surprise) {
    surprise.addEventListener("click", function (e) {
      if (reduceMotion) return;
      e.preventDefault();
      confetti(150);
      var href = this.href;
      setTimeout(function () { window.location.href = href; }, 1500);
    });
  }

  /* ---------- Background music ---------- */
  var notes = {
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25,
    D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
  };
  var song = [
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
    ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3]
  ];
  var beat = 0.5;
  var audio = null;
  var loopTimer = null;

  var musicBtn = document.createElement("button");
  musicBtn.type = "button";
  musicBtn.className = "music-toggle";
  musicBtn.textContent = "♪";
  musicBtn.title = "Play music";
  musicBtn.setAttribute("aria-label", "Play birthday music");
  musicBtn.setAttribute("aria-pressed", "false");
  document.body.appendChild(musicBtn);

  function playSongOnce() {
    var t = audio.currentTime + 0.05;
    song.forEach(function (n) {
      var dur = n[1] * beat;
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[n[0]];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    });
    return (t - audio.currentTime) * 1000;
  }

  function loopSong() {
    var ms = playSongOnce();
    loopTimer = setTimeout(loopSong, ms + 1500);
  }

  function startMusic() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio) audio = new AC();
    audio.resume();
    clearTimeout(loopTimer);
    loopSong();
    musicBtn.classList.add("playing");
    musicBtn.setAttribute("aria-pressed", "true");
    musicBtn.title = "Pause music";
    setStore("music", "on");
  }

  function stopMusic() {
    clearTimeout(loopTimer);
    if (audio) { audio.close(); audio = null; }
    musicBtn.classList.remove("playing");
    musicBtn.setAttribute("aria-pressed", "false");
    musicBtn.title = "Play music";
    setStore("music", "off");
  }

  musicBtn.addEventListener("click", function () {
    if (audio) stopMusic(); else startMusic();
  });

  // If music was on on the last page, resume it on the first tap or key press
  // (browsers don't allow sound before the visitor interacts with the page)
  if (getStore("music") === "on") {
    var resume = function (e) {
      if (e.target === musicBtn) return;
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
      if (!audio) startMusic();
    };
    document.addEventListener("pointerdown", resume);
    document.addEventListener("keydown", resume);
  }

  /* ---------- Candle (Wishes page) ---------- */
  var candle = document.querySelector("[data-candle]");
  if (candle) {
    var wishes = document.querySelector("[data-wishes]");
    var hint = document.querySelector("[data-candle-hint]");
    wishes.classList.add("locked");
    candle.addEventListener("click", function () {
      if (candle.classList.contains("out")) return;
      candle.classList.add("out");
      candle.setAttribute("aria-pressed", "true");
      hint.textContent = "Wish made! Here's what I wish for you ✨";
      wishes.classList.remove("locked");
      confetti(110);
    });
  }

  /* ---------- Coupons (Fun page): unlimited redeems ---------- */
  var coupons = document.querySelectorAll("[data-coupon]");
  Array.prototype.forEach.call(coupons, function (coupon) {
    var id = coupon.getAttribute("data-coupon");
    var btn = coupon.querySelector("button");
    var counter = document.createElement("span");
    counter.className = "coupon-count";
    counter.setAttribute("aria-live", "polite");
    coupon.appendChild(counter);

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "coupon-reset";
    resetBtn.textContent = "↺ Reset";
    resetBtn.setAttribute("aria-label", "Reset this coupon's count");
    coupon.appendChild(resetBtn);

    var count = parseInt(getStore("coupon-" + id), 10) || 0;

    function render() {
      if (count > 0) {
        coupon.classList.add("redeemed");
        counter.textContent = "Used " + count + (count === 1 ? " time" : " times");
        btn.textContent = "Redeem again ♥";
        resetBtn.hidden = false;
      } else {
        coupon.classList.remove("redeemed");
        counter.textContent = "";
        btn.textContent = "Redeem";
        resetBtn.hidden = true;
      }
    }

    render();
    btn.addEventListener("click", function () {
      count += 1;
      setStore("coupon-" + id, String(count));
      render();
      confetti(40);
    });
    resetBtn.addEventListener("click", function () {
      count = 0;
      setStore("coupon-" + id, "0");
      render();
      btn.focus();
    });
  });

  /* ---------- Countdown (Letter page) ---------- */
  var countdown = document.querySelector("[data-countdown]");
  if (countdown) {
    var month = parseInt(countdown.getAttribute("data-month"), 10) - 1;
    var day = parseInt(countdown.getAttribute("data-day"), 10);
    var units = {
      days: countdown.querySelector("[data-unit=days]"),
      hours: countdown.querySelector("[data-unit=hours]"),
      minutes: countdown.querySelector("[data-unit=minutes]"),
      seconds: countdown.querySelector("[data-unit=seconds]")
    };

    var nextBirthday = function () {
      var now = new Date();
      var target = new Date(now.getFullYear(), month, day);
      if (target <= now) target = new Date(now.getFullYear() + 1, month, day);
      return target;
    };

    var label = countdown.querySelector("p");
    var unitsBox = countdown.querySelector(".countdown-units");
    var normalText = label.textContent;

    var tick = function () {
      var now = new Date();
      // On the birthday itself, celebrate instead of counting down
      if (now.getMonth() === month && now.getDate() === day) {
        label.textContent = "It's your birthday today! 🎉";
        countdown.classList.add("today");
        unitsBox.hidden = true;
        return;
      }
      label.textContent = normalText;
      countdown.classList.remove("today");
      unitsBox.hidden = false;

      var diff = Math.max(0, nextBirthday() - now);
      var s = Math.floor(diff / 1000);
      units.days.textContent = Math.floor(s / 86400);
      units.hours.textContent = Math.floor((s % 86400) / 3600);
      units.minutes.textContent = Math.floor((s % 3600) / 60);
      units.seconds.textContent = s % 60;
    };

    tick();
    setInterval(tick, 1000);
  }
})();
