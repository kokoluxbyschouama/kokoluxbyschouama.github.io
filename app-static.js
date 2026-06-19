/* ================================================
	   APP-STATIC.JS
	   Version statique de app.js, générée par build-dynamique.py.

	   La différence avec app.js :
	   - Plus de fetch() XML : le HTML contient déjà toutes les données
		 dans des attributs data- (zone-data, item-data).
	   - dataStore est construit en lisant le DOM au chargement.
	   - Toutes les animations canvas et l'audio sont conservés.
	   ================================================ */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ════════════════════════════════════════════
   CONFIGURATION (injectée par le build Python)
   ════════════════════════════════════════════ */

const ACT_IDS		 = ["kokolux", "actualites"];
const DEFAULT_ANIMATION = 3;
const NB_ANIMATIONS	 = 4;
const ANIMATION_FORCES  = { 1: 3, 2: 3, 3: 3, 4: 3 };
const AUDIO_ON		  = 1 === 1;
const DEBUG_ON		  = 1 === 1;

/* ════════════════════════════════════════════
   STOCKAGE DES DONNÉES
   Construit depuis les attributs data- du HTML
   au lieu d'être construit depuis le XML.
   ════════════════════════════════════════════ */

const dataStore   = {};
const state	   = {};
const currentType = {};

/* Parcoure tous les panneaux vitrine et lit les items
   stockés dans les divs .zone-data > .item-data */
function buildDataStore() {
	document.querySelectorAll('section[id]').forEach(section => {
		const actId = section.id;
		dataStore[actId] = {};
		state[actId]	 = {};
		currentType[actId] = null;
		section.querySelectorAll('.zone-data').forEach(zoneEl => {
			const zid = zoneEl.dataset.zone;
			dataStore[actId][zid] = [];
			zoneEl.querySelectorAll('.item-data').forEach(itemEl => {
				dataStore[actId][zid].push({
					title:	   itemEl.dataset.title	   || '',
					description: itemEl.dataset.description || '',
					image:	   itemEl.dataset.image	   || '',
					alt:		 itemEl.dataset.alt		 || ''
				});
			});
		});
	});
}

/* ════════════════════════════════════════════
   AUDIO
   ════════════════════════════════════════════ */

let currentAudio   = null;
let currentSound   = null;
let AUDIO_UNLOCKED = false;
let AUDIO_MUTED	= true;
let AUDIO_ENABLED  = AUDIO_ON;

const audioToggle = document.getElementById('audio-toggle');
const blobToggle  = document.getElementById('blob-toggle');

function playSectionSound(src) {
	if (!AUDIO_ENABLED || !src) return;
	if (currentSound === src && currentAudio) {
		if (AUDIO_UNLOCKED && !AUDIO_MUTED && currentAudio.paused)
			currentAudio.play().catch(() => {});
		return;
	}
	currentSound = src;
	if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
	currentAudio		 = new Audio(src);
	currentAudio.preload = 'auto';
	currentAudio.loop	= true;
	currentAudio.volume  = 0.6;
	if (!AUDIO_UNLOCKED || AUDIO_MUTED) return;
	currentAudio.play().catch(() => {});
}

function unlockAudio()  { if (AUDIO_UNLOCKED) return; AUDIO_UNLOCKED = true; }
function enableAudio()  { if (!AUDIO_ENABLED) return; unlockAudio(); AUDIO_MUTED = false; if (currentAudio) currentAudio.play().catch(() => {}); updateAudioButton(); removeAudioOverlay(); }
function disableAudio() { AUDIO_MUTED = true; if (currentAudio) currentAudio.pause(); updateAudioButton(); }
function toggleAudio()  { if (!AUDIO_UNLOCKED) { enableAudio(); return; } if (AUDIO_MUTED) enableAudio(); else disableAudio(); }

function updateAudioButton() {
	const btn = document.getElementById('audio-toggle');
	if (!btn) return;
	btn.innerHTML = AUDIO_MUTED
		? '<i class="fa-solid fa-volume-xmark" style="color: rgb(116, 163, 9);"></i>'
		: '<i class="fa-solid fa-music"		style="color: rgb(139, 92, 246);"></i>';
}

function createAudioOverlay() {
	if (!AUDIO_ENABLED) return;
	if (document.getElementById('audio-unlock-overlay')) return;
	const overlay		 = document.createElement('div');
	overlay.id			= 'audio-unlock-overlay';
	overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:transparent;';
	document.body.appendChild(overlay);
	overlay.addEventListener('click',	  () => enableAudio(), { once: true });
	overlay.addEventListener('touchstart', () => enableAudio(), { once: true });
}

function removeAudioOverlay() { document.getElementById('audio-unlock-overlay')?.remove(); }

if (AUDIO_ENABLED && audioToggle) {
	audioToggle.classList.remove('hidden');
	updateAudioButton();
	audioToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleAudio(); });
}

/* ════════════════════════════════════════════
   NAVIGATION : SCROLL ANIMÉ VERS UNE SECTION
   ════════════════════════════════════════════ */

/* Récupère le son associé à une section via son attribut data-sound. */
function getSectionSound(sectionId) {
	const el = document.getElementById(sectionId);
	return el ? (el.dataset.sound || null) : null;
}

function goToSection(sectionId, soundSrc = null) {
	if (!soundSrc) soundSrc = getSectionSound(sectionId);
	if (document.activeElement) document.activeElement.blur();
	const target = window.innerWidth < 1024 && sectionId !== 'hero'
		? document.getElementById(sectionId + '-subtitle')
		: document.getElementById(sectionId + '-anchor');
	if (!target) return;
	if (soundSrc) playSectionSound(soundSrc);
	if (ANIMATION_ENABLED && CURRENT_ANIMATION !== 0 && !window.__WARMUP_RUNNING__)
		nextAnimationSection();
	gsap.killTweensOf(window);
	requestAnimationFrame(() => {
		const offset = window.innerWidth < 1024 ? 10 : 20;
		const y	  = target.getBoundingClientRect().top + window.scrollY;
		gsap.to(window, { duration: 1.2, scrollTo: { y: y - offset, autoKill: false }, ease: 'power2.inOut' });
	});
}

/* Branche le bouton héro sur la 1ère activité. */
document.getElementById('hero-button')?.addEventListener('click', () => {
	goToSection(ACT_IDS[0]);
});

/* ════════════════════════════════════════════
   AFFICHAGE DU CONTENU D'UNE ZONE
   Identique à app.js, mais lit dataStore
   construit depuis le DOM (pas depuis le XML).
   ════════════════════════════════════════════ */

function buildWaLink(actId) {
	const panel  = document.querySelector('#' + actId + '-nav')?.parentElement;
	const base   = panel?.dataset.waBase   || '';
	const prefix = panel?.dataset.waPrefix || '';
	const suffix = panel?.dataset.waSuffix || '';
	const title  = document.getElementById(actId + '-title')?.innerText || '';
	return base + '?text=' + encodeURIComponent(prefix + title + suffix);
}

function changeContent(section, type, direction = 0) {
	if (!type || !dataStore[section] || !dataStore[section][type]) return;
	currentType[section] = type;
	const nav = document.getElementById(section + '-nav');
	nav.classList.remove('hidden');
	nav.classList.add('flex');
	const panel = nav.parentElement;
	if (window.innerWidth < 1024) { panel.style.aspectRatio = 'auto'; panel.style.minHeight = '400px'; }
	gsap.killTweensOf('#' + section + '-nav');
	gsap.fromTo('#' + section + '-nav', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, overwrite: 'auto' });
	if (!state[section])					state[section]	   = {};
	if (state[section][type] === undefined) state[section][type] = 0;
	const items = dataStore[section][type];
	if (direction !== 0) {
		state[section][type] += direction;
		if (state[section][type] < 0)			 state[section][type] = items.length - 1;
		if (state[section][type] >= items.length) state[section][type] = 0;
	}
	const current	  = items[state[section][type]];
	const currentIndex = state[section][type];
	document.getElementById(section + '-prev').style.visibility = currentIndex === 0				? 'hidden' : 'visible';
	document.getElementById(section + '-next').style.visibility = currentIndex === items.length - 1 ? 'hidden' : 'visible';
	document.getElementById(section + '-content').innerHTML = `
		<div class="w-full">
			<div id="${section}-image"
				class="dynamic-image rounded-[3rem] h-[180px] sm:h-[220px] md:h-[320px] mb-1 sm:mb-8"
				style="background-image:url('${current.image}')"
				role="img" aria-label="${current.alt}"></div>
			<div class="space-y-2 sm:space-y-4 px-4 sm:px-8">
				<h3 id="${section}-title" class="text-3xl sm:text-4xl font-light">${current.title}</h3>
				<div id="${section}-description" class="text-[#B7B0A7] text-lg leading-relaxed">${current.description}</div>
			</div>
		</div>`;
	gsap.fromTo('#' + section + '-image', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 1 });
}

/* ════════════════════════════════════════════
   OBSERVATEUR AUDIO PAR SECTION
   ════════════════════════════════════════════ */

function initSectionAudioObserver() {
	const sections = [
		document.getElementById('hero'),
		...document.querySelectorAll('section[id]'),
		document.getElementById('footer-cta')
	];
	let currentVisible = null;
	function checkVisibleSection() {
		let bestSection = null, bestRatio = 0;
		sections.forEach(section => {
			if (!section) return;
			const rect		 = section.getBoundingClientRect();
			const wh		   = window.innerHeight;
			const visibleHeight = Math.min(rect.bottom, wh) - Math.max(rect.top, 0);
			const ratio		= visibleHeight / rect.height;
			if (ratio > bestRatio) { bestRatio = ratio; bestSection = section; }
		});
		if (bestSection && bestSection.id !== currentVisible) {
			currentVisible = bestSection.id;
			playSectionSound(getSectionSound(currentVisible));
		}
	}
	window.addEventListener('scroll', checkVisibleSection);
	checkVisibleSection();
}

/* ════════════════════════════════════════════
   ANIMATIONS D'ENTRÉE AU SCROLL (GSAP)
   ════════════════════════════════════════════ */

function initAnimations() {
	gsap.utils.toArray('.section-fade').forEach(section => {
		gsap.fromTo(section,
			{ opacity: 0, y: 80 },
			{ opacity: 1, y: 0, duration: 1.2, ease: 'power4.out',
			   scrollTrigger: { trigger: section, start: 'top 85%' } }
		);
	});
}

/* ════════════════════════════════════════════
   PRÉCHAUFFAGE CINÉMATIQUE
   Parcourt toutes les sections pour forcer le
   rendu GSAP, puis masque le loader.
   ════════════════════════════════════════════ */

async function cinematicWarmup() {
	window.__WARMUP_RUNNING__ = true;
	const loader = document.getElementById('startup-loader');
	if (!loader) return;
	document.body.style.overflow = 'hidden';
	await new Promise(r => setTimeout(r, 250));
	const nextButtons = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Suivant'));
	const prevButtons = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Précédent'));
	for (const btn of nextButtons) {
		btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await new Promise(r => setTimeout(r, 250));
		window.dispatchEvent(new Event('resize'));
		ScrollTrigger.refresh();
	}
	for (const btn of [...prevButtons].reverse()) {
		btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await new Promise(r => setTimeout(r, 250));
		window.dispatchEvent(new Event('resize'));
		ScrollTrigger.refresh();
	}
	window.scrollTo({ top: 0, behavior: 'instant' });
	await new Promise(r => setTimeout(r, 250));
	loader.classList.add('hidden');
	const urlTarget = new URLSearchParams(window.location.search).get('s');
	if (urlTarget) setTimeout(() => goToSection(urlTarget), 800);
	window.__WARMUP_RUNNING__  = false;
	document.body.style.overflow = '';
	AUDIO_UNLOCKED = false;
	AUDIO_MUTED	= true;
	if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
	const audioBtn = document.getElementById('audio-toggle');
	if (audioBtn) audioBtn.innerHTML = '<i class="fa-solid fa-volume-xmark" style="color: rgb(116, 163, 9);"></i>';
	if (AUDIO_ENABLED) createAudioOverlay();
	requestAnimationFrame(() => {
		gsap.to(window, { duration: 1.2, scrollTo: { y: 0, autoKill: false }, ease: 'power2.inOut' });
	});
}

/* ════════════════════════════════════════════
   SYSTÈME D'ANIMATIONS DE FOND
   (Blobs, Particules, Géométries, Ondes)
   Code identique à app.js.
   ════════════════════════════════════════════ */

let ANIMATION_ENABLED	   = DEFAULT_ANIMATION > 0;
let CURRENT_ANIMATION	   = DEFAULT_ANIMATION;
let animationCycle		  = [];
let animationCycleSections  = [];
let animationIndex		  = 0;
let animationIndexSections  = 0;
let activeAnimationFrame	= null;
let activeCanvas			= null;

if (ANIMATION_ENABLED) {
	for (let i = 0; i < NB_ANIMATIONS; i++) {
		let id = DEFAULT_ANIMATION + i;
		if (id > NB_ANIMATIONS) id -= NB_ANIMATIONS;
		animationCycle.push(id);
		animationCycleSections.push(id);
	}
	animationCycle.push(0);
	requestAnimationFrame(() => startAnimation(DEFAULT_ANIMATION));
}

if (!ANIMATION_ENABLED) {
	document.body.classList.add('no-animations');
	document.getElementById('background-animation')?.remove();
	blobToggle?.classList.add('hidden');
}

if (ANIMATION_ENABLED && blobToggle) {
	blobToggle.classList.remove('hidden');
	blobToggle.innerHTML = getAnimationIcon(DEFAULT_ANIMATION);
	blobToggle.addEventListener('click', nextAnimation);
}

function getAnimationIcon(id) {
	switch (id) {
		case 1: return '<i class="fa-solid fa-virus-covid"	   style="color: rgb(99, 230, 190);"></i>';
		case 2: return '<i class="fa-solid fa-meteor"			style="color: rgb(255, 212, 59);"></i>';
		case 3: return '<i class="fa-solid fa-shapes"			style="color: rgb(177, 151, 252);"></i>';
		case 4: return '<i class="fa-solid fa-tower-broadcast"   style="color: rgb(0, 255, 0);"></i>';
		default: return '<i class="fa-solid fa-circle-pause"	 style="color: rgb(255, 0, 0);"></i>';
	}
}

function nextAnimation() {
	stopCurrentAnimation();
	animationIndex++;
	if (animationIndex >= animationCycle.length) animationIndex = 0;
	CURRENT_ANIMATION = animationCycle[animationIndex];
	if (CURRENT_ANIMATION !== 0) animationIndexSections = animationCycleSections.indexOf(CURRENT_ANIMATION);
	startAnimation(CURRENT_ANIMATION);
	blobToggle.innerHTML = getAnimationIcon(CURRENT_ANIMATION);
}

function nextAnimationSection() {
	animationIndexSections++;
	if (animationIndexSections >= animationCycleSections.length) animationIndexSections = 0;
	CURRENT_ANIMATION = animationCycleSections[animationIndexSections];
	animationIndex	= animationCycle.indexOf(CURRENT_ANIMATION);
	stopCurrentAnimation();
	startAnimation(CURRENT_ANIMATION);
	blobToggle.innerHTML = getAnimationIcon(CURRENT_ANIMATION);
}

function stopCurrentAnimation() {
	const bg = document.getElementById('background-animation');
	if (bg) bg.innerHTML = '';
	if (activeAnimationFrame) { cancelAnimationFrame(activeAnimationFrame); activeAnimationFrame = null; }
}

function startAnimation(id) {
	switch (id) {
		case 1: startBlobs();	 break;
		case 2: startParticles(); break;
		case 3: startGeometry();  break;
		case 4: startWaves();	 break;
	}
}

function drawPolygon(ctx, sides, radius) {
	ctx.beginPath();
	for (let i = 0; i < sides; i++) {
		const angle = (i * Math.PI * 2) / sides;
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
	}
	ctx.closePath();
}

function hexToRGBA(hex, alpha) {
	hex = hex.replace('#', '');
	if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
	const bigint = parseInt(hex, 16);
	return `rgba(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}, ${alpha})`;
}

function makeCanvas(bgId) {
	const bg = document.getElementById(bgId);
	if (!bg) return null;
	bg.innerHTML = '';
	const canvas = document.createElement('canvas');
	canvas.width  = document.documentElement.clientWidth;
	canvas.height = document.documentElement.clientHeight;
	activeCanvas  = canvas;
	bg.appendChild(canvas);
	return canvas;
}

function startBlobs() {
	const canvas = makeCanvas('background-animation');
	if (!canvas) return;
	canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;';
	const ctx	= canvas.getContext('2d');
	const force  = ANIMATION_FORCES[1] || 3;
	const count  = 2 + force * 5;
	const blobs  = [];
	const cs	 = getComputedStyle(document.documentElement);
	const palette = [
		cs.getPropertyValue('--color-primary').trim(),
		cs.getPropertyValue('--color-secondary').trim(),
		'#2D6CDF', '#E84FFF', '#FF8A3D'
	];
	for (let i = 0; i < count; i++) {
		const radius = 100 + Math.random() * 100;
		blobs.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, radius,
			color: palette[Math.floor(Math.random()*palette.length)],
			vx: 2+Math.random()*3, vy: 2+Math.random()*3,
			pulse: Math.random()*Math.PI*2, pulseSpeed: 0.2+Math.random()*0.02,
			alpha: 0.15+Math.random()*0.25 });
	}
	function animate() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.globalCompositeOperation = 'lighter';
		ctx.filter = 'blur(40px)';
		blobs.forEach(blob => {
			blob.x += Math.sin(performance.now()*0.0002+blob.pulse)*blob.vx;
			blob.y += Math.cos(performance.now()*0.0002+blob.pulse)*blob.vy;
			blob.pulse += blob.pulseSpeed;
			const r = blob.radius*(1+Math.sin(blob.pulse)*0.08);
			if (blob.x < -r)			  blob.x = canvas.width+r;
			if (blob.x > canvas.width+r)  blob.x = -r;
			if (blob.y < -r)			  blob.y = canvas.height+r;
			if (blob.y > canvas.height+r) blob.y = -r;
			const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, r);
			g.addColorStop(0,   hexToRGBA(blob.color, blob.alpha));
			g.addColorStop(0.4, hexToRGBA(blob.color, blob.alpha*0.35));
			g.addColorStop(1,   hexToRGBA(blob.color, 0));
			ctx.fillStyle = g;
			ctx.beginPath(); ctx.arc(blob.x, blob.y, r, 0, Math.PI*2); ctx.fill();
		});
		ctx.filter = 'none';
		activeAnimationFrame = requestAnimationFrame(animate);
	}
	animate();
}

function startParticles() {
	const canvas = makeCanvas('background-animation');
	if (!canvas) return;
	const ctx   = canvas.getContext('2d');
	const force = ANIMATION_FORCES[2] || 3;
	const particles = [];
	for (let i = 0; i < 30*force; i++)
		particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height,
			r: Math.random()*3+1, s: 0.2+Math.random()*force*0.15, alpha: 0.1+Math.random()*0.8 });
	function animate() {
		ctx.clearRect(0,0,canvas.width,canvas.height);
		particles.forEach(p => {
			p.y -= p.s; if (p.y < 0) p.y = canvas.height;
			ctx.beginPath(); ctx.fillStyle=`rgba(255,220,120,${p.alpha})`;
			ctx.shadowBlur=8; ctx.shadowColor='#FFD96A';
			ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
		});
		activeAnimationFrame = requestAnimationFrame(animate);
	}
	animate();
}

function startGeometry() {
	const canvas = makeCanvas('background-animation');
	if (!canvas) return;
	const ctx	= canvas.getContext('2d');
	const force  = ANIMATION_FORCES[3] || 3;
	const palette = ['var(--color-primary)','var(--color-secondary)','#2D6CDF','#FF8A3D','#E84FFF'];
	const types   = ['hex','triangle','square','rectangle'];
	const shapes  = [];
	for (let i = 0; i < 10*force; i++)
		shapes.push({ color: palette[Math.floor(Math.random()*palette.length)],
			x: Math.random()*canvas.width, y: Math.random()*canvas.height,
			size: 15+Math.random()*40, angle: Math.random()*360,
			speed: 0.5+Math.random()*2, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
			lineWidth: 1+Math.random()*8, type: types[Math.floor(Math.random()*types.length)] });
	function draw() {
		ctx.clearRect(0,0,canvas.width,canvas.height);
		shapes.forEach(s => {
			s.angle += s.speed; s.x += s.vx; s.y += s.vy;
			if (s.x < -100)			  s.x = canvas.width+100;
			if (s.x > canvas.width+100)  s.x = -100;
			if (s.y < -100)			  s.y = canvas.height+100;
			if (s.y > canvas.height+100) s.y = -100;
			ctx.strokeStyle=s.color; ctx.shadowBlur=15; ctx.shadowColor=s.color;
			ctx.globalAlpha=0.25; ctx.lineWidth=s.lineWidth+Math.sin(Date.now()*0.001+s.x)*2;
			ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.angle*Math.PI/180);
			switch(s.type) {
				case 'hex':	   drawPolygon(ctx,6,s.size); break;
				case 'triangle':  drawPolygon(ctx,3,s.size); break;
				case 'square':	drawPolygon(ctx,4,s.size); break;
				case 'rectangle': ctx.rect(-s.size,-s.size*0.5,s.size*2,s.size); break;
			}
			ctx.stroke(); ctx.restore(); ctx.globalAlpha=1;
		});
		activeAnimationFrame = requestAnimationFrame(draw);
	}
	draw();
}

function startWaves() {
	const canvas = makeCanvas('background-animation');
	if (!canvas) return;
	const ctx	= canvas.getContext('2d');
	const force  = ANIMATION_FORCES[4] || 3;
	const waves  = [];
	let t		= 0;
	for (let i = 0; i < force*5; i++)
		waves.push({ baseY: Math.random()*canvas.height, amp: 20+Math.random()*120,
			speed: 0.005+Math.random()*0.05, freq: 0.003+Math.random()*0.02,
			alpha: 0.05+Math.random()*0.5 });
	const cs = getComputedStyle(document.documentElement);
	function draw() {
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.shadowBlur=15; ctx.shadowColor=cs.getPropertyValue('--color-primary');
		waves.forEach((wave,w) => {
			ctx.beginPath();
			const color = w%2
				? cs.getPropertyValue('--color-primary').trim()
				: cs.getPropertyValue('--color-secondary').trim();
			ctx.strokeStyle=color.replace(')',` / ${wave.alpha})`);
			ctx.lineWidth=3;
			for (let x=0;x<canvas.width;x+=10) {
				const y=wave.baseY+Math.sin(x*wave.freq+t*wave.speed*100)*wave.amp;
				if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
			}
			ctx.globalAlpha=wave.alpha; ctx.stroke(); ctx.globalAlpha=1;
		});
		t+=0.02;
		activeAnimationFrame = requestAnimationFrame(draw);
	}
	draw();
}

window.addEventListener('resize', () => {
	if (!activeCanvas) return;
	activeCanvas.width  = document.documentElement.clientWidth;
	activeCanvas.height = document.documentElement.clientHeight;
	stopCurrentAnimation();
	startAnimation(CURRENT_ANIMATION);
});

/* ════════════════════════════════════════════
   INITIALISATION
   ════════════════════════════════════════════ */

buildDataStore();
initAnimations();
initSectionAudioObserver();

requestAnimationFrame(() => {
	ScrollTrigger.refresh();
	createAudioOverlay();
	cinematicWarmup();
});
