(function(){
  'use strict';
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  }
  ready(function(){
    var slider = document.querySelector('.home-slider');
    if(!slider) return;
    var slides = Array.from(slider.querySelectorAll('img'));
    if(slides.length === 0) return;

    // Init: show first
    var current = 0;
    slides.forEach(function(s, i){ s.classList.toggle('active', i===0); });

    // Auto rotate
    var intervalMs = 4000; // 4s
    var timerId = null;
    function start(){ if(timerId) return; timerId = setInterval(next, intervalMs); toggleBtnState(true); }
    function stop(){ if(!timerId) return; clearInterval(timerId); timerId = null; toggleBtnState(false); }

    function show(i){
      slides[current].classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      syncDots();
    }
    function next(){ show(current+1); }
    function prev(){ show(current-1); }

    // Controls
    var btnPrev = slider.querySelector('.slider-btn.prev');
    var btnNext = slider.querySelector('.slider-btn.next');
    var btnToggle = slider.querySelector('.slider-btn.toggle');
    var dotsWrap = slider.querySelector('.slider-dots');

    // Build dots
    var dots = [];
    if(dotsWrap){
      dotsWrap.innerHTML = '';
      slides.forEach(function(_, idx){
        var d = document.createElement('button');
        d.className = 'slider-dot' + (idx===0 ? ' active' : '');
        d.type = 'button';
        d.setAttribute('aria-label', 'Chuyển tới banner ' + (idx+1));
        d.addEventListener('click', function(){ stop(); show(idx); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    function syncDots(){
      if(!dots || !dots.length) return;
      dots.forEach(function(d,i){ d.classList.toggle('active', i===current); });
    }

    if(btnPrev) btnPrev.addEventListener('click', function(){ prev(); });
    if(btnNext) btnNext.addEventListener('click', function(){ next(); });
    if(btnToggle){
      btnToggle.addEventListener('click', function(){
        if(timerId){
          stop();
        } else {
          start();
        }
      });
    }

    function toggleBtnState(running){
      if(!btnToggle) return;
      var icon = btnToggle.querySelector('i');
      var label = btnToggle.querySelector('span');
      if(running){
        if(icon){ icon.className = 'fa-regular fa-pause'; }
        if(label){ label.textContent = ' Dừng'; }
        btnToggle.setAttribute('aria-label','Dừng');
      } else {
        if(icon){ icon.className = 'fa-regular fa-play'; }
        if(label){ label.textContent = ' Phát'; }
        btnToggle.setAttribute('aria-label','Phát');
      }
    }

    // Keyboard support: left/right arrows
    slider.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ prev(); }
      else if(e.key === 'ArrowRight'){ next(); }
    });
    slider.setAttribute('tabindex','0');

    // Start autoplay by default
    start();

    // Expose for debugging
    window.__slider = { start: start, stop: stop, next: next, prev: prev };
  });
})();
