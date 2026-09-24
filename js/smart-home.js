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
      next: 'التالي', back: 'السابق', result: 'نتائج التحليل والتصميم',
      review: 'المراجعة الهندسية', send: 'إرسال طلب التصميم النهائي', notes: 'ملاحظات إضافية',
      error: 'حدث خطأ. حاول مرة أخرى.', required: 'يرجى استكمال الاسم والبريد والهاتف.',
      ai: 'جاري تحليل المخطط بالذكاء الاصطناعي...', openViewer: 'فتح المعاينة التفاعلية',
      saved: 'تم إنشاء المعاينة الخاصة بمشروعك.', rooms: 'الغرف', detected: 'تم اكتشافها',
      aiStatus: 'حالة تحليل AI', aiCompleted: 'تم التحليل', aiNotRun: 'لم يتم تشغيل AI', aiError: 'تعذر إكمال التحليل',
      roomBreakdown: 'تحليل الغرف', devices: 'الأجهزة المقترحة حسب الغرفة', boq: 'BOQ مبدئي',
      confidence: 'الثقة', doors: 'أبواب', windows: 'شبابيك', typeLabel: 'النوع',
      floor: 'الدور', source: 'المصدر', requiredLabel: 'إلزامي', recommended: 'موصى به',
      reason: 'السبب', noRooms: 'لم يتم اكتشاف غرف موثوقة. ارفع مخططًا أوضح.',
      aiNeedsKey: 'ضع GEMINI_API_KEY في ملف .env على السيرفر (Gemini مجاني للتجربة).',
      geometry: 'المخطط الرقمي', preliminary: 'المخطط الرقمي أولي وغير معتمد للتنفيذ.',
      viewPlan: 'عرض المخطط الرقمي', viewerHint: 'المعاينة تفاعلية ويمكن استعراض الغرف والأجهزة.',
      retry: 'إعادة التحليل', noBaq: 'لم يتم إنشاء BOQ بعد.',
    },
    en: {
      steps: ['Project', 'Requirements', 'Plan', 'Analysis', 'Review'],
      name: 'Full Name *', email: 'Email *', phone: 'Phone *', type: 'Project Type',
      area: 'Area m²', floors: 'Floors', location: 'Location', requirements: 'Select required systems',
      plan: 'Upload Floor Plan', planHint: 'JPG / PNG / PDF / DXF / DWG — up to 10MB per file',
      drop: 'Drag files here or click to choose', analyze: 'Analyze Plan', next: 'Next', back: 'Back',
      result: 'Analysis & Design Results', review: 'Engineering Review', send: 'Request Final Design',
      notes: 'Additional notes', error: 'Something went wrong. Please try again.',
      required: 'Please complete name, email and phone.', ai: 'Analyzing your floor plan with AI...',
      openViewer: 'Open Interactive Preview', saved: 'Your private project preview has been created.',
      rooms: 'Rooms', detected: 'detected', aiStatus: 'AI analysis status', aiCompleted: 'Completed',
      aiNotRun: 'Not run', aiError: 'Analysis failed', roomBreakdown: 'Room Analysis',
      devices: 'Room-by-room Device Plan', boq: 'Preliminary BOQ', confidence: 'Confidence',
      doors: 'Doors', windows: 'Windows', typeLabel: 'Type', floor: 'Floor', source: 'Source',
      requiredLabel: 'Required', recommended: 'Recommended', reason: 'Reason',
      noRooms: 'No reliable rooms were detected. Upload a clearer plan.',
      aiNeedsKey: 'Configure GEMINI_API_KEY in the server .env file (Gemini free tier for testing).',
      geometry: 'Digital Floor Plan', preliminary: 'This digital floor plan is preliminary and not approved for construction.',
      viewPlan: 'View Digital Plan', viewerHint: 'The preview is interactive and shows rooms and devices.',
      retry: 'Analyze Again', noBaq: 'No BOQ was generated yet.',
    }
  }[lang];

  const arReq = {
    lighting: 'الإضاءة', curtains: 'الستائر', hvac: 'التكييف', security: 'الأمن', cctv: 'الكاميرات',
    access_control: 'التحكم بالدخول', door_sensors: 'حساسات الأبواب', window_sensors: 'حساسات النوافذ',
    motion_sensors: 'حساسات الحركة/الوجود', temperature_sensors: 'حساسات الحرارة', gas_sensors: 'حساسات الغاز',
    water_leak: 'تسرب المياه', voice_control: 'تحكم صوتي', mobile_control: 'تحكم بالموبايل',
    central_panel: 'لوحة مركزية', networking: 'الشبكات', scenes: 'المشاهد', home_assistant: 'Home Assistant'
  };
  const reqs = Object.entries({
    lighting: 'Lighting', curtains: 'Curtains', hvac: 'HVAC', security: 'Security', cctv: 'CCTV',
    access_control: 'Access Control', door_sensors: 'Door Sensors', window_sensors: 'Window Sensors',
    motion_sensors: 'Motion / Presence', temperature_sensors: 'Temperature Sensors', gas_sensors: 'Gas Sensors',
    water_leak: 'Water Leak', voice_control: 'Voice Control', mobile_control: 'Mobile App',
    central_panel: 'Central Panel', networking: 'Networking', scenes: 'Scenes', home_assistant: 'Home Assistant'
  });

  const state = { step: 0, data: { requirements: [] }, files: [], result: null, error: '' };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const apiJSON = async (url, opt = {}) => {
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
      : 'Project data becomes the basis for the unified digital model and plan analysis.'}</p>
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
      ? 'هذه الاختيارات تضيف الأنظمة الاختيارية. تعليمات تحليل AI تتم إدارتها من ملفات إعداد ESSO على السيرفر.'
      : 'These selections add optional systems. AI analysis instructions are managed in ESSO server configuration files.'}</p>
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
        <div class="smart-stage active">5. ${lang === 'ar' ? 'بناء المخطط الرقمي والمعاينة' : 'Build digital floor plan and preview'}</div>
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
    const reviews = r.review_required || [];
    const ai = r.ai || {};
    const token = r.project_token || '';
    const rooms = floors.reduce((n, f) => n + (f.rooms || []).length, 0);
    const viewerUrl = token ? `project-viewer.html?token=${encodeURIComponent(token)}` : '';

    return `<h2>${t.result}</h2>
      <div class="smart-result-head">
        <div class="smart-info"><strong>${t.aiStatus}:</strong> ${statusBadge(ai)} ${ai.model ? `<span class="smart-muted-inline">${esc(ai.model)}</span>` : ''}</div>
        ${ai.status === 'not_run' || ai.status === 'error' ? `<div class="smart-error">${t.aiNeedsKey}</div>` : ''}
      </div>
      <div class="smart-summary">
        <div class="smart-stat"><span>${t.area}</span><strong>${a.project?.total_area_sqm ?? state.data.area ?? 'TBD'}</strong></div>
        <div class="smart-stat"><span>${t.floors}</span><strong>${a.project?.floors_count || floors.length || state.data.floors || 'TBD'}</strong></div>
        <div class="smart-stat"><span>${t.rooms}</span><strong>${rooms}</strong></div>
        <div class="smart-stat"><span>${t.review}</span><strong>${reviews.length}</strong></div>
      </div>

      <h3>${t.roomBreakdown}</h3>
      <div class="smart-table-wrap"><table class="smart-table"><thead><tr>
        <th>${lang === 'ar' ? 'الغرفة' : 'Room'}</th><th>${t.typeLabel}</th><th>${t.floor}</th><th>${t.area}</th><th>${t.doors}</th><th>${t.windows}</th><th>${t.confidence}</th>
      </tr></thead><tbody>${roomRows(floors)}</tbody></table></div>

      <h3 style="margin-top:24px">${t.devices}</h3>
      <div class="smart-table-wrap"><table class="smart-table"><thead><tr>
        <th>${lang === 'ar' ? 'الغرفة' : 'Room'}</th><th>${lang === 'ar' ? 'الجهاز' : 'Device'}</th><th>${lang === 'ar' ? 'الكمية' : 'Qty'}</th><th>${lang === 'ar' ? 'الفئة' : 'Category'}</th><th>${t.reason}</th><th>${t.source}</th>
      </tr></thead><tbody>${deviceRows(rec)}</tbody></table></div>

      <h3 style="margin-top:24px">${t.boq}</h3>
      <div class="smart-table-wrap"><table class="smart-table"><thead><tr>
        <th>${lang === 'ar' ? 'الفئة' : 'Category'}</th><th>${lang === 'ar' ? 'البند' : 'Item'}</th><th>${lang === 'ar' ? 'الكمية' : 'Qty'}</th><th>${lang === 'ar' ? 'الغرف' : 'Rooms'}</th><th>${t.source}</th>
      </tr></thead><tbody>${boqRows(boq)}</tbody></table></div>

      <div class="smart-info" style="margin-top:24px"><strong>${t.geometry}</strong><p>${t.preliminary}</p><p>${t.viewerHint}</p></div>

      ${reviews.length ? `<div class="smart-info smart-review" style="margin-top:16px"><strong>${t.review}</strong><ul>${reviews.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${a.analysis_notes?.length ? `<div class="smart-info" style="margin-top:16px"><strong>${lang === 'ar' ? 'ملاحظات التحليل' : 'Analysis Notes'}</strong><ul>${a.analysis_notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}

      ${token ? `<div class="smart-info" style="margin-top:18px">${esc(t.saved)}</div>
        <div class="smart-actions">
          <a class="smart-btn secondary" href="${viewerUrl}">${t.openViewer}</a>
          <button type="button" class="smart-btn accent" id="submitBtn">${t.send}</button>
        </div>
        <div class="smart-field"><label>${t.notes}</label><textarea id="requestNotes"></textarea></div>`
        : `<div class="smart-actions"><button type="button" class="smart-btn secondary" id="backBtn">${t.retry}</button></div>`}`;
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
