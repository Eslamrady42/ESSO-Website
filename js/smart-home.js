(() => {
  'use strict';

  const app = document.getElementById('smart-home-app');
  if (!app) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const base = location.pathname.replace(/[^/]*$/, '');
  const API = (p) => base + p.replace(/^\//, '');

  const t = {
    ar: {
      steps: ['البيانات', 'المتطلبات', 'المخطط', 'التحليل', 'المراجعة'],
      name: 'الاسم الكامل *', email: 'البريد الإلكتروني *', phone: 'رقم الهاتف *',
      type: 'نوع المشروع', area: 'المساحة م²', floors: 'عدد الأدوار', location: 'الموقع',
      requirements: 'اختر الأنظمة المطلوبة', plan: 'رفع المخطط',
      planHint: 'JPG / PNG / PDF / DXF / DWG — حتى 10MB لكل ملف',
      drop: 'اسحب الملفات هنا أو اضغط للاختيار', analyze: 'تحليل المخطط',
      next: 'التالي', back: 'السابق', result: 'ملخص BOQ وتوزيع الأجهزة',
      review: 'المراجعة الهندسية', send: 'إرسال طلب التصميم النهائي', notes: 'ملاحظات إضافية', chooseSystem: 'اختر نظامًا واحدًا على الأقل للمتابعة.', selectedSystems: 'الأنظمة التي اخترتها',
      error: 'حدث خطأ. حاول مرة أخرى.', required: 'يرجى استكمال الاسم والبريد والهاتف.',
      ai: 'جاري تحليل المخطط بالذكاء الاصطناعي...', openViewer: 'عرض قائمة الأجهزة',
      saved: 'تم تجهيز قائمة مبدئية بالأجهزة والكميات حسب المخطط.', rooms: 'الغرف', detected: 'تم اكتشافها',
      aiStatus: 'حالة تحليل AI', aiCompleted: 'تم التحليل', aiNotRun: 'لم يتم تشغيل AI', aiError: 'تعذر إكمال التحليل',
      roomBreakdown: 'الغرف المكتشفة من المخطط', devices: 'توزيع الأجهزة حسب الغرفة', boq: 'جدول الكميات المبدئي (BOQ)',
      confidence: 'الثقة', doors: 'أبواب', windows: 'شبابيك', typeLabel: 'النوع',
      floor: 'الدور', source: 'المصدر', requiredLabel: 'إلزامي', recommended: 'موصى به',
      reason: 'السبب', noRooms: 'لم يتم اكتشاف غرف موثوقة. ارفع مخططًا أوضح.',
      aiNeedsKey: 'ضع GEMINI_API_KEY في ملف .env على السيرفر (Gemini مجاني للتجربة).',
      geometry: 'تنبيه', preliminary: 'هذه قائمة مبدئية مبنية على الغرف التي أمكن تحديدها من المخطط. ستراجع ESSO الكميات والتوزيع قبل اعتماد عرض السعر أو التنفيذ.',
      viewPlan: 'عرض قائمة الأجهزة', viewerHint: 'يعرض التقرير قائمة الكميات وتوزيع الأجهزة فقط، دون مخطط 2D أو نموذج 3D.',
      retry: 'إعادة التحليل', noBaq: 'لم يتم إنشاء BOQ بعد.',
    },
    en: {
      steps: ['Project', 'Requirements', 'Plan', 'Analysis', 'Review'],
      name: 'Full Name *', email: 'Email *', phone: 'Phone *', type: 'Project Type',
      area: 'Area m²', floors: 'Floors', location: 'Location', requirements: 'Select required systems',
      plan: 'Upload Floor Plan', planHint: 'JPG / PNG / PDF / DXF / DWG — up to 10MB per file',
      drop: 'Drag files here or click to choose', analyze: 'Analyze Plan', next: 'Next', back: 'Back',
      result: 'Preliminary BOQ & Device Distribution', review: 'Engineering Review', send: 'Request Final Design',
      notes: 'Additional notes', error: 'Something went wrong. Please try again.',
      required: 'Please complete name, email and phone.', chooseSystem: 'Select at least one system to continue.', selectedSystems: 'Systems You Selected', ai: 'Analyzing your floor plan with AI...',
      openViewer: 'View Device List', saved: 'A preliminary device and quantity list has been prepared from the plan.',
      rooms: 'Rooms', detected: 'detected', aiStatus: 'AI analysis status', aiCompleted: 'Completed',
      aiNotRun: 'Not run', aiError: 'Analysis failed', roomBreakdown: 'Rooms Identified from the Plan',
      devices: 'Device Distribution by Room', boq: 'Preliminary Bill of Quantities (BOQ)', confidence: 'Confidence',
      doors: 'Doors', windows: 'Windows', typeLabel: 'Type', floor: 'Floor', source: 'Source',
      requiredLabel: 'Required', recommended: 'Recommended', reason: 'Reason',
      noRooms: 'No reliable rooms were detected. Upload a clearer plan.',
      aiNeedsKey: 'Configure GEMINI_API_KEY in the server .env file (Gemini free tier for testing).',
      geometry: 'Important Note', preliminary: 'This is a preliminary list based on the rooms identifiable in the uploaded plan. ESSO will review quantities and distribution before approving a quotation or execution.',
      viewPlan: 'View Device List', viewerHint: 'This report shows the device quantities and room distribution only; no 2D plan or 3D model is displayed.',
      retry: 'Analyze Again', noBaq: 'No BOQ was generated yet.',
    }
  }[lang];

  // The customer can choose only these 12 systems; keep this order aligned with the ESSO offer.
  const arReq = {
    lighting: 'الإضاءة',
    curtains: 'الستائر',
    hvac: 'التكييف',
    cctv: 'الكاميرات',
    access_control: 'الكوالين',
    smoke_sensors: 'حساسات الدخان / إنذار الحريق',
    motion_sensors: 'حساسات الحركة/الوجود',
    temperature_sensors: 'حساسات الحرارة',
    gas_sensors: 'حساسات الغاز',
    water_leak: 'تسرب المياه',
    voice_control: 'تحكم صوتي',
    networking: 'الشبكات'
  };
  const reqs = Object.entries({
    lighting: 'Lighting',
    curtains: 'Curtains',
    hvac: 'Air Conditioning',
    cctv: 'Cameras',
    access_control: 'Smart Locks',
    smoke_sensors: 'Smoke Sensors / Fire Alarm',
    motion_sensors: 'Motion / Presence Sensors',
    temperature_sensors: 'Temperature Sensors',
    gas_sensors: 'Gas Sensors',
    water_leak: 'Water Leak Sensors',
    voice_control: 'Voice Control',
    networking: 'Networking'
  });

  const state = { step: 0, data: { requirements: [] }, files: [], result: null, error: '' };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const apiJSON = async (url, opt = {}) => {
    if (location.hostname.toLowerCase().endsWith('.github.io') && String(url).startsWith('api/')) {
      throw new Error(lang === 'ar'
        ? 'نسخة GitHub Pages تعرض الواجهة فقط، ولا تشغّل PHP المطلوب لرفع المخطط وتحليله. لتفعيل BOQ الحقيقي يجب ربط الموقع بخادم يدعم PHP وضبط Gemini على الخادم.'
        : 'The GitHub Pages version serves the interface only and cannot run the PHP backend required for uploads and analysis. To enable real BOQ analysis, connect the site to a PHP-capable server and configure Gemini server-side.');
    }
    const r = await fetch(API(url), { credentials: 'same-origin', ...opt });
    let j = null;
    try { j = await r.json(); } catch (_) { throw new Error('Invalid server response'); }
    if (!r.ok || j.success === false) throw new Error(j.message || t.error);
    return j;
  };

  async function csrf() {
    return (await apiJSON('api/csrf-token.php')).csrf_token;
  }

  function progress() {
    return `<div class="smart-home-progress">${t.steps.map((x, i) =>
      `<div class="step ${i === state.step ? 'active' : i < state.step ? 'done' : ''}">${i + 1}. ${x}</div>`
    ).join('')}</div>`;
  }

  function actions(back = true, label = t.next) {
    return `<div class="smart-actions">${back
      ? `<button type="button" class="smart-btn secondary" id="backBtn">${t.back}</button>`
      : '<span></span>'
    }<button type="button" class="smart-btn primary" id="nextBtn">${label}</button></div>`;
  }

  function render() {
    let c = '';
    if (state.step === 0) c = project();
    if (state.step === 1) c = requirements();
    if (state.step === 2) c = upload();
    if (state.step === 3) c = loading();
    if (state.step === 4) c = results();
    app.innerHTML = `<div class="smart-home-shell">${progress()}<section class="smart-card">${
      state.error ? `<div class="smart-error">${esc(state.error)}</div>` : ''
    }${c}</section></div>`;
    bind();
  }

  function project() {
    const d = state.data;
    return `<h2>${t.steps[0]}</h2><p class="smart-muted">${lang === 'ar'
      ? 'بيانات المشروع هي الأساس للنموذج الرقمي الموحد وتحليل المخطط.'
      : 'Project details help us understand your needs and prepare a preliminary device list and BOQ from the floor plan.'}</p>
      <div class="smart-grid">
        <div class="smart-field"><label>${t.name}</label><input id="name" value="${esc(d.name)}" autocomplete="name"></div>
        <div class="smart-field"><label>${t.email}</label><input id="email" type="email" value="${esc(d.email)}" autocomplete="email"></div>
        <div class="smart-field"><label>${t.phone}</label><input id="phone" value="${esc(d.phone)}" autocomplete="tel"></div>
        <div class="smart-field"><label>${t.type}</label><select id="project_type">
          <option value="villa">${lang === 'ar' ? 'فيلا' : 'Villa'}</option>
          <option value="apartment">${lang === 'ar' ? 'شقة' : 'Apartment'}</option>
          <option value="office">${lang === 'ar' ? 'مكتب' : 'Office'}</option>
          <option value="commercial">${lang === 'ar' ? 'تجاري' : 'Commercial'}</option>
          <option value="other">${lang === 'ar' ? 'أخرى' : 'Other'}</option>
        </select></div>
        <div class="smart-field"><label>${t.area}</label><input id="area" type="number" min="1" max="100000" value="${esc(d.area)}"></div>
        <div class="smart-field"><label>${t.floors}</label><input id="floors" type="number" min="1" max="100" value="${esc(d.floors)}"></div>
        <div class="smart-field full"><label>${t.location}</label><input id="location" value="${esc(d.location)}"></div>
      </div>${actions(false)}`;
  }

  function requirements() {
    return `<h2>${t.requirements}</h2><p class="smart-muted">${lang === 'ar'
      ? 'الأنظمة التي تختارها هنا هي التي ستظهر توصياتها في قائمة الأجهزة والكميات. لن نضيف أجهزة تخص أنظمة غير مختارة.'
      : 'The systems selected here determine which devices appear in the recommendation and quantity list. Devices from unselected systems will not be added.'}</p>
      <div class="smart-checks">${reqs.map(([k, label]) =>
        `<label class="smart-check"><input type="checkbox" value="${k}" ${state.data.requirements.includes(k) ? 'checked' : ''}> ${esc(lang === 'ar' ? (arReq[k] || label) : label)}</label>`
      ).join('')}</div>${actions(true)}`;
  }

  function upload() {
    return `<h2>${t.plan}</h2><p class="smart-muted">${t.planHint}</p>
      <div class="smart-upload" id="drop"><i class="fas fa-cloud-upload-alt"></i><div>${t.drop}</div><input id="fileInput" type="file" accept=".jpg,.jpeg,.png,.pdf,.dxf,.dwg" multiple hidden></div>
      <div class="smart-files">${state.files.map((f, i) =>
        `<div class="smart-file"><span>${esc(f.name)} (${Math.round(f.size / 1024)} KB)</span><button type="button" class="smart-btn secondary remove" data-i="${i}">×</button></div>`
      ).join('')}</div>${actions(true, t.analyze)}`;
  }

  function loading() {
    return `<h2>${t.ai}</h2><div class="smart-loader"><span class="smart-spinner"></span><strong>${t.ai}</strong></div>
      <div class="smart-stage-list">
        <div class="smart-stage active">1. ${lang === 'ar' ? 'قراءة الملفات' : 'Read files'}</div>
        <div class="smart-stage active">2. ${lang === 'ar' ? 'اكتشاف الأدوار والغرف' : 'Detect floors and rooms'}</div>
        <div class="smart-stage active">3. ${lang === 'ar' ? 'اكتشاف الأبواب والشبابيك والأبعاد' : 'Detect doors, windows and dimensions'}</div>
        <div class="smart-stage active">4. ${lang === 'ar' ? 'تطبيق قواعد ESSO للـ BOQ' : 'Apply ESSO BOQ rules'}</div>
        <div class="smart-stage active">5. ${lang === 'ar' ? 'إعداد BOQ وتوزيع الأجهزة حسب الغرف' : 'Prepare BOQ and room-by-room device distribution'}</div>
      </div>`;
  }

  function statusBadge(ai) {
    const status = ai?.status || 'not_run';
    const label = status === 'completed' ? t.aiCompleted : status === 'error' ? t.aiError : t.aiNotRun;
    const cls = status === 'completed' ? '' : 'review';
    return `<span class="smart-badge ${cls}">${esc(label)}</span>`;
  }

  function roomRows(floors) {
    if (!floors.length) return `<tr><td colspan="7">${t.noRooms}</td></tr>`;
    return floors.flatMap(f => (f.rooms || []).map(r => `<tr>
      <td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${esc(f.floor_number)}</td>
      <td>${r.area_sqm != null ? esc(r.area_sqm) : 'TBD'}</td><td>${r.doors || 0}</td><td>${r.windows || 0}</td>
      <td>${Math.round(r.confidence || 0)}%</td>
    </tr>`)).join('');
  }

  function deviceRows(rec) {
    if (!rec.length) return `<tr><td colspan="6">${t.noBaq}</td></tr>`;
    return rec.map(x => `<tr>
      <td>${esc(x.room)}</td><td>${esc(x.type)}</td><td>${esc(x.qty)}</td><td>${esc(x.category)}</td>
      <td>${esc(x.reason)}</td><td>${x.required === 'required' ? `<span class="smart-badge">${t.requiredLabel}</span>` : `<span class="smart-badge review">${t.recommended}</span>`}</td>
    </tr>`).join('');
  }

  function boqRows(boq) {
    if (!boq.length) return `<tr><td colspan="5">${t.noBaq}</td></tr>`;
    return boq.map(x => `<tr>
      <td>${esc(x.category)}</td><td>${esc(x.item)}</td><td>${esc(x.quantity)}</td>
      <td>${x.rooms?.length ? esc(x.rooms.join(', ')) : 'Project'}</td>
      <td>${x.required ? `<span class="smart-badge">${t.requiredLabel}</span>` : `<span class="smart-badge review">${t.recommended}</span>`}</td>
    </tr>`).join('');
  }

  function results() {
    const r = state.result || {};
    const a = r.analysis || {};
    const floors = a.floors || [];
    const rec = r.recommendations || [];
    const boq = r.boq || [];
    const ai = r.ai || {};
    const token = r.project_token || '';
    const rooms = floors.reduce((n, f) => n + (f.rooms || []).length, 0);
    const totalDevices = rec.reduce((n, x) => n + (Number(x.qty) || 0), 0);
    const roomGroups = new Map();
    rec.forEach(x => {
      const room = String(x.room || (lang === 'ar' ? 'أماكن عامة' : 'General area'));
      if (!roomGroups.has(room)) roomGroups.set(room, new Map());
      const rawType = String(x.type || x.item || (lang === 'ar' ? 'جهاز ذكي' : 'Smart device')).trim();
      const itemKey = rawType.toLocaleLowerCase();
      const group = roomGroups.get(room);
      const isRequired = x.required === 'required' || x.required === true;
      if (!group.has(itemKey)) {
        group.set(itemKey, {
          ...x,
          type: rawType,
          qty: Number(x.qty) || 0,
          required: isRequired,
          reasons: x.reason ? [String(x.reason)] : []
        });
      } else {
        const existing = group.get(itemKey);
        existing.qty += Number(x.qty) || 0;
        existing.required = existing.required || isRequired;
        const reason = String(x.reason || '').trim();
        if (reason && !existing.reasons.includes(reason)) existing.reasons.push(reason);
      }
    });

    const distributionHtml = roomGroups.size ? Array.from(roomGroups.entries()).map(([room, itemMap]) => {
      const items = Array.from(itemMap.values());
      const roomQty = items.reduce((n, x) => n + (Number(x.qty) || 0), 0);
      const requiredItems = items.filter(x => x.required).map((x, index) => ({ ...x, _order: index }));
      const recommendedItems = items.filter(x => !x.required).map((x, index) => ({ ...x, _order: index }));
      const renderRows = groupItems => groupItems.map(x => {
        const reasons = Array.isArray(x.reasons) ? x.reasons : (x.reason ? [x.reason] : []);
        const purpose = reasons.join(lang === 'ar' ? '؛ ' : '; ') ||
          (lang === 'ar' ? 'مقترح لهذه الغرفة ضمن قواعد ESSO.' : 'Recommended for this room under ESSO rules.');
        return '<div class="smart-room-device-row"><div class="smart-room-device-copy"><strong>' +
          esc(x.type) + '</strong><p>' + esc(purpose) + '</p></div><span class="smart-room-qty">' +
          esc(x.qty) + ' ' + (lang === 'ar' ? 'قطعة' : 'pcs') + '</span><span class="smart-badge ' +
          (x.required ? '' : 'review') + '">' + (x.required ? t.requiredLabel : t.recommended) +
          '</span></div>';
      }).join('');
      const requiredBlock = requiredItems.length
        ? '<div class="smart-room-group"><h5 class="smart-room-group-title">' +
          (lang === 'ar' ? 'إلزامي' : 'Required') + '</h5>' + renderRows(requiredItems) + '</div>'
        : '';
      const recommendedBlock = recommendedItems.length
        ? '<div class="smart-room-group"><h5 class="smart-room-group-title">' +
          (lang === 'ar' ? 'مقترح' : 'Recommended') + '</h5>' + renderRows(recommendedItems) + '</div>'
        : '';
      return '<article class="smart-room-card"><div class="smart-room-card-head"><h4>' +
        esc(room) + '</h4><span class="smart-room-count">' + roomQty + ' ' +
        (lang === 'ar' ? 'جهاز' : 'devices') + '</span></div><div class="smart-room-device-list">' +
        requiredBlock + recommendedBlock + '</div></article>';
    }).join('') : '<div class="smart-info">' + esc(t.noBaq) + '</div>';
    const formatMoney = value => {
      if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
        return lang === 'ar' ? 'يحدد لاحقًا' : 'To be confirmed';
      }
      const amount = Number(value).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 });
      return lang === 'ar' ? amount + ' ج.م.' : 'EGP ' + amount;
    };
    const isPriced = item => item.unit_price !== null && item.unit_price !== undefined &&
      item.total !== null && item.total !== undefined &&
      Number.isFinite(Number(item.unit_price)) && Number.isFinite(Number(item.total));
    const pricedLines = boq.filter(isPriced);
    const unpricedLines = boq.filter(item => !isPriced(item));
    const pricedSubtotal = pricedLines.reduce((sum, item) => sum + Number(item.total), 0);
    const boqHtml = boq.length ? boq.map(x => {
      const itemRooms = Array.isArray(x.rooms) ? x.rooms.join(lang === 'ar' ? '، ' : ', ') : (x.rooms || '—');
      const required = x.required === true || x.required === 'required';
      const unitPrice = isPriced(x) ? formatMoney(x.unit_price) : (lang === 'ar' ? 'يحدد لاحقًا' : 'Quote required');
      const lineTotal = isPriced(x) ? formatMoney(x.total) : '—';
      const priceNote = lang === 'ar' ? (x.price_note_ar || '') : (x.price_note_en || '');
      return '<tr><td><strong>' + esc(x.item || x.type || '—') + (priceNote ? '<small class="smart-price-note">' + esc(priceNote) + '</small>' : '') +
        '</td><td>' + esc(x.category || '—') + '</td><td class="smart-qty-cell">' + esc(x.quantity ?? 0) +
        '</td><td>' + esc(itemRooms) + '</td><td class="smart-price-cell">' + unitPrice +
        '</td><td class="smart-price-cell">' + lineTotal + '</td><td><span class="smart-badge ' + (required ? '' : 'review') + '">' +
        (required ? t.requiredLabel : t.recommended) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="7">' + esc(t.noBaq) + '</td></tr>';
    const unpricedNames = unpricedLines.map(item => item.item || item.type || (lang === 'ar' ? 'بند غير مسعّر' : 'Unpriced item')).join(lang === 'ar' ? '، ' : ', ');
    const pricingSummaryHtml = boq.length ? '<section class="smart-price-summary"><h3>' +
      (lang === 'ar' ? 'السعر المبدئي للأجهزة' : 'Preliminary Equipment Estimate') +
      '</h3><div class="smart-price-total"><span>' +
      (unpricedLines.length
        ? (lang === 'ar' ? 'المجموع الجزئي للبنود المسعّرة' : 'Subtotal of priced items')
        : (lang === 'ar' ? 'إجمالي الأجهزة المبدئي' : 'Preliminary equipment total')) +
      '</span><strong>' + formatMoney(pricedSubtotal) + '</strong></div>' +
      (unpricedLines.length
        ? '<p class="smart-price-warning">' + (lang === 'ar'
            ? 'الإجمالي لا يشمل البنود التي تحتاج إلى تحديد سعر أو موديل: ' + esc(unpricedNames) + '.'
            : 'This subtotal excludes items that still need a confirmed model or price: ' + esc(unpricedNames) + '.') + '</p>'
        : '') +
      '<p class="smart-price-footnote">' + (lang === 'ar'
        ? 'تقدير مبدئي للأجهزة حسب أسعار الكتالوج وأسعار مرجعية لبعض الموديلات. لا يشمل التركيب أو البرمجة أو التمديدات، كما أن مسار الستائر والقماش وأعمال CCTV الإضافية غير مشمولة. يعتمد السعر النهائي بعد تأكيد الموديلات ومعاينة متطلبات التنفيذ.'
        : 'Budgetary equipment estimate using ESSO catalog prices and reference models for some items. Installation, programming and wiring are excluded; curtain tracks/fabric and additional CCTV works are also excluded. Final pricing depends on confirmed models and installation requirements.') +
      '</p></section>' : '';
    const roomLabel = lang === 'ar' ? 'الغرف المكتشفة' : 'Rooms identified';
    const selectedSystemLabels = state.data.requirements.map(k => {
      const match = reqs.find(entry => entry[0] === k);
      return lang === 'ar' ? (arReq[k] || (match ? match[1] : k)) : (match ? match[1] : k);
    });
    const selectedSystemsHtml = selectedSystemLabels.map(label => '<span class="smart-selected-system">' + esc(label) + '</span>').join('');
    const deviceLabel = lang === 'ar' ? 'إجمالي الأجهزة' : 'Total devices';
    const itemLabel = lang === 'ar' ? 'بنود BOQ' : 'BOQ line items';
    const statusText = ai.status === 'completed' ? (lang === 'ar' ? 'اكتمل التحليل المبدئي' : 'Preliminary analysis complete') : (ai.status === 'error' ? t.aiError : t.aiNotRun);
    return '<h2>' + esc(t.result) + '</h2>' +
      '<p class="smart-muted">' + (lang === 'ar' ? 'راجع الأجهزة المقترحة لكل غرفة ثم جدول الكميات الإجمالي. لا يتم عرض مخطط 2D أو نموذج 3D للعميل.' : 'Review the proposed devices for each room, then the consolidated BOQ. No customer-facing 2D plan or 3D model is shown.') + '</p>' +
      '<div class="smart-result-head"><div class="smart-info"><strong>' + (lang === 'ar' ? 'حالة التحليل:' : 'Analysis status:') + '</strong> <span class="smart-badge ' + (ai.status === 'completed' ? '' : 'review') + '">' + esc(statusText) + '</span></div>' +
      ((ai.status === 'not_run' || ai.status === 'error') ? '<div class="smart-error">' + esc(t.aiNeedsKey) + '</div>' : '') + '</div>' +
      '<div class="smart-summary"><div class="smart-stat"><span>' + roomLabel + '</span><strong>' + rooms + '</strong></div>' +
      '<div class="smart-stat"><span>' + deviceLabel + '</span><strong>' + totalDevices + '</strong></div>' +
      '<div class="smart-stat"><span>' + itemLabel + '</span><strong>' + boq.length + '</strong></div></div>' +
      '<h3 style="margin-top:24px">' + esc(t.selectedSystems) + '</h3>' +
      '<div class="smart-selected-systems">' + selectedSystemsHtml + '</div>' +
      '<h3 style="margin-top:24px">' + esc(t.devices) + '</h3>' +
      '<p class="smart-muted">' + (lang === 'ar' ? 'توزيع الأجهزة مبني على الغرف التي تم التعرف عليها في المخطط المرفوع.' : 'Device distribution is based on the rooms identified in the uploaded plan.') + '</p>' +
      '<div class="smart-room-distribution">' + distributionHtml + '</div>' +
      '<h3 style="margin-top:28px">' + esc(t.boq) + '</h3>' +
      '<div class="smart-table-wrap"><table class="smart-table"><thead><tr><th>' + (lang === 'ar' ? 'البند' : 'Item') + '</th><th>' + (lang === 'ar' ? 'الفئة' : 'Category') + '</th><th>' + (lang === 'ar' ? 'الكمية' : 'Quantity') + '</th><th>' + (lang === 'ar' ? 'الغرف المستهدفة' : 'Rooms') + '</th><th>' + (lang === 'ar' ? 'سعر الوحدة' : 'Unit Price') + '</th><th>' + (lang === 'ar' ? 'الإجمالي' : 'Line Total') + '</th><th>' + (lang === 'ar' ? 'الحالة' : 'Status') + '</th></tr></thead><tbody>' + boqHtml + '</tbody></table></div>' +
      pricingSummaryHtml +
      '<div class="smart-info smart-boq-note" style="margin-top:22px"><strong>' + esc(t.geometry) + '</strong><p>' + esc(t.preliminary) + '</p></div>' +
      (token ? '<div class="smart-field"><label for="requestNotes">' + esc(t.notes) + '</label><textarea id="requestNotes" placeholder="' + (lang === 'ar' ? 'أي تفضيلات أو ملاحظات إضافية...' : 'Any extra preferences or notes...') + '"></textarea></div><div class="smart-actions"><button type="button" class="smart-btn accent" id="submitBtn">' + esc(t.send) + '</button></div>' : '<div class="smart-actions"><button type="button" class="smart-btn secondary" id="backBtn">' + esc(t.retry) + '</button></div>');
  }
  function bind() {
    document.getElementById('backBtn')?.addEventListener('click', () => {
      state.error = '';
      state.step = Math.max(0, state.step - 1);
      render();
    });

    document.getElementById('nextBtn')?.addEventListener('click', () => {
      state.error = '';
      if (state.step === 0) {
        state.data.name = document.getElementById('name').value.trim();
        state.data.email = document.getElementById('email').value.trim();
        state.data.phone = document.getElementById('phone').value.trim();
        state.data.project_type = document.getElementById('project_type').value;
        state.data.area = document.getElementById('area').value;
        state.data.floors = document.getElementById('floors').value;
        state.data.location = document.getElementById('location').value.trim();
        if (!state.data.name || !state.data.email || !state.data.phone) {
          state.error = t.required;
          render();
          return;
        }
        state.step = 1;
        render();
      } else if (state.step === 1) {
        state.data.requirements = [...document.querySelectorAll('.smart-check input:checked')].map(x => x.value);
        if (!state.data.requirements.length) {
          state.error = t.chooseSystem;
          render();
          return;
        }
        state.step = 2;
        render();
      } else if (state.step === 2) {
        runAnalysis();
      }
    });

    document.querySelectorAll('.remove').forEach(b => b.addEventListener('click', () => {
      state.files.splice(+b.dataset.i, 1);
      render();
    }));

    document.getElementById('submitBtn')?.addEventListener('click', submitRequest);

    const drop = document.getElementById('drop');
    const input = document.getElementById('fileInput');
    if (drop && input) {
      drop.addEventListener('click', () => input.click());
      drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
      drop.addEventListener('drop', e => {
        e.preventDefault();
        drop.classList.remove('drag');
        state.files = [...e.dataTransfer.files].filter(f => f.size <= 10 * 1024 * 1024);
        render();
      });
      input.addEventListener('change', () => {
        state.files = [...input.files].filter(f => f.size <= 10 * 1024 * 1024);
        render();
      });
    }
  }

  async function runAnalysis() {
    if (!state.files.length) {
      state.error = lang === 'ar' ? 'اختر ملفًا واحدًا على الأقل.' : 'Select at least one file.';
      render();
      return;
    }

    state.error = '';
    state.step = 3;
    render();

    try {
      const token = await csrf();
      const fd = new FormData();
      state.files.forEach(f => fd.append('files[]', f));
      fd.append('csrf_token', token);

      const up = await apiJSON('api/upload.php', { method: 'POST', body: fd });
      const an = await apiJSON('api/analyze.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csrf_token: token,
          files: up.files.map(x => x.id),
          requirements: state.data.requirements,
          project: state.data
        })
      });

      const saved = await apiJSON('api/project.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csrf_token: token,
          project: state.data,
          analysis: an.analysis,
          recommendations: an.recommendations,
          boq: an.boq,
          review_required: an.review_required,
          files: up.files
        })
      });

      state.result = { ...an, ...saved };
      state.step = 4;
      render();
    } catch (e) {
      state.error = e.message || t.error;
      state.step = 2;
      render();
    }
  }

  async function submitRequest() {
    try {
      const token = await csrf();
      const notes = document.getElementById('requestNotes')?.value?.trim() || '';
      await apiJSON('api/final-request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf_token: token, project_token: state.result.project_token, notes })
      });
      state.error = '';
      app.innerHTML = `<div class="smart-home-shell"><section class="smart-card"><div class="smart-info"><h2>${lang === 'ar' ? 'تم إرسال طلبك بنجاح' : 'Request submitted successfully'}</h2><p>${lang === 'ar'
        ? 'سيراجع فريق ESSO المشروع ويتواصل معك بالخطوات التالية.'
        : 'The ESSO team will review the project and contact you with the next steps.'}</p></div></section></div>`;
    } catch (e) {
      state.error = e.message || t.error;
      render();
    }
  }

  render();
})();
