// ===== LANGUAGE SYSTEM FOR PHASE 1 PAGES =====
// Supports Arabic and English with RTL/LTR switching

const translations = {
    // Navigation
    'nav-home': { ar: 'الرئيسية', en: 'Home' },
    'nav-about': { ar: 'عن الشركة', en: 'About' },
    'nav-services': { ar: 'خدماتنا', en: 'Services' },
    'nav-smarthome': { ar: 'المنزل الذكي', en: 'Smart Home' },
    'nav-projects': { ar: 'مشاريعنا', en: 'Projects' },
    'nav-shop': { ar: 'المتجر', en: 'Shop' },
    'nav-contact': { ar: 'اتصل بنا', en: 'Contact' },

    // Hero
    'hero-badge': { ar: 'حلول المنزل الذكي', en: 'Smart Home Solutions' },
    'hero-title': { ar: 'حلول المنزل الذكي المصممة لتناسب أسلوب حياتك', en: 'Smart Home Solutions Designed Around Your Lifestyle' },
    'hero-desc': { ar: 'تقدم ESSO حلول منزل ذكي متكاملة للمساحات السكنية الحديثة. من الإضاءة والأمن إلى التحكم الصوتي والأتمتة الكاملة — نضفي الذكاء على كل ركن في منزلك.', en: 'ESSO designs and implements integrated smart home systems for modern residential spaces. From lighting and security to voice control and full automation — we bring intelligence to every corner of your home.' },
    'hero-cta-primary': { ar: 'ابدأ منزلك الذكي', en: 'Start Your Smart Home' },
    'hero-cta-secondary': { ar: 'اكتشف حلولنا', en: 'Explore Our Solutions' },

    // Solutions Section
    'solutions-tag': { ar: 'ما نقدمه', en: 'What We Deliver' },
    'solutions-title': { ar: 'حلول المنزل الذكي', en: 'Smart Home Solutions' },
    'solutions-desc': { ar: 'من البنية التحتية الأساسية إلى الواجهات البديهية، نوفر نظاماً بيئياً متكاملاً لتقنيات المنزل الذكي مصمماً خصيصاً لمساحتك وأسلوب حياتك.', en: 'From core infrastructure to intuitive interfaces, we provide a complete ecosystem of smart home technologies tailored to your space and lifestyle.' },

    // Solution Cards
    'sol-lighting-title': { ar: 'التحكم في الإضاءة', en: 'Lighting Control' },
    'sol-lighting-desc': { ar: 'مشاهد إضاءة قابلة للتخصيص، تعتيم، ضبط الألوان، وجدولة للراحة والأجواء وكفاءة الطاقة.', en: 'Customizable lighting scenes, dimming, colour tuning, and scheduling for comfort, ambience, and energy efficiency.' },
    'sol-curtain-title': { ar: 'التحكم في الستائر', en: 'Curtain & Blind Control' },
    'sol-curtain-desc': { ar: 'ستائر ومظلات أوتوماتيكية مع مشغلات عند شروق/غروب الشمس، التحكم الصوتي، وتكامل المشاهد.', en: 'Automated blinds, shades, and curtains with sunrise/sunset triggers, voice control, and scene integration.' },
    'sol-hvac-title': { ar: 'التحكم في التكييف', en: 'HVAC Control' },
    'sol-hvac-desc': { ar: 'تكامل منظمات الحرارة الذكية، إدارة درجة الحرارة حسب المناطق، وتحكم مناخي محسّن للطاقة.', en: 'Smart thermostat integration, zoned temperature management, and energy-optimized climate control.' },
    'sol-security-title': { ar: 'الأمن وكاميرات المراقبة', en: 'Security & CCTV' },
    'sol-security-desc': { ar: 'أنظمة إنذار متكاملة، حساسات حركة، مراقبة بالفيديو مع وصول عن بعد، وإشعارات فورية.', en: 'Integrated alarm systems, motion sensors, video surveillance with remote access, and real-time notifications.' },
    'sol-access-title': { ar: 'التحكم في الدخول', en: 'Access Control' },
    'sol-access-desc': { ar: 'أقفال ذكية، أنظمة اتصال داخلي، أجراس فيديو، وإدارة الدخول للمنازل والمداخل والجراجات.', en: 'Smart locks, intercom systems, video doorbells, and access management for homes, entrances, and garages.' },
    'sol-panels-title': { ar: 'الشاشات ولوحات التحكم', en: 'Smart Panels' },
    'sol-panels-desc': { ar: 'شاشات لمس مركزية وواجهات مثبتة على الحائط للتحكم البديهي في جميع وظائف المنزل الذكي.', en: 'Centralized touch panels and wall-mounted interfaces for intuitive control of all home automation functions.' },
    'sol-voice-title': { ar: 'التحكم الصوتي', en: 'Voice Control' },
    'sol-voice-desc': { ar: 'تشغيل بدون استخدام اليدين عبر Alexa ومنصات الصوت الأخرى للراحة وسهولة الوصول.', en: 'Hands-free operation through Alexa, Google Assistant, and other voice platforms for convenience and accessibility.' },
    'sol-automation-title': { ar: 'أتمتة المنزل', en: 'Home Automation' },
    'sol-automation-desc': { ar: 'أتمتة شاملة مع مشاهد وقواعد ومشغلات تربط كل نظام في تجربة واحدة سلسة.', en: 'Comprehensive automation with scenes, rules, and triggers that connect every system into one seamless experience.' },
    'sol-networking-title': { ar: 'الشبكات والتكامل', en: 'Networking & Integration' },
    'sol-networking-desc': { ar: 'بنية تحتية شبكية قوية، Zigbee، KNX، Home Assistant، وتكامل الأنظمة للاتصال السلس.', en: 'Robust network infrastructure, Zigbee, KNX, Home Assistant, and system integration for flawless communication.' },
    'sol-programming-title': { ar: 'البرمجة والتكوين', en: 'System Programming & Configuration' },
    'sol-programming-desc': { ar: 'برمجة مخصصة، تكوين، اختبار، وضبط دقيق لضمان أداء كل نظام كما هو متوقع.', en: 'Custom programming, configuration, testing, and fine-tuning to ensure every system performs as expected.' },

    // Process
    'process-tag': { ar: 'عملية العمل', en: 'Our Process' },
    'process-title': { ar: 'كيف تعمل ESSO', en: 'How ESSO Works' },
    'process-desc': { ar: 'نتبع نهجاً منظماً وتعاونياً لتقديم حلول المنزل الذكي التي تتطابق مع رؤيتك وجدولك الزمني وميزانيتك.', en: 'We follow a structured, collaborative approach to deliver smart home solutions that match your vision, schedule, and budget.' },
    'step1-title': { ar: 'فهم احتياجاتك', en: 'Understand Your Needs' },
    'step1-desc': { ar: 'نبدأ بالتعرف على مساحتك وأسلوب حياتك وأولوياتك والميزات التي تقدرها أكثر.', en: 'We begin by learning about your space, lifestyle, priorities, and the features you value most.' },
    'step1-link': { ar: 'أخبرنا باحتياجاتك', en: 'Tell Us What You Need' },
    'step2-title': { ar: 'تصميم الحل', en: 'Design the Solution' },
    'step2-desc': { ar: 'يطور مهندسونا بنية النظام وتخطيط الأجهزة وخطة التكامل المصممة خصيصاً لعقارك.', en: 'Our engineers develop a system architecture, device layout, and integration plan tailored to your property.' },
    'step3-title': { ar: 'اختيار التكنولوجيا المناسبة', en: 'Select the Right Technology' },
    'step3-desc': { ar: 'نوصي بأفضل البروتوكولات والمنصات والمنتجات — من KNX و Zigbee إلى Home Assistant و Alexa.', en: 'We recommend the best protocols, platforms, and products — from KNX and Zigbee to Home Assistant and Alexa.' },
    'step4-title': { ar: 'التركيب والبرمجة', en: 'Installation & Configuration' },
    'step4-desc': { ar: 'يقوم فريقنا بتركيب وتكوين وبرمجة كل مكون باحترافية ودقة.', en: 'Our team professionally installs, configures, and programs every component with precision and care.' },
    'step5-title': { ar: 'الاختبار والتسليم', en: 'Testing & Handover' },
    'step5-desc': { ar: 'نختبر جميع الأنظمة بدقة، ندربك على التشغيل، ونسلمك منزلاً ذكياً موثقاً بالكامل.', en: 'We thoroughly test all systems, train you on operation, and deliver a fully documented smart home.' },
    'step6-title': { ar: 'الدعم والتطوير المستقبلي', en: 'Support & Future Expansion' },
    'step6-desc': { ar: 'نبقى متاحين للدعم المستمر والتحديثات والتوسع المستقبلي للنظام مع تطور احتياجاتك.', en: 'We remain available for ongoing support, updates, and future system expansion as your needs evolve.' },

    // CTA
    'cta-title': { ar: 'جاهز تبدأ منزلك الذكي؟', en: 'Ready to Build Your Smart Home?' },
    'cta-desc': { ar: 'أخبرنا عن مشروعك ودعنا نبدأ في تصميم مساحة معيشة أكثر ذكاءً واتصالاً.', en: 'Tell us about your project and let\'s start designing a smarter, more connected living space.' },
    'cta-button': { ar: 'أخبرنا باحتياجاتك', en: 'Tell Us What You Need' },

    // Form
    'form-tag': { ar: 'ابدأ الآن', en: 'Get Started' },
    'form-title': { ar: 'لنصمم منزلك الذكي', en: 'Let\'s Design Your Smart Home' },
    'form-desc': { ar: 'أخبرنا عن مساحتك واحتياجاتك والوظائف التي ترغب بها. ستساعدنا إجاباتك على فهم الحل الأنسب لمشروعك.', en: 'Tell us about your space, lifestyle, and the features you need. Your answers will help us understand the right solution for your project.' },

    'personal-title': { ar: 'المعلومات الشخصية', en: 'Personal Information' },
    'full-name-label': { ar: 'الاسم بالكامل', en: 'Full Name' },
    'full-name-placeholder': { ar: 'الاسم الكامل', en: 'Your full name' },
    'full-name-error': { ar: 'يرجى إدخال الاسم بالكامل.', en: 'Please enter your full name.' },
    'phone-label': { ar: 'رقم الهاتف', en: 'Phone Number' },
    'phone-placeholder': { ar: '01xxxxxxxxx', en: '+1 234 567 8900' },
    'phone-error': { ar: 'يرجى إدخال رقم هاتف صحيح.', en: 'Please enter a valid phone number.' },
    'email-label': { ar: 'البريد الإلكتروني', en: 'Email Address' },
    'email-placeholder': { ar: 'example@domain.com', en: 'you@example.com' },
    'email-error': { ar: 'يرجى إدخال بريد إلكتروني صحيح.', en: 'Please enter a valid email address.' },
    'city-label': { ar: 'المدينة أو الموقع', en: 'City / Location' },
    'city-placeholder': { ar: 'المدينة، الدولة', en: 'City, Country' },
    'city-error': { ar: 'يرجى إدخال موقعك.', en: 'Please enter your location.' },

    'project-title': { ar: 'معلومات المشروع', en: 'Project Information' },
    'property-type-label': { ar: 'نوع العقار', en: 'Property Type' },
    'property-type-default': { ar: 'اختر نوع العقار', en: 'Select property type' },
    'property-type-apartment': { ar: 'شقة', en: 'Apartment' },
    'property-type-villa': { ar: 'فيلا', en: 'Villa' },
    'property-type-duplex': { ar: 'دوبلكس', en: 'Duplex' },
    'property-type-office': { ar: 'مكتب', en: 'Office' },
    'property-type-other': { ar: 'أخرى', en: 'Other' },
    'property-type-error': { ar: 'يرجى اختيار نوع العقار.', en: 'Please select a property type.' },
    'project-status-label': { ar: 'حالة المشروع', en: 'Project Status' },
    'project-status-default': { ar: 'اختر حالة المشروع', en: 'Select project status' },
    'project-status-new': { ar: 'إنشاء جديد', en: 'New Construction' },
    'project-status-under': { ar: 'تحت الإنشاء', en: 'Under Construction' },
    'project-status-finished': { ar: 'مكتمل', en: 'Finished' },
    'project-status-renovation': { ar: 'تجديد', en: 'Renovation' },
    'project-status-error': { ar: 'يرجى اختيار حالة المشروع.', en: 'Please select the project status.' },
    'property-size-label': { ar: 'المساحة التقريبية للعقار', en: 'Approximate Property Size' },
    'property-size-placeholder': { ar: 'مثال: 250 متر مربع', en: 'e.g. 250 m² / 2,700 ft²' },

    'systems-title': { ar: 'أنظمة المنزل الذكي', en: 'Smart Home Systems' },
    'systems-note': { ar: 'اختر الأنظمة التي تهتم بها', en: 'Which systems are you interested in?' },
    'system-lighting': { ar: 'الإضاءة', en: 'Lighting' },
    'system-curtains': { ar: 'الستائر', en: 'Curtains / Blinds' },
    'system-hvac': { ar: 'التكييف', en: 'HVAC' },
    'system-security': { ar: 'الأمان', en: 'Security' },
    'system-cctv': { ar: 'كاميرات المراقبة', en: 'CCTV' },
    'system-access': { ar: 'التحكم في الدخول', en: 'Access Control' },
    'system-locks': { ar: 'الأقفال الذكية', en: 'Smart Locks' },
    'system-panels': { ar: 'الشاشات ولوحات التحكم', en: 'Smart Panels' },
    'system-voice': { ar: 'التحكم الصوتي', en: 'Voice Control' },
    'system-audio': { ar: 'الصوت متعدد الغرف', en: 'Multi-room Audio' },
    'system-energy': { ar: 'مراقبة الطاقة', en: 'Energy Monitoring' },
    'system-networking': { ar: 'الشبكات', en: 'Networking' },
    'system-full': { ar: 'أتمتة المنزل بالكامل', en: 'Full Home Automation' },
    'system-other': { ar: 'أخرى', en: 'Other' },
    'systems-error': { ar: 'يرجى اختيار نظام واحد على الأقل.', en: 'Please select at least one system.' },

    'tech-title': { ar: 'التكنولوجيا المفضلة', en: 'Technology Preference' },
    'tech-note': { ar: 'هل لديك تكنولوجيا مفضلة بالفعل؟', en: 'Do you already have a preferred technology?' },
    'tech-other': { ar: 'أخرى', en: 'Other' },
    'tech-not-sure': { ar: 'غير متأكد — أحتاج توصيتكم', en: 'Not Sure — I need your recommendation' },

    'rooms-title': { ar: 'الغرف', en: 'Rooms' },
    'rooms-note': { ar: 'اختر الغرف التي ترغب في تضمينها في نظام المنزل الذكي', en: 'Which rooms would you like to include in your smart home system?' },
    'room-living': { ar: 'غرفة المعيشة', en: 'Living Room' },
    'room-master': { ar: 'غرفة النوم الرئيسية', en: 'Master Bedroom' },
    'room-bedrooms': { ar: 'غرف النوم', en: 'Bedrooms' },
    'room-kitchen': { ar: 'المطبخ', en: 'Kitchen' },
    'room-bathrooms': { ar: 'الحمامات', en: 'Bathrooms' },
    'room-entrance': { ar: 'المدخل', en: 'Entrance' },
    'room-garden': { ar: 'الحديقة', en: 'Garden' },
    'room-garage': { ar: 'الجراج', en: 'Garage' },
    'room-other': { ar: 'أخرى', en: 'Other' },

    'additional-title': { ar: 'متطلبات إضافية', en: 'Additional Requirements' },
    'additional-label': { ar: 'أخبرنا بأي تفاصيل أو وظائف إضافية ترغب أن يقوم بها منزلك الذكي.', en: 'Tell us anything else you would like your Smart Home to do.' },
    'additional-placeholder': { ar: 'صف أي متطلبات خاصة أو تفضيلات أو أفكار لديك لمنزلك الذكي...', en: 'Describe any special requirements, preferences, or ideas you have for your smart home...' },

    'contact-title': { ar: 'طريقة التواصل المفضلة', en: 'Contact Preference' },
    'contact-note': { ar: 'كيف تفضل أن نتواصل معك؟', en: 'How would you prefer us to contact you?' },
    'contact-phone': { ar: 'مكالمة هاتفية', en: 'Phone Call' },
    'contact-whatsapp': { ar: 'واتساب', en: 'WhatsApp' },
    'contact-email': { ar: 'البريد الإلكتروني', en: 'Email' },
    'contact-error': { ar: 'يرجى اختيار طريقة التواصل المفضلة.', en: 'Please select a contact preference.' },

    'submit-btn': { ar: 'إرسال متطلباتي', en: 'Submit My Requirements' },
    'form-note': { ar: 'سنقوم بمراجعة متطلباتك والتواصل معك في غضون 24 ساعة.', en: 'We\'ll review your requirements and get back to you within 24 hours.' },

    'success-title': { ar: 'شكراً لك', en: 'Thank You' },
    'success-desc': { ar: 'تم استلام متطلباتك، وسيقوم فريقنا بمراجعتها والتواصل معك قريباً.', en: 'Your requirements have been received. Our team will review them and contact you shortly.' },
    'success-back': { ar: 'العودة إلى المنزل الذكي', en: 'Back to Smart Home' },

    // Footer
    'footer-desc': { ar: 'Engineering Smart Solutions Office — نقدم حلولاً هندسية ذكية ترتقي بمشاريعك إلى المستقبل.', en: 'Engineering Smart Solutions Office — delivering intelligent, integrated systems for modern living.' },
    'footer-quick-links': { ar: 'روابط سريعة', en: 'Quick Links' },
    'footer-contact-title': { ar: 'اتصل بنا', en: 'Contact Us' },
    'footer-copyright': { ar: '© 2026 ESSO - جميع الحقوق محفوظة', en: '© 2026 ESSO — All rights reserved.' }
};

let currentLang = localStorage.getItem('esso-lang') || 'ar';

function getTranslation(key) {
    const entry = translations[key];
    if (!entry) return key;
    return entry[currentLang] || entry['ar'] || key;
}

function translatePage() {
    // Update all elements with data-key attribute
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const translation = getTranslation(key);
        if (translation) {
            // If it's a placeholder, input, or textarea, set placeholder
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            } else {
                el.textContent = translation;
            }
        }
    });

    // Update select options with data-key
    document.querySelectorAll('select option[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const translation = getTranslation(key);
        if (translation) el.textContent = translation;
    });

    // Update the language toggle button text
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = currentLang === 'ar' ? 'EN' : 'عربي';
    }

    // Set RTL/LTR
    const html = document.documentElement;
    if (currentLang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
        html.style.textAlign = 'right';
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
        html.style.textAlign = 'left';
    }

    // Update navigation links to point to the correct pages
    // (The nav links are already pointing to the correct pages; no change needed)
}

function switchLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('esso-lang', currentLang);
    translatePage();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial language from localStorage
    const savedLang = localStorage.getItem('esso-lang');
    if (savedLang) {
        currentLang = savedLang;
    }
    translatePage();

    // Set up language toggle
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', switchLanguage);
    }
});