/* ============================================================
   SCRIPT.JS — Portfolio Titouan Derval
   Sommaire :
     1. Menu (Bootstrap)
     2. Vidéos : pause / lecture
     3. Accordéon des catégories de projets
     4. Carrousels
     5. Fenêtres (lightbox) : image, audio, PDF
     6. Galerie photo
     7. Clavier : Échap, flèches, piège à focus
   ============================================================ */


/* ============================================================
   0. PRÉFÉRENCES UTILISATEUR
   ============================================================ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');


/* ============================================================
   1. MENU — Bootstrap gère l'ouverture du burger.
   On ajoute seulement : fermer le menu après un clic sur un lien.
   ============================================================ */
const navCollapse = document.getElementById('mainNav');
navCollapse.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navCollapse.classList.contains('show')) {
            bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false }).hide();
        }
    });
});


/* ============================================================
   2. VIDÉOS — bouton pause / lecture (WCAG 2.2.2)
   Si le visiteur a demandé "réduire les animations" dans son
   système, les vidéos démarrent en pause.
   ============================================================ */
document.querySelectorAll('.video-toggle').forEach(btn => {
    const video = document.querySelector(btn.dataset.target);
    const icon  = btn.querySelector('span');
    const name  = btn.dataset.target === '#heroVideo'
        ? "la vidéo d'arrière-plan"
        : "la vidéo des centres d'intérêt";

    function setPlaying(play) {
        if (play) { video.play().catch(() => {}); } else { video.pause(); }
        icon.textContent = play ? '❚❚' : '▶';
        btn.setAttribute('aria-label', (play ? 'Mettre en pause ' : 'Lire ') + name);
    }

    btn.addEventListener('click', () => setPlaying(video.paused));
    if (reduceMotion.matches) setPlaying(false);
});


/* ============================================================
   3. ACCORDÉON — une seule catégorie ouverte à la fois
   ============================================================ */
document.querySelectorAll('.cat-header').forEach(btn => {
    btn.addEventListener('click', () => {
        const block  = btn.closest('.cat-block');
        const isOpen = block.classList.contains('open');

        document.querySelectorAll('.cat-block').forEach(b => {
            b.classList.remove('open');
            b.querySelector('.cat-header').setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
            block.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
        }
    });
});


/* ============================================================
   4. CARROUSELS — scroll-snap natif
   Nombre de cartes visibles : mêmes breakpoints que le CSS et que
   Bootstrap (lg = 992px, md = 768px). On utilise matchMedia pour
   que le JS et le CSS ne se décalent jamais.
   ============================================================ */
const mqLarge  = window.matchMedia('(min-width: 992px)');
const mqMedium = window.matchMedia('(min-width: 768px)');
const getVisible = () => (mqLarge.matches ? 3 : mqMedium.matches ? 2 : 1);

document.querySelectorAll('.carrousel-wrapper').forEach(wrapper => {
    const track   = wrapper.querySelector('.carrousel-track');
    const btnPrev = wrapper.querySelector('.carr-btn-prev');
    const btnNext = wrapper.querySelector('.carr-btn-next');
    const dotsEl  = wrapper.querySelector('.carr-dots');
    const cards   = Array.from(track.querySelectorAll('.projet-card'));

    let current = 0;
    const maxIndex = () => Math.max(0, cards.length - getVisible());

    function buildDots() {
        dotsEl.innerHTML = '';
        for (let i = 0; i <= maxIndex(); i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carr-dot';
            dot.setAttribute('aria-label', 'Aller à la position ' + (i + 1));
            dot.addEventListener('click', () => goTo(i));
            dotsEl.appendChild(dot);
        }
    }

    function updateUI() {
        btnPrev.disabled = current === 0;
        btnNext.disabled = current >= maxIndex();
        dotsEl.querySelectorAll('.carr-dot').forEach((d, i) => {
            d.classList.toggle('active', i === current);
            if (i === current) d.setAttribute('aria-current', 'true');
            else d.removeAttribute('aria-current');
        });
    }

    function goTo(i) {
        current = Math.max(0, Math.min(i, maxIndex()));
        track.scrollTo({
            left: cards[current].offsetLeft,
            behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
        updateUI();
    }

    btnPrev.addEventListener('click', () => goTo(current - 1));
    btnNext.addEventListener('click', () => goTo(current + 1));

    /* Met à jour la position quand on fait défiler (doigt, molette, clavier) */
    let scrollTimer;
    track.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            let closest = 0, minDist = Infinity;
            cards.forEach((card, i) => {
                const dist = Math.abs(card.offsetLeft - track.scrollLeft);
                if (dist < minDist) { minDist = dist; closest = i; }
            });
            current = Math.min(closest, maxIndex());
            updateUI();
        }, 80);
    }, { passive: true });

    /* Glisser à la souris (desktop). Si on a glissé, on annule le clic
       qui suivrait, pour ne pas ouvrir un projet par accident. */
    let isDown = false, dragged = false, startX, startScrollLeft;
    track.addEventListener('mousedown', e => {
        isDown = true; dragged = false;
        startX = e.clientX;
        startScrollLeft = track.scrollLeft;
    });
    document.addEventListener('mousemove', e => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 5) {
            dragged = true;
            track.classList.add('dragging');
        }
        if (dragged) track.scrollLeft = startScrollLeft - dx;
    });
    document.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('dragging');
        if (dragged) goTo(current);
    });
    track.addEventListener('click', e => {
        if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    }, true);

    /* Changement de breakpoint ou redimensionnement */
    const onResize = () => {
        current = Math.min(current, maxIndex());
        buildDots();
        updateUI();
    };
    mqLarge.addEventListener('change', onResize);
    mqMedium.addEventListener('change', onResize);
    window.addEventListener('resize', onResize);

    buildDots();
    updateUI();
});


/* ============================================================
   5. FENÊTRES (LIGHTBOX) — image, audio, PDF
   À l'ouverture : le focus va dans la fenêtre.
   À la fermeture : le focus revient sur le bouton qui l'a ouverte.
   ============================================================ */
let lastFocus = null;

function openDialog(el) {
    lastFocus = document.activeElement;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = el.querySelector('.lightbox-close');
    if (first) first.focus();
}

function closeDialog(el) {
    el.classList.remove('open');
    const audio = el.querySelector('audio');
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
}

function openPDF(src) {
    window.open(src, '_blank', 'noopener');
}

function openAudio(src) {
    document.getElementById('audio-player').src = src;
    openDialog(document.getElementById('lightbox-audio'));
}

function openImg(src, titre) {
    document.getElementById('img-title').textContent = titre;
    const img = document.getElementById('img-frame');
    img.src = src;
    img.alt = titre ? 'Projet : ' + titre : '';
    openDialog(document.getElementById('lightbox-img'));
}

function closeLightbox(id) {
    closeDialog(document.getElementById(id));
}

/* Clic sur le fond sombre = fermer */
['lightbox-img', 'lightbox-audio'].forEach(id => {
    document.getElementById(id).addEventListener('click', function (e) {
        if (e.target === this) closeLightbox(id);
    });
});


/* ============================================================
   6. GALERIE PHOTO
   ============================================================ */
const galleryEl = document.getElementById('lightbox-gallery');
let galleryImages = [];
let galleryTitle  = '';
let galleryIndex  = 0;

function openGallery(titre, images) {
    galleryImages = images;
    galleryTitle  = titre || '';
    galleryIndex  = 0;
    renderGallery();
    openDialog(galleryEl);
}

function renderGallery() {
    galleryEl.querySelector('.gallery-title').textContent = galleryTitle;

    const thumbsEl = galleryEl.querySelector('.gallery-thumbs');
    thumbsEl.innerHTML = '';
    galleryImages.forEach((src, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gallery-thumb';
        btn.setAttribute('aria-label', 'Afficher la photo ' + (i + 1) + ' sur ' + galleryImages.length);

        const t = document.createElement('img');
        t.src = src;
        t.alt = '';
        t.loading = 'lazy';
        btn.appendChild(t);

        btn.addEventListener('click', () => { galleryIndex = i; updateGallery(); });
        thumbsEl.appendChild(btn);
    });

    updateGallery();
}

function updateGallery() {
    const img = document.getElementById('gallery-img');
    img.src = galleryImages[galleryIndex];
    img.alt = galleryTitle + ' – photo ' + (galleryIndex + 1) + ' sur ' + galleryImages.length;

    galleryEl.querySelector('.gallery-counter').textContent =
        (galleryIndex + 1) + ' / ' + galleryImages.length;

    const thumbs = galleryEl.querySelectorAll('.gallery-thumb');
    thumbs.forEach((t, i) => {
        t.classList.toggle('active', i === galleryIndex);
        if (i === galleryIndex) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
    });
    if (thumbs[galleryIndex]) {
        thumbs[galleryIndex].scrollIntoView({
            behavior: reduceMotion.matches ? 'auto' : 'smooth',
            inline: 'center', block: 'nearest'
        });
    }

    galleryEl.querySelector('.gallery-nav.prev').disabled = galleryIndex === 0;
    galleryEl.querySelector('.gallery-nav.next').disabled = galleryIndex === galleryImages.length - 1;
}

function closeGallery() {
    closeDialog(galleryEl);
}

galleryEl.querySelector('.gallery-nav.prev').addEventListener('click', () => {
    if (galleryIndex > 0) { galleryIndex--; updateGallery(); }
});
galleryEl.querySelector('.gallery-nav.next').addEventListener('click', () => {
    if (galleryIndex < galleryImages.length - 1) { galleryIndex++; updateGallery(); }
});
galleryEl.addEventListener('click', e => {
    if (e.target === galleryEl) closeGallery();
});


/* ============================================================
   7. CLAVIER
   - Échap : ferme la fenêtre ouverte
   - Flèches ← → : photo précédente / suivante dans la galerie
   - Tab : le focus reste prisonnier de la fenêtre ouverte
   ============================================================ */
document.addEventListener('keydown', e => {
    const openEl = document.querySelector('#lightbox-img.open, #lightbox-audio.open, #lightbox-gallery.open');
    if (!openEl) return;

    if (e.key === 'Escape') {
        closeDialog(openEl);
        return;
    }

    if (openEl === galleryEl) {
        if (e.key === 'ArrowLeft'  && galleryIndex > 0)                        { galleryIndex--; updateGallery(); }
        if (e.key === 'ArrowRight' && galleryIndex < galleryImages.length - 1) { galleryIndex++; updateGallery(); }
    }

    if (e.key === 'Tab') {
        const focusables = Array.from(
            openEl.querySelectorAll('button:not(:disabled), [href], audio[controls]')
        ).filter(el => el.offsetParent !== null);
        if (!focusables.length) return;

        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});
