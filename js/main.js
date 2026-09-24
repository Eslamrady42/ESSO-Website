// main.js - ملف JavaScript الرئيسي لموقع ESSO (نسخة محدثة)

document.addEventListener('DOMContentLoaded', function() {
    
    // 1️⃣ تفعيل الرابط النشط في القائمة العلوية
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2️⃣ التمرير السلس للروابط الداخلية (التي تبدأ بـ #)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 3️⃣ تأثير الهيدر عند التمرير (تغيير الخلفية والظل)
    const header = document.querySelector('header');
    if (!header) return; // إذا لم يوجد الهيدر، لا تفعل شيئاً

    // إضافة transition في CSS (يمكن وضعها في ملف style.css ولكن نضيفها هنا للتوضيح)
    header.style.transition = 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease';
    header.style.willChange = 'transform, background, box-shadow';

    // دالة تحديث الخلفية والظل
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

    // متغيرات إخفاء الهيدر
    let lastScrollTop = 0;
    const scrollThreshold = 50; // المسافة التي بعدها يتم الإخفاء

    function handleHeaderVisibility() {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
            // التمرير لأسفل - إخفاء الهيدر
            header.classList.add('header-hidden');
        } else {
            // التمرير لأعلى - إظهار الهيدر
            header.classList.remove('header-hidden');
        }
        
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }

    // دمج الوظيفتين في حدث scroll واحد
    window.addEventListener('scroll', function() {
        requestAnimationFrame(() => {
            updateHeaderStyle();
            handleHeaderVisibility();
        });
    });

    // استدعاء أولي لضبط الحالة
    updateHeaderStyle();

    // 4️⃣ قائمة همبرغر للموبايل (اختياري - تعمل فقط على الشاشات الصغيرة)
    if (window.innerWidth <= 768) {
        const menuBtn = document.createElement('div');
        menuBtn.className = 'menu-toggle';
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        menuBtn.style.cssText = `
            font-size: 24px;
            cursor: pointer;
            margin-left: 15px;
            display: block;
        `;

        const headerContent = document.querySelector('.header-content');
        const nav = document.querySelector('nav');
        
        if (headerContent && nav) {
            // إدراج الزر بعد اللوجو
            headerContent.insertBefore(menuBtn, nav);
            
            // إخفاء القائمة افتراضياً
            nav.style.display = 'none';
            
            // عند النقر على الزر
            menuBtn.addEventListener('click', function() {
                if (nav.style.display === 'none') {
                    nav.style.display = 'block';
                    menuBtn.innerHTML = '<i class="fas fa-times"></i>';
                } else {
                    nav.style.display = 'none';
                    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                }
            });
            
            // إعادة تعيين عند تغيير حجم النافذة
            window.addEventListener('resize', function() {
                if (window.innerWidth > 768) {
                    nav.style.display = 'flex';
                    if (menuBtn) menuBtn.style.display = 'none';
                } else {
                    nav.style.display = 'none';
                    if (menuBtn) {
                        menuBtn.style.display = 'block';
                        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                }
            });
        }
    }
});