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

    // ---- Contact Inputs with Firebase Realtime Sync ----
    const contactInputs = document.querySelectorAll('.contact-input');
    const contactsRef   = db.ref('contacts');
    let _suppressContactWrite = false;

    function saveContactState() {
        if (_suppressContactWrite) return;
        const state = {};
        contactInputs.forEach(input => {
            const key = input.dataset.contactKey;
            if (key) {
                state[key] = input.value.trim();
            }
        });
        contactsRef.set(state);
    }

    contactsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        _suppressContactWrite = true;
        contactInputs.forEach(input => {
            const key = input.dataset.contactKey;
            if (key && data[key] !== undefined && data[key] !== null) {
                input.value = data[key];
                if (data[key]) {
                    input.classList.add('has-value');
                } else {
                    input.classList.remove('has-value');
                }
            }
        });
        _suppressContactWrite = false;
    });

    contactInputs.forEach(input => {
        let debounceTimer;
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => saveContactState(), 400);
        });
    });

    // ---- Role Name Inputs with Firebase Realtime Sync ----
    const roleInputs = document.querySelectorAll('.role-name-input');
    const rolesRef    = db.ref('roles');
    let _suppressRoleWrite = false;

    function saveRoleState() {
        if (_suppressRoleWrite) return;
        const state = {};
        roleInputs.forEach(input => {
            const key = input.dataset.roleKey;
            if (key) {
                state[key] = input.value.trim();
            }
        });
        rolesRef.set(state);
    }

    rolesRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        _suppressRoleWrite = true;
        roleInputs.forEach(input => {
            const key = input.dataset.roleKey;
            if (key && data[key] !== undefined && data[key] !== null && data[key] !== '') {
                input.value = data[key];
                input.classList.add('has-value');
            } else if (key && !input.value.trim()) {
                // Keep HTML default value if Firebase has no data
                if (input.value.trim()) {
                    input.classList.add('has-value');
                }
            }
        });
        _suppressRoleWrite = false;
    });

    roleInputs.forEach(input => {
        let debounceTimer;
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => saveRoleState(), 400);
        });

        // Initialize has-value class for inputs with default values
        if (input.value.trim()) {
            input.classList.add('has-value');
        }
    });

    // ---- Live Clock ----
    const clockTimeEl = document.getElementById('clockTime');
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        if (clockTimeEl) {
            clockTimeEl.textContent = `${hours}:${mins}:${secs} ${ampm}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ---- Current Phase Auto-Highlight ----
    const phaseSchedule = [
        { phase: 'wakeup',          start: [3, 0],   end: [3, 30] },
        { phase: 'breakfast',       start: [3, 30],  end: [4, 0] },
        { phase: 'hmua',            start: [4, 0],   end: [9, 0] },
        { phase: 'photovideo',      start: [9, 0],   end: [11, 30] },
        { phase: 'travel-to-venue', start: [11, 30], end: [12, 0] },
        { phase: 'preparation',     start: [12, 0],  end: [13, 30] },
        { phase: 'guests',          start: [13, 30], end: [13, 50] },
        { phase: 'assembly',        start: [13, 50], end: [13, 55] },
        { phase: 'ready',           start: [13, 55], end: [14, 0] },
        { phase: 'ceremony-start',  start: [14, 0],  end: [14, 30] },
        { phase: 'ceremony-talk',   start: [14, 30], end: [14, 45] },
        { phase: 'signing',         start: [14, 45], end: [15, 0] },
        { phase: 'pictorial1',      start: [15, 0],  end: [15, 30] },
        { phase: 'travel',          start: [15, 30], end: [16, 0] },
        { phase: 'reception-start', start: [16, 0],  end: [16, 15] },
        { phase: 'dinner',          start: [16, 15], end: [17, 0] },
        { phase: 'entertainment',   start: [17, 0],  end: [20, 0] },
        { phase: 'egress',          start: [20, 0],  end: [23, 59] },
    ];

    function toMinutes(h, m) { return h * 60 + m; }

    function updateCurrentPhase() {
        const now = new Date();
        const currentMin = toMinutes(now.getHours(), now.getMinutes());

        // Remove previous highlights
        document.querySelectorAll('.timeline-item.current-phase').forEach(el => {
            el.classList.remove('current-phase');
        });

        // Find matching phase
        for (const entry of phaseSchedule) {
            const startMin = toMinutes(entry.start[0], entry.start[1]);
            const endMin = toMinutes(entry.end[0], entry.end[1]);
            if (currentMin >= startMin && currentMin < endMin) {
                const el = document.querySelector(`.timeline-item[data-phase="${entry.phase}"]`);
                if (el) {
                    el.classList.add('current-phase');
                }
                break;
            }
        }
    }

    updateCurrentPhase();
    setInterval(updateCurrentPhase, 30000); // Update every 30 seconds

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
