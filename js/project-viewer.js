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

  function renderBOQ(boq) {
    if (!boq.length) {
      return '<p class="boq-empty">' + tr('No BOQ items were saved for this project.', 'لم يتم حفظ بنود BOQ لهذا المشروع.') + '</p>';
    }
    const rows = boq.map((item) => {
      const roomNames = Array.isArray(item.rooms) ? item.rooms.join(isAr ? '، ' : ', ') : (item.rooms || '—');
      return '<tr><td>' + esc(item.item || item.type || '—') +
        '</td><td>' + esc(item.category || '—') +
        '</td><td class="boq-number">' + esc(item.quantity ?? 0) +
        '</td><td>' + esc(roomNames) +
        '</td><td>' + statusPill(item.required) + '</td></tr>';
    }).join('');
    return '<div class="table-scroll"><table class="smart-table"><thead><tr><th>' +
      tr('Item', 'البند') + '</th><th>' + tr('Category', 'الفئة') +
      '</th><th>' + tr('Quantity', 'الكمية') + '</th><th>' +
      tr('Rooms', 'الغرف') + '</th><th>' + tr('Status', 'الحالة') +
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
      const analysis = project.analysis || {};
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
      renderReview(analysis, project);
      $('viewerStatus').hidden = true;
      $('viewer').hidden = false;
    } catch (error) {
      $('viewerStatus').textContent = error.message || tr('Unable to load the BOQ report.', 'تعذر تحميل تقرير الكميات.');
    }
  }

  run();
})();