// main.js - ملف JavaScript الرئيسي لموقع ESSO

// توحيد تحويل اللغة لجميع صفحات الموقع.
// الصفحات العربية: page.html  ->  page_en.html
// الصفحات الإنجليزية: page_en.html  ->  page.html
window.switchLanguage = function () {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index.html';

    if (file.endsWith('_en.html')) {
        window.location.href = file.replace(/_en\.html$/, '.html') + window.location.search + window.location.hash;
        return;
    }

    if (file.endsWith('.html')) {
        window.location.href = file.replace(/\.html$/, '_en.html') + window.location.search + window.location.hash;
        return;
    }

    window.location.href = 'index_en.html';
};

document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 1) تفعيل الرابط النشط في القائمة العلوية
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2) التمرير السلس للروابط الداخلية
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    const header = document.querySelector('header');
    if (!header) return;

    header.style.transition = 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease';
    header.style.willChange = 'transform, background, box-shadow';

    // 3) تأثير الهيدر عند التمرير
    function updateHeaderStyle() {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(10, 25, 47, 0.95)';
            header.style.backdropFilter = 'blur(5px)';
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        } else {
            header.style.background = 'var(--primary-dark)';
            header.style.backdropFilter = 'none';
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        }
    }

    let lastScrollTop = 0;
    const scrollThreshold = 50;

    function handleHeaderVisibility() {
        if (header.classList.contains('mobile-menu-open')) {
            header.classList.remove('header-hidden');
            return;
        }

        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }

    window.addEventListener('scroll', function () {
        requestAnimationFrame(function () {
            updateHeaderStyle();
            handleHeaderVisibility();
        });
    });

    updateHeaderStyle();

    // 4) قائمة الموبايل
    const headerContent = document.querySelector('.header-content');
    const nav = document.querySelector('nav');

    if (!headerContent || !nav) return;

    let menuBtn = headerContent.querySelector('.menu-toggle');

    if (!menuBtn) {
        menuBtn = document.createElement('button');
        menuBtn.type = 'button';
        menuBtn.className = 'menu-toggle';
        menuBtn.setAttribute('aria-label', 'Open navigation menu');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';

        menuBtn.style.cssText = [
            'font-size:24px',
            'cursor:pointer',
            'border:0',
            'background:transparent',
            'color:inherit',
            'padding:6px',
            'line-height:1',
            'display:none',
            'align-items:center',
            'justify-content:center',
            'z-index:110'
        ].join(';');

        headerContent.insertBefore(menuBtn, nav);
    }

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function openMenu() {
        if (!isMobile()) return;

        nav.style.display = 'block';
        nav.setAttribute('aria-hidden', 'false');
        menuBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
        menuBtn.setAttribute('aria-label', 'Close navigation menu');
        menuBtn.setAttribute('aria-expanded', 'true');
        header.classList.add('mobile-menu-open');
        header.classList.remove('header-hidden');
    }

    function closeMenu() {
        nav.style.display = 'none';
        nav.setAttribute('aria-hidden', 'true');
        menuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        menuBtn.setAttribute('aria-label', 'Open navigation menu');
        menuBtn.setAttribute('aria-expanded', 'false');
        header.classList.remove('mobile-menu-open');
    }

    function syncMobileMenu() {
        if (isMobile()) {
            menuBtn.style.display = 'flex';
            closeMenu();
        } else {
            menuBtn.style.display = 'none';
            nav.style.display = '';
            nav.setAttribute('aria-hidden', 'false');
            header.classList.remove('mobile-menu-open', 'header-hidden');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
        }
    }

    menuBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (nav.style.display === 'none' || nav.style.display === '') {
            openMenu();
        } else {
            closeMenu();
        }
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
            if (isMobile()) {
                closeMenu();
            }
        });
    });

    syncMobileMenu();
    window.addEventListener('resize', syncMobileMenu);
});