/* ======================================================
   WEDDING DAY — INTERACTIVE FEATURES
   ====================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Mobile Nav Toggle ----
    const navToggle = document.getElementById('navToggle');
    const navLinks  = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
            });
        });
    }

    // ---- Active Nav Highlighting ----
    const sections = document.querySelectorAll('.section, .hero');
    const navAnchors = document.querySelectorAll('.nav-links a');

    function highlightNav() {
        let current = '';
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom > 120) {
                current = section.id;
            }
        });

        navAnchors.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === '#' + current) {
                a.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', highlightNav, { passive: true });
    highlightNav();

    // ---- Scroll Reveal Animation ----
    const revealElements = document.querySelectorAll(
        '.timeline-item, .overview-card, .detail-card, .role-card, .tip-card, .checklist-group'
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger animation slightly
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 50);
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // ---- Role Filter ----
    const filterBtns = document.querySelectorAll('.filter-btn');
    const roleCards  = document.querySelectorAll('.role-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            roleCards.forEach(card => {
                const venue = card.dataset.venue;
                if (filter === 'all' || venue === filter) {
                    card.classList.remove('hidden');
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });

    // ---- Firebase Realtime Database References ----
    const db = firebase.database();
    const checklistRef = db.ref('checklist');
    const songsRef     = db.ref('songs');

    // ---- Checklist with Firebase Realtime Sync ----
    const allCheckboxes = document.querySelectorAll('.checklist-items input[type="checkbox"]');
    const progressFill  = document.getElementById('progressFill');
    const progressText  = document.getElementById('progressText');
    const resetBtn      = document.getElementById('resetChecklist');
    let _suppressChecklistWrite = false;  // prevents write-back while receiving remote data

    // Update progress bar (UI only)
    function updateProgress() {
        const total = allCheckboxes.length;
        const checked = Array.from(allCheckboxes).filter(cb => cb.checked).length;
        const percent = total ? (checked / total) * 100 : 0;

        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (progressText) {
            progressText.textContent = `${checked} of ${total} items completed`;
            if (checked === total && total > 0) {
                progressText.textContent += ' — Congratulations! 🎉';
            }
        }
    }

    // Push checklist state to Firebase
    function saveChecklistState() {
        if (_suppressChecklistWrite) return;
        const state = {};
        allCheckboxes.forEach((cb, i) => {
            state[i] = cb.checked;
        });
        checklistRef.set(state);
    }

    // Listen for realtime changes from Firebase
    checklistRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        _suppressChecklistWrite = true;
        allCheckboxes.forEach((cb, i) => {
            cb.checked = !!data[i];
        });
        _suppressChecklistWrite = false;
        updateProgress();
    });

    // Event listeners — push to Firebase on change
    allCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            saveChecklistState();
            updateProgress();
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all checklist items? This cannot be undone.')) {
                allCheckboxes.forEach(cb => {
                    cb.checked = false;
                });
                checklistRef.set(null);  // remove all checklist data
                updateProgress();
            }
        });
    }

    // Initialize progress bar
    updateProgress();

    // ---- Song Input with Firebase Realtime Sync ----
    const songInputs = document.querySelectorAll('.song-input');
    let _suppressSongWrite = false;  // prevents write-back while receiving remote data

    // Push song choices to Firebase
    function saveSongChoices() {
        if (_suppressSongWrite) return;
        const state = {};
        songInputs.forEach(input => {
            const key = input.dataset.songKey;
            if (key && input.value.trim()) {
                state[key] = input.value.trim();
            }
        });
        songsRef.set(state);
    }

    // Listen for realtime changes from Firebase
    songsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        _suppressSongWrite = true;
        songInputs.forEach(input => {
            const key = input.dataset.songKey;
            if (key && data[key]) {
                input.value = data[key];
                input.classList.add('has-value');
            } else if (key) {
                input.value = '';
                input.classList.remove('has-value');
            }
        });
        _suppressSongWrite = false;
    });

    songInputs.forEach(input => {
        // Debounce Firebase writes to avoid excessive writes while typing
        let debounceTimer;
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => saveSongChoices(), 400);
        });
    });

    // ---- Smooth scroll for anchor links (fallback) ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ---- Parallax-like hero effect ----
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            if (scrolled < window.innerHeight) {
                hero.style.backgroundPositionY = scrolled * 0.3 + 'px';
            }
        }, { passive: true });
    }

});
