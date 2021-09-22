// -----------------
// utility functions
// -----------------
const makeId = () => `id-${Math.random().toString(16).slice(7)}`;
const getRandom = () => Math.round(Math.random() * 100) / 100;
const getFromRange = (range, pct) => range[0] + (range[1] - range[0]) * pct;
const getFrameVelocity = (speed, fps) => speed / fps;
const setElementStyles = (element, styles = {}) => {
  Object.assign(element.style, styles);
}

// --------------
// dom references
// --------------
const gameElement = document.querySelector('.game');
const dotsElement = document.querySelector('.dots');
const scoreElement = document.querySelector('.score');
const fpsElement = document.querySelector('.fps');
const sliderElement = document.querySelector('.slider');
const buttonElement = document.querySelector('.btn');
const buttonLabelElement = buttonElement.querySelector('span');

// -------------
// game settings
// -------------
const points = [1, 10];
const sizes = [10, 100];
const speeds = [10, 100];
const bonsuMultiplier = 10;
const bonusDotIntervalDuration = 10000;
const bonusRoundTimeoutDuration = 5000;
const bonusDotSpeed = 5;
const dotSpeedInBonus = 3;
const gameViewport = {
  width: dotsElement?.clientWidth || 0,
  height: dotsElement?.clientHeight || 0
};

// --------------
// game variables
// --------------
let rafId;
let flashId;
let bonusDotIntervalId;
let bonusRoundTimeoutId;
let dots = [];
let score = 0;
let speedPct = .5;
let speed;
let startTimestamp;
let ticks;
let inBonus = false;

// ---------
// dot class
// ---------
class Dot {
  constructor({id, pct, onRemoveDot, onScore}) {
    this.id = id;
    this.pct = pct;
    this.dotVariant = Math.round(getRandom() * 2);
    this.onRemoveDot = onRemoveDot;
    this.onScore = onScore.bind(this);
    this.popped = false;
    this.size = Math.round(getFromRange(sizes, pct));
    this.x = getFromRange([0, gameViewport.width - this.size], getRandom());
    // extra 24px for the dropshow y offset and blur
    this.y = 0 - this.size - 24; 
    this.element = this.createElement();
  }
  
  createElement() {
    const element = document.createElement('div');
    element.classList.add('dot', `dot--${this.dotVariant}`);
    element.innerHTML = `
            <div class="dot__graphic"></div>
    `;
    setElementStyles(element, {
        width: `${this.size}px`,
        height: `${this.size}px`,
        transform: `translate(${this.x}px, ${this.y}px)`,
    });
    element.setAttribute('data-id', this.id);
    element.addEventListener('mousedown', this.pop);
    element.addEventListener('touchstart', this.pop, {passive: true});
    return element;
  }
  
  removeDot() {
      this.element.removeEventListener('mousedown', this.pop);
      this.element.removeEventListener('touchstart', this.pop);
      this.onRemoveDot(this.id, this.element);
  }

  pop = (e) => {
      e.preventDefault();
      this.popped = true;
      this.onPop();
      this.element.classList.add('popped');
      this.timeoutId = setTimeout(() => {
          this.removeDot();
      }, 400);
  }
  
  onPop() {
    this.onScore(this.pct, this.dotVariant);
  }

  onUpdate(speed) {
    if (!this.popped) {
      this.y += speed;
      if (this.y > gameViewport.height && this.removeDot) {
        this.removeDot();
      }
      else {
        setElementStyles(this.element, {
            transform: `translate(${this.x}px, ${this.y}px)`,
        });
      }
    } 
  }
}

// ---------------
// bonus dot class
// ---------------
class BonusDot extends Dot {
  constructor({id, pct, onRemoveDot, onScore, onBonus}) {
    super({id, pct: .5, onRemoveDot, onScore});
    this.dotVariant = 3;
    this.x = gameViewport.width / 2 - this.size / 2;
    this.onBonus = onBonus;
    this.element = this.createBonusElement();
  }
  
  onPop() {
    this.onBonus();
  }
  
  createBonusElement = () => {
    const element = super.createElement();
    element.classList.remove('dot--0', 'dot--1', 'dot--2');
    element.classList.add('dot--bonus');
    return element; 
  }
  
  onUpdate(speed) {
    if (!this.popped) {
      this.y += bonusDotSpeed;
      const half = gameViewport.width / 2 - this.size / 2;
      const x = Math.sin(this.y / half) * half + half;
      if (this.y > gameViewport.height && this.removeDot) {
        this.removeDot();
      }
      else {
        setElementStyles(this.element, {
            transform: `translate(${x}px, ${this.y}px)`,
        });
      }
    }
  }
}

// --------------------------
// game modification functions
// --------------------------

// adds dot, regular or bonus
const addDot = (DotType, properties) => {
    const dot = new DotType({
      id: makeId(), 
      pct: getRandom(),
      onRemoveDot,
      onScore,
      ...(properties && properties)
    });
    dotsElement.appendChild(dot.element);
    dots.push(dot);
}

// starts the interval to display the bonus dot
const startBonusDotInterval = () => {
  clearInterval(bonusDotIntervalId);
  bonusDotIntervalId = setInterval(() => {
    addDot(BonusDot, {onBonus});
  }, bonusDotIntervalDuration);
}

// on score callback
const onScore = (pct, dotVariant) => {
    const _score = Math.round(getFromRange(points, (1 - pct)));
    score += _score * (inBonus ? bonsuMultiplier : 1);
    scoreElement.textContent = score;
    gameElement.classList.remove('game--on-score-0', 'game--on-score-1', 'game--on-score-2', 'game--on-score-3');
    cancelAnimationFrame(flashId);
    flashId = requestAnimationFrame(() => {
      gameElement.classList.add(`game--on-score-${inBonus ? '3' : dotVariant}`);
    })
}

// on bonus dot click callback
const onBonus = () => {
    clearInterval(bonusDotIntervalId);
    inBonus = true;
    cancelAnimationFrame(flashId);    
    gameElement.classList.remove('game--on-score-0', 'game--on-score-1', 'game--on-score-2', 'game--on-score-3');
    flashId = requestAnimationFrame(() => {
      gameElement.classList.add('game--on-score-3', 'game--in-bonus');
    });
    // start bonus round timeout
    bonusRoundTimeoutId = setTimeout(() => {
      inBonus = false;
      bonusRoundTimeoutId = null;
      gameElement.classList.remove('game--in-bonus');
      startBonusDotInterval();
    }, bonusRoundTimeoutDuration);
}

// on dot removed callback
const onRemoveDot = (id, element) => {
  if (element?.parentNode) {
    element.parentNode.removeChild(element);
  }
  dots = dots.filter((dot) => id !== dot.id);
}


// ---------
// game loop
// ---------

// animation frame update
const onFrame = (timestamp) => {
  const _speed = inBonus
    ? dotSpeedInBonus
    : speed;
  dots.forEach((dot) => {
      dot.onUpdate(_speed);
  });
}

// animation frame based 1000ms interval update
const onInterval = (ticks) => {
  addDot(Dot);
  speed = getFrameVelocity(getFromRange(speeds, speedPct), ticks);
  fpsElement.textContent = `fps: ${ticks}`;
}

// main animation frame handler
const step = (timestamp) => {
  // store timestamp (for interval checking)
  // and frame ticks (for fps monitoring)
  if (!startTimestamp) {
    ticks = 0;
    startTimestamp = timestamp
  }
  // check to see if we are at interval time (1000ms)
  // this could be done with a separate set interval
  if (timestamp - startTimestamp >= 1000) {
    // invoke interval update
    onInterval(ticks);
    // reset timestamp
    startTimestamp = 0;
  } else {
    // increment frame tick count
    ticks++;
  }
  // invoke frame update
  onFrame(timestamp);
  // invoke animation frame for next step
  rafId = requestAnimationFrame(step);
}

// start function
const start = () => {
  rafId = requestAnimationFrame(step);
  onInterval(60);
  buttonLabelElement.textContent = "Pause";
  gameElement.classList.remove('game--paused');
  gameElement.classList.add('game--playing');
  startBonusDotInterval();
}

// stop function
const stop = () => {
  cancelAnimationFrame(rafId);
  clearInterval(bonusDotIntervalId);
  clearTimeout(bonusRoundTimeoutId);
  rafId = null;
  bonusDotIntervalId = null;
  bonusRoundTimeoutId = null;
  startTimestamp = 0;
  inBonus = false;
  gameElement.classList.remove('game--in-bonus');
  buttonLabelElement.textContent = "Start";
  gameElement.classList.remove('game--playing');
  gameElement.classList.add('game--paused');
}

// ----------------------
// element input handlers
// ----------------------
buttonElement.addEventListener('click', () => {
  if (rafId) {
    stop()
  } else {
    start();
  }
});

sliderElement.addEventListener('input', (e) => {
    speedPct = e.target.value / 100;
    speed = getFrameVelocity(getFromRange(speeds, speedPct), 60);
})

//----------------------
// resize observer
//----------------------
const resizeObserver = new ResizeObserver(entries => {
  for (let entry of entries) {
    if(entry.contentBoxSize) {
      const {inlineSize, blockSize} = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
      gameViewport.width = inlineSize;
      gameViewport.height = blockSize;
    } else {
      const {width, height} = entry.contentRect;
      gameViewport.width = width;
      gameViewport.height = height;
    }
  }
});

resizeObserver.observe(dotsElement);