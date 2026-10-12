(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const token = (params.get('token') || '').trim().toUpperCase();
  const isAr = document.documentElement.lang === 'ar';
  const tr = (en, ar) => isAr ? ar : en;
  const $ = (id) => document.getElementById(id);
  const base = location.pathname.replace(/[^/]*$/, '');
  const API = (path) => base + path.replace(/^\//, '');
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]);
  const asArray = (value) => Array.isArray(value) ? value : (value ? [value] : []);

  async function apiJSON(path) {
    const response = await fetch(API(path), { credentials: 'same-origin', cache: 'no-store' });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error(tr(
        'The saved BOQ report requires the PHP backend. GitHub Pages does not run PHP.',
        'عرض BOQ المحفوظ يحتاج إلى خادم PHP؛ خدمة GitHub Pages لا تشغّل PHP.'
      ));
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.message || tr('Unable to load the project.', 'تعذر تحميل المشروع.'));
    }
    return data;
  }

  function statusPill(required) {
    const yes = required === true || required === 'required';
    return '<span class="boq-status ' + (yes ? 'required' : 'recommended') + '">' +
      (yes ? tr('Essential', 'أساسي') : tr('Recommended', 'موصى به')) + '</span>';
  }

  function renderDistribution(rooms, devices) {
    const grouped = new Map();
    rooms.forEach((room) => {
      const name = String(room.name || tr('Unnamed room', 'غرفة بدون اسم'));
      if (!grouped.has(name)) grouped.set(name, []);
    });
    devices.forEach((device) => {
      const name = String(device.room || tr('General area', 'منطقة عامة'));
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(device);
    });

    if (!grouped.size) {
      return '<p class="boq-empty">' + tr('No room-level recommendations were saved for this project.', 'لا توجد توصيات محفوظة للأجهزة حسب الغرف في هذا المشروع.') + '</p>';
    }

    return Array.from(grouped.entries()).map(([roomName, items]) => {
      const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      const body = items.length ? items.map((item) => {
        const purpose = item.reason || tr(
          'Suggested for this room; final placement is confirmed during engineering review.',
          'مقترح لهذه الغرفة، ويُعتمد موضع التركيب بعد المراجعة الهندسية.'
        );
        return '<div class="boq-device-row"><div class="boq-device-copy"><strong>' +
          esc(item.type || item.item || tr('Smart device', 'جهاز ذكي')) +
          '</strong><p>' + esc(purpose) + '</p></div><span class="boq-quantity">' +
          esc(item.qty ?? 1) + ' ' + tr('pcs', 'قطعة') + '</span>' +
          statusPill(item.required) + '</div>';
      }).join('') : '<p class="boq-no-devices">' +
        tr('No devices proposed for this room.', 'لا توجد أجهزة مقترحة لهذه الغرفة.') + '</p>';

      return '<article class="boq-room-card"><div class="boq-room-header"><h3>' +
        esc(roomName) + '</h3><span class="boq-room-total">' + total + ' ' +
        tr('devices', 'أجهزة') + '</span></div><div class="boq-room-items">' +
        body + '</div></article>';
    }).join('');
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
      return tr('To be confirmed', 'يحدد لاحقًا');
    }
    const amount = Number(value).toLocaleString(isAr ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 });
    return isAr ? amount + ' ج.م.' : 'EGP ' + amount;
  }

  function isPriced(item) {
    return item.unit_price !== null && item.unit_price !== undefined &&
      item.total !== null && item.total !== undefined &&
      Number.isFinite(Number(item.unit_price)) && Number.isFinite(Number(item.total));
  }

  function renderPricingSummary(boq) {
    if (!boq.length) return '';
    const priced = boq.filter(isPriced);
    const unpriced = boq.filter(item => !isPriced(item));
    const sum = priced.reduce((total, item) => total + Number(item.total), 0);
    const names = unpriced.map(item => item.item || item.type || tr('Unpriced item', 'بند غير مسعّر'))
      .join(isAr ? '، ' : ', ');
    return '<section class="viewer-price-summary"><h2>' +
      tr('Preliminary Equipment Estimate', 'التقدير المبدئي للأجهزة') +
      '</h2><div class="viewer-price-total"><span>' +
      (unpriced.length
        ? tr('Subtotal of priced items', 'المجموع الجزئي للبنود المسعّرة')
        : tr('Preliminary equipment total', 'إجمالي الأجهزة المبدئي')) +
      '</span><strong>' + formatMoney(sum) + '</strong></div>' +
      (unpriced.length ? '<p class="viewer-price-warning">' +
        (isAr
          ? 'الإجمالي لا يشمل البنود التي تحتاج إلى تحديد سعر أو موديل: ' + esc(names) + '.'
          : 'This subtotal excludes items that still need a confirmed model or price: ' + esc(names) + '.') +
        '</p>' : '') +
      '<p class="viewer-price-footnote">' + tr(
        'Budgetary equipment estimate using ESSO catalog prices and reference models for some items. Installation, programming and wiring are excluded; curtain tracks/fabric and additional CCTV works are also excluded. Final pricing depends on confirmed models and installation requirements.',
        'تقدير مبدئي للأجهزة حسب أسعار كتالوج ESSO وأسعار مرجعية لبعض الموديلات. لا يشمل التركيب أو البرمجة أو التمديدات، كما أن مسار الستائر والقماش وأعمال CCTV الإضافية غير مشمولة. يعتمد السعر النهائي بعد تأكيد الموديلات ومتطلبات التنفيذ.'
      ) + '</p></section>';
  }

  function renderBOQ(boq) {
    if (!boq.length) {
      return '<p class="boq-empty">' + tr('No BOQ items were saved for this project.', 'لم يتم حفظ بنود BOQ لهذا المشروع.') + '</p>';
    }
    const rows = boq.map((item) => {
      const roomNames = Array.isArray(item.rooms) ? item.rooms.join(isAr ? '، ' : ', ') : (item.rooms || '—');
      const unitPrice = isPriced(item) ? formatMoney(item.unit_price) : tr('Quote required', 'يحتاج إلى تسعير');
      const lineTotal = isPriced(item) ? formatMoney(item.total) : '—';
      const priceNote = isAr ? (item.price_note_ar || '') : (item.price_note_en || '');
      return '<tr><td><strong>' + esc(item.item || item.type || '—') +
        (priceNote ? '<small class="viewer-price-note">' + esc(priceNote) + '</small>' : '') +
        '</strong></td><td>' + esc(item.category || '—') +
        '</td><td class="boq-number">' + esc(item.quantity ?? 0) +
        '</td><td>' + esc(roomNames) +
        '</td><td class="boq-number">' + unitPrice +
        '</td><td class="boq-number">' + lineTotal +
        '</td><td>' + statusPill(item.required) + '</td></tr>';
    }).join('');
    return '<div class="table-scroll"><table class="smart-table"><thead><tr><th>' +
      tr('Item', 'البند') + '</th><th>' + tr('Category', 'الفئة') +
      '</th><th>' + tr('Quantity', 'الكمية') + '</th><th>' +
      tr('Rooms', 'الغرف') + '</th><th>' + tr('Unit Price', 'سعر الوحدة') +
      '</th><th>' + tr('Line Total', 'إجمالي البند') + '</th><th>' +
      tr('Status', 'الحالة') +
      '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderReview(analysis, project) {
    const notes = asArray(analysis.needs_review).concat(asArray(analysis.analysis_notes));
    if (project.customer_notes) notes.push(project.customer_notes);
    if (!notes.length) {
      $('reviewBox').hidden = true;
      $('reviewBox').innerHTML = '';
      return 0;
    }
    $('reviewBox').hidden = false;
    $('reviewBox').innerHTML = '<strong>' + tr('Notes for review', 'ملاحظات للمراجعة') +
      '</strong><ul>' + notes.map((note) => '<li>' + esc(note) + '</li>').join('') + '</ul>';
    return notes.length;
  }

  async function run() {
    if (!token) {
      $('viewerStatus').textContent = tr('Project token is missing.', 'رقم المشروع غير موجود في الرابط.');
      return;
    }

    try {
      const data = await apiJSON('api/project.php?token=' + encodeURIComponent(token));
      const project = data.project || {};
      const model = project.digital_model || {};
      const rooms = Array.isArray(model.rooms) ? model.rooms : [];
      const devices = Array.isArray(model.devices) ? model.devices : [];
      const boq = Array.isArray(model.boq) ? model.boq : [];

      $('projectToken').textContent = tr('PROJECT ', 'المشروع ') + (project.token || token);
      $('projectTitle').textContent = (model.project && model.project.type) || tr('Smart Home BOQ', 'قائمة كميات المنزل الذكي');
      $('projectSubtitle').textContent = tr(
        'A preliminary, customer-friendly list of recommended devices and quantities by room. No 2D or 3D model is shown.',
        'قائمة مبدئية مبسطة بالأجهزة والكميات المقترحة حسب الغرف، دون عرض نموذج 2D أو 3D.'
      );
      $('viewerStats').innerHTML = [
        [tr('Rooms identified', 'الغرف المكتشفة'), rooms.length],
        [tr('Device quantities', 'إجمالي عدد الأجهزة'), devices.reduce((n, d) => n + (Number(d.qty) || 0), 0)],
        [tr('BOQ line items', 'بنود BOQ'), boq.length],
        [tr('Report status', 'حالة التقرير'), tr('Preliminary', 'مبدئي')]
      ].map(([label, value]) => '<div class="viewer-stat"><span>' + esc(label) +
        '</span><strong>' + esc(value) + '</strong></div>').join('');

      $('deviceTable').innerHTML = renderDistribution(rooms, devices);
      $('boqTable').innerHTML = renderBOQ(boq);
      $('pricingSummary').innerHTML = renderPricingSummary(boq);
      $('viewerStatus').hidden = true;
      $('viewer').hidden = false;
    } catch (error) {
      $('viewerStatus').textContent = error.message || tr('Unable to load the BOQ report.', 'تعذر تحميل تقرير الكميات.');
    }
  }

  run();
})();