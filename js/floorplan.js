const root = document.querySelector('.fp-page');
if (!root) {
  // This module is shared by the Arabic and English dashboards.
} else {
  const lang = root.dataset.language === 'en' ? 'en' : 'ar';
  const rtl = lang === 'ar';
  const labels = {
    ar: {
      living: 'غرفة المعيشة', kitchen: 'المطبخ', bath: 'الحمام', master: 'غرفة النوم الرئيسية', bedroom: 'غرفة النوم', hall: 'المدخل والممر',
      area: 'المساحة', temp: 'درجة الحرارة', light: 'الإضاءة', hvac: 'التكييف', curtain: 'الستائر', presence: 'حساس الحركة', camera: 'الكاميرا',
      on: 'يعمل', off: 'متوقف', unavailable: 'غير متاح', occupied: 'يوجد حركة', clear: 'لا توجد حركة',
      lightOn: 'تم تشغيل إضاءة ', lightOff: 'تم إيقاف إضاءة ', hvacOn: 'تم تشغيل التكييف في ', hvacOff: 'تم إيقاف التكييف في ',
      curtainOpen: 'تم فتح الستائر في ', curtainClose: 'تم إغلاق الستائر في ',
      armed: 'النظام مفعّل', disarmed: 'النظام غير مفعّل', secure: 'جميع نقاط الحماية في وضع الاستعداد', insecure: 'تم إيقاف تفعيل نظام الأمان',
      alarmArm: 'تفعيل نظام الأمان', alarmDisarm: 'إلغاء تفعيل النظام', now: 'الآن', noRoom: 'اختر غرفة من القائمة أو من النموذج',
      sceneDay: 'إضاءة النهار', sceneNight: 'إضاءة الليل', power: 'استهلاك تقديري', lightLabel: 'إضاءة السقف', hvacLabel: 'وحدة التكييف', curtainLabel: 'محرك الستارة', sensorLabel: 'حساس الحركة',
      roomTypes: { living: 'منطقة المعيشة', kitchen: 'منطقة الطهي', bath: 'منطقة الخدمات', master: 'جناح رئيسي', bedroom: 'غرفة نوم', hall: 'منطقة الدخول' }
    },
    en: {
      living: 'Living room', kitchen: 'Kitchen', bath: 'Bathroom', master: 'Master bedroom', bedroom: 'Bedroom', hall: 'Entrance & hall',
      area: 'Area', temp: 'Temperature', light: 'Lighting', hvac: 'Air conditioning', curtain: 'Curtains', presence: 'Motion sensor', camera: 'Camera',
      on: 'On', off: 'Off', unavailable: 'Not installed', occupied: 'Motion detected', clear: 'No motion',
      lightOn: 'Turned on the light in ', lightOff: 'Turned off the light in ', hvacOn: 'Turned on AC in ', hvacOff: 'Turned off AC in ',
      curtainOpen: 'Opened the curtains in ', curtainClose: 'Closed the curtains in ',
      armed: 'System armed', disarmed: 'System disarmed', secure: 'All protection points are ready', insecure: 'Security system is currently disarmed',
      alarmArm: 'Arm security system', alarmDisarm: 'Disarm security', now: 'Now', noRoom: 'Select a room from the list or the model',
      sceneDay: 'Daylight view', sceneNight: 'Night view', power: 'Estimated consumption', lightLabel: 'Ceiling lights', hvacLabel: 'Climate unit', curtainLabel: 'Curtain motor', sensorLabel: 'Motion sensor',
      roomTypes: { living: 'Living area', kitchen: 'Cooking area', bath: 'Service area', master: 'Main suite', bedroom: 'Bedroom', hall: 'Entrance area' }
    }
  }[lang];

  const rooms = [
    { id:'living', col:0, row:0, icon:'fa-couch', area:22, temp:24, light:true, hvac:true, hvacOn:true, curtain:true, curtainOpen:false, presence:true, motion:false, camera:false },
    { id:'kitchen', col:1, row:0, icon:'fa-utensils', area:16, temp:25, light:true, hvac:false, hvacOn:false, curtain:false, curtainOpen:false, presence:true, motion:false, camera:false },
    { id:'bath', col:2, row:0, icon:'fa-bath', area:7, temp:23, light:false, hvac:false, hvacOn:false, curtain:false, curtainOpen:false, presence:true, motion:false, camera:false },
    { id:'master', col:0, row:1, icon:'fa-bed', area:20, temp:24, light:true, hvac:true, hvacOn:true, curtain:true, curtainOpen:false, presence:true, motion:false, camera:false },
    { id:'bedroom', col:1, row:1, icon:'fa-bed', area:15, temp:23, light:false, hvac:true, hvacOn:false, curtain:true, curtainOpen:false, presence:true, motion:false, camera:false },
    { id:'hall', col:2, row:1, icon:'fa-door-open', area:9, temp:24, light:true, hvac:false, hvacOn:false, curtain:false, curtainOpen:false, presence:true, motion:false, camera:true }
  ];
  const state = { selected:'living', filter:'all', scene:'day', alarm:true, events:[], sceneReady:false };
  const roomObjects = {};
  const roomById = id => rooms.find(r => r.id === id);
  const roomName = r => labels[r.id];
  const el = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function availableForFilter(room) {
    if (state.filter === 'lighting') return true;
    if (state.filter === 'climate') return room.hvac;
    if (state.filter === 'security') return room.presence || room.camera;
    return true;
  }

  function renderRoomList() {
    const list = el('room-list');
    const visible = rooms.filter(availableForFilter);
    el('room-count').textContent = rtl ? visible.length + ' غرف' : visible.length + ' rooms';
    list.innerHTML = visible.map(room => {
      const active = state.selected === room.id;
      return '<button type="button" class="fp-room-item' + (active ? ' active' : '') + '" data-room="' + room.id + '">' +
        '<span class="fp-room-glyph"><i class="fas ' + room.icon + '"></i></span>' +
        '<span class="fp-room-copy"><strong>' + esc(roomName(room)) + '</strong><small>' + esc(labels.roomTypes[room.id]) + '</small></span>' +
        '<span class="fp-room-temp">' + room.temp + '°</span>' +
        '<span class="fp-room-status' + (room.light ? '' : ' off') + '"></span>' +
      '</button>';
    }).join('');
  }

  function renderRoomDetails() {
    const room = roomById(state.selected);
    const holder = el('room-detail-content');
    if (!room) {
      holder.innerHTML = '<div class="fp-detail-empty">' + esc(labels.noRoom) + '</div>';
      return;
    }
    const tempLabel = rtl ? '°م' : '°C';
    const control = (key, icon, title, subtitle, available) => {
      const value = key === 'hvac' ? !!room.hvacOn : key === 'curtain' ? !!room.curtainOpen : key === 'presence' ? !!room.motion : !!room[key];
      return '<div class="fp-control-row">' +
        '<div class="fp-control-label"><span class="fp-control-icon"><i class="fas ' + icon + '"></i></span><span><strong>' + title + '</strong><small>' + (available ? subtitle : labels.unavailable) + '</small></span></div>' +
        '<button type="button" class="fp-toggle" data-device="' + key + '" aria-pressed="' + (value ? 'true' : 'false') + '" aria-label="' + title + '" ' + (available ? '' : 'disabled') + '></button>' +
      '</div>';
    };
    holder.innerHTML =
      '<div class="fp-detail-title"><strong>' + esc(roomName(room)) + '</strong><span><i class="fas fa-circle"></i> ' + (rtl ? 'متصل' : 'Online') + '</span></div>' +
      '<div class="fp-detail-stats">' +
        '<div class="fp-detail-stat"><small>' + labels.area + '</small><strong>' + room.area + ' m²</strong></div>' +
        '<div class="fp-detail-stat"><small>' + labels.temp + '</small><strong>' + room.temp + tempLabel + '</strong></div>' +
      '</div>' +
      '<div class="fp-control-list">' +
        control('light','fa-lightbulb',labels.light,labels.lightLabel,true) +
        control('hvac','fa-temperature-half',labels.hvac,room.hvac ? (room.hvacOn ? labels.on : labels.off) : labels.hvacLabel,room.hvac) +
        control('curtain','fa-window-maximize',labels.curtain,room.curtain ? (room.curtainOpen ? labels.on : labels.off) : labels.curtainLabel,room.curtain) +
        control('presence','fa-running',labels.presence,room.presence ? (room.motion ? labels.occupied : labels.clear) : labels.sensorLabel,room.presence) +
      '</div>';
  }

  function renderEvents() {
    const defaultEvents = [
      { icon:'fa-lightbulb', text:rtl ? 'تم تشغيل إضاءة غرفة المعيشة' : 'Living room light switched on', time:rtl ? 'الآن' : 'Now' },
      { icon:'fa-shield-alt', text:rtl ? 'نظام الأمان في وضع التفعيل' : 'Security system armed', time:rtl ? 'منذ 5 د' : '5 min ago' },
      { icon:'fa-temperature-half', text:rtl ? 'درجة الحرارة 24° في غرفة النوم' : 'Bedroom temperature is 24°', time:rtl ? 'منذ 12 د' : '12 min ago' }
    ];
    const items = state.events.concat(defaultEvents).slice(0,4);
    el('event-list').innerHTML = items.map(item => '<li><i class="fas ' + item.icon + '"></i><span>' + esc(item.text) + '</span><time>' + esc(item.time) + '</time></li>').join('');
  }

  function addEvent(icon, text) {
    state.events.unshift({ icon:icon, text:text, time:labels.now });
    state.events = state.events.slice(0,3);
    renderEvents();
  }

  function updateMetrics() {
    const lights = rooms.filter(r => r.light).length;
    const hvac = rooms.filter(r => r.hvac && r.hvacOn).length;
    const power = (0.22 + lights * 0.09 + hvac * 0.19).toFixed(2);
    el('metric-lights').textContent = String(lights);
    el('metric-power').innerHTML = power + ' <small>kW</small>';
    el('metric-security').textContent = state.alarm ? (rtl ? 'مفعّل' : 'Armed') : (rtl ? 'متوقف' : 'Disarmed');
    el('metric-security-note').textContent = state.alarm ? (rtl ? 'المنزل في الوضع الآمن' : 'Home is in secure mode') : (rtl ? 'نظام الأمان غير مفعّل' : 'Security is disarmed');
    el('security-state-title').textContent = state.alarm ? labels.armed : labels.disarmed;
    el('security-state-desc').textContent = state.alarm ? labels.secure : labels.insecure;
    el('security-symbol').classList.toggle('disarmed', !state.alarm);
    el('toggle-alarm').classList.toggle('disarm', state.alarm);
    el('toggle-alarm').innerHTML = state.alarm
      ? '<i class="fas fa-lock-open"></i> ' + labels.alarmDisarm
      : '<i class="fas fa-lock"></i> ' + labels.alarmArm;
  }

  function selectRoom(id, fromCanvas) {
    if (!roomById(id)) return;
    state.selected = id;
    renderRoomList();
    renderRoomDetails();
    if (fromCanvas && roomObjects[id] && window.fpScene) {
      const p = roomObjects[id].floor.position;
      window.fpScene.controls.target.set(p.x, 0.3, p.z);
    }
  }

  function syncDevice(room, key) {
    const objects = roomObjects[room.id];
    if (!objects) return;
    if (key === 'light') {
      objects.point.visible = room.light;
      objects.marker.material.color.set(room.light ? 0xf2bd54 : 0x8c9ba5);
      objects.marker.material.emissive.set(room.light ? 0x7c4f16 : 0x17232b);
      objects.marker.material.emissiveIntensity = room.light ? 0.55 : 0.05;
    }
    if (objects.floor) {
      objects.floor.material.emissive.set(room.light && state.scene === 'night' ? 0x58431d : 0x000000);
      objects.floor.material.emissiveIntensity = room.light && state.scene === 'night' ? 0.12 : 0;
    }
  }

  function toggleDevice(key) {
    const room = roomById(state.selected);
    if (!room) return;
    if (key === 'light') room.light = !room.light;
    else if (key === 'hvac' && room.hvac) room.hvacOn = !room.hvacOn;
    else if (key === 'curtain' && room.curtain) room.curtainOpen = !room.curtainOpen;
    else if (key === 'presence' && room.presence) room.motion = !room.motion;
    else return;
    const on = key === 'light' ? room.light : key === 'hvac' ? room.hvacOn : key === 'curtain' ? room.curtainOpen : room.motion;
    let icon = 'fa-sliders-h';
    let message = '';
    if (key === 'light') { icon = 'fa-lightbulb'; message = (on ? labels.lightOn : labels.lightOff) + roomName(room); }
    if (key === 'hvac') { icon = 'fa-temperature-half'; message = (on ? labels.hvacOn : labels.hvacOff) + roomName(room); }
    if (key === 'curtain') { icon = 'fa-window-maximize'; message = (on ? labels.curtainOpen : labels.curtainClose) + roomName(room); }
    if (key === 'presence') { icon = 'fa-running'; message = (on ? labels.occupied : labels.clear) + ' · ' + roomName(room); }
    syncDevice(room, key);
    renderRoomList();
    renderRoomDetails();
    updateMetrics();
    addEvent(icon, message);
  }

  function setScene(mode) {
    state.scene = mode;
    document.querySelectorAll('[data-scene]').forEach(button => button.classList.toggle('active', button.dataset.scene === mode));
    el('scene-status').textContent = mode === 'day' ? labels.sceneDay : labels.sceneNight;
    rooms.forEach(room => syncDevice(room, 'light'));
    if (window.fpScene) window.fpScene.setScene(mode);
  }

  function setFilter(filter) {
    state.filter = filter;
    document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
    renderRoomList();
  }

  document.addEventListener('click', event => {
    const roomButton = event.target.closest('[data-room]');
    if (roomButton) selectRoom(roomButton.dataset.room, false);
    const deviceButton = event.target.closest('[data-device]');
    if (deviceButton && !deviceButton.disabled) toggleDevice(deviceButton.dataset.device);
    const sceneButton = event.target.closest('[data-scene]');
    if (sceneButton) setScene(sceneButton.dataset.scene);
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) setFilter(filterButton.dataset.filter);
  });

  el('toggle-alarm').addEventListener('click', () => {
    state.alarm = !state.alarm;
    updateMetrics();
    addEvent('fa-shield-alt', state.alarm ? (rtl ? 'تم تفعيل نظام الأمان' : 'Security system armed') : labels.insecure);
  });

  el('reset-camera').addEventListener('click', () => {
    if (window.fpScene) window.fpScene.resetCamera();
  });

  renderRoomList();
  renderRoomDetails();
  renderEvents();
  updateMetrics();

  async function boot3D() {
    const host = el('floorplan-canvas');
    const fallback = el('scene-fallback');
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js');
      const controlsModule = await import('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js');
      const OrbitControls = controlsModule.OrbitControls;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xeaf1f4);
      scene.fog = new THREE.Fog(0xeaf1f4, 17, 30);

      const camera = new THREE.PerspectiveCamera(36, host.clientWidth / host.clientHeight, 0.1, 100);
      const startCamera = new THREE.Vector3(10.8, 10.5, 11.5);
      camera.position.copy(startCamera);

      const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.setAttribute('aria-label', rtl ? 'مجسم المنزل ثلاثي الأبعاد' : '3D home model');
      host.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.065;
      controls.target.set(0, 0.4, 0);
      controls.minDistance = 8.5;
      controls.maxDistance = 20;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.update();

      const hemi = new THREE.HemisphereLight(0xffffff, 0x8294a0, 2.0);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffffff, 2.25);
      sun.position.set(-5, 12, 8);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -12;
      sun.shadow.camera.right = 12;
      sun.shadow.camera.top = 12;
      sun.shadow.camera.bottom = -12;
      scene.add(sun);

      const mat = (color, roughness) => new THREE.MeshStandardMaterial({ color:color, roughness:roughness === undefined ? 0.82 : roughness });
      const wallMat = mat(0xf9fbfc, 0.92);
      const darkMat = mat(0x425466, 0.75);
      const woodMat = mat(0xb68c61, 0.78);
      const paleWood = mat(0xd5bb96, 0.78);
      const fabricMat = mat(0x738f9b, 0.92);
      const softMat = mat(0xe2e7e8, 0.95);
      const whiteMat = mat(0xf8f7f1, 0.8);
      const metalMat = mat(0x647681, 0.48);
      const greenMat = mat(0x4f8c67, 0.92);
      const floorColors = [0xe8dfd1,0xdce5df,0xdfe6ec,0xe7dfd3,0xe1e6e4,0xe4e9ed];

      function makeBox(w,h,d,x,y,z,material,parent) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
        mesh.position.set(x,y,z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        (parent || scene).add(mesh);
        return mesh;
      }

      function makeCylinder(radiusTop,radiusBottom,height,x,y,z,material) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,20),material);
        mesh.position.set(x,y,z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        return mesh;
      }

      function makeSphere(radius,x,y,z,material) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,18,14),material);
        mesh.position.set(x,y,z);
        mesh.castShadow = true;
        scene.add(mesh);
        return mesh;
      }

      function addPlant(x,z,scale) {
        const s = scale || 1;
        makeCylinder(0.16*s,0.19*s,0.34*s,x,0.24*s,z,mat(0xb47d50));
        makeCylinder(0.035*s,0.045*s,0.58*s,x,0.68*s,z,mat(0x4b7957));
        makeSphere(0.22*s,x+0.12*s,0.88*s,z,greenMat);
        makeSphere(0.2*s,x-0.12*s,0.82*s,z+0.04*s,greenMat);
        makeSphere(0.2*s,x,0.98*s,z-0.1*s,greenMat);
      }

      function addRoomLabel(text,x,z) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.beginPath();
        ctx.roundRect(8,12,496,104,28);
        ctx.fill();
        ctx.font = '700 43px Cairo, Arial, sans-serif';
        ctx.fillStyle = '#263e52';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text,256,65,470);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false }));
        sprite.position.set(x,0.19,z);
        sprite.scale.set(2.35,0.59,1);
        scene.add(sprite);
      }

      function addBed(cx,cz,angle) {
        const group = new THREE.Group();
        group.position.set(cx,0.07,cz);
        group.rotation.y = angle || 0;
        scene.add(group);
        makeBox(2.15,0.28,2.65,0,0.2,0,woodMat,group);
        makeBox(2.08,0.16,2.48,0,0.42,0,whiteMat,group);
        makeBox(2.12,0.28,0.18,0,0.55,-1.26,darkMat,group);
        makeBox(0.82,0.12,0.45,-0.48,0.54,-0.86,softMat,group);
        makeBox(0.82,0.12,0.45,0.48,0.54,-0.86,softMat,group);
        makeBox(2.0,0.09,0.72,0,0.53,0.79,fabricMat,group);
        return group;
      }

      function addSofa(cx,cz) {
        const group = new THREE.Group();
        group.position.set(cx,0.06,cz);
        scene.add(group);
        makeBox(2.25,0.32,0.84,0,0.27,0,woodMat,group);
        makeBox(2.12,0.56,0.2,0,0.65,-0.32,fabricMat,group);
        makeBox(0.18,0.52,0.82,-1.04,0.51,0,woodMat,group);
        makeBox(0.18,0.52,0.82,1.04,0.51,0,woodMat,group);
        makeBox(0.88,0.13,0.6,-0.5,0.48,0.08,whiteMat,group);
        makeBox(0.88,0.13,0.6,0.5,0.48,0.08,whiteMat,group);
        return group;
      }

      // Base slab and floor shadow.
      makeBox(11.0,0.24,7.55,0,-0.19,0,mat(0xd5dfe4));
      makeBox(10.75,0.08,7.28,0,-0.045,0,mat(0xf5f7f7));

      // Six zones form a sample apartment layout; replace this geometry with the customer's actual plan later.
      rooms.forEach((room,index) => {
        const x = (room.col - 1) * 3.58;
        const z = (room.row === 0 ? -1 : 1) * 1.78;
        room.x = x;
        room.z = z;
        const floor = makeBox(3.56,0.075,3.54,x,0.025,z,mat(floorColors[index]));
        floor.userData.roomId = room.id;
        floor.userData.pickable = true;
        const point = new THREE.PointLight(0xffcf79, room.light ? 1.25 : 0, 4.3, 2);
        point.position.set(x,1.45,z);
        point.visible = room.light;
        scene.add(point);
        const marker = makeSphere(0.095,x+1.05,0.28,z-1.05,mat(room.light ? 0xf2bd54 : 0x8c9ba5,0.35));
        marker.material.emissive.set(room.light ? 0x7c4f16 : 0x17232b);
        marker.material.emissiveIntensity = room.light ? 0.55 : 0.05;
        const sensor = makeSphere(0.075,x-1.18,0.23,z-1.1,mat(0x35b79a,0.42));
        sensor.material.emissive.set(0x0c5747);
        sensor.material.emissiveIntensity = 0.4;
        roomObjects[room.id] = { floor:floor, point:point, marker:marker, sensor:sensor };
        addRoomLabel(labels[room.id],x,z+0.95);
      });

      // Outer walls.
      makeBox(0.15,1.15,7.42,-5.43,0.55,0,wallMat);
      makeBox(0.15,1.15,7.42,5.43,0.55,0,wallMat);
      makeBox(10.9,1.15,0.15,0,0.55,-3.68,wallMat);
      makeBox(10.9,1.15,0.15,0,0.55,3.68,wallMat);
      // Interior partitions are intentionally low so the model remains readable from above.
      [-1.79,1.79].forEach(x => {
        makeBox(0.12,0.92,2.6,x,0.45,-2.32,wallMat);
        makeBox(0.12,0.92,2.6,x,0.45,2.32,wallMat);
      });
      [-3.58,0,3.58].forEach(x => makeBox(3.35,0.92,0.12,x,0.45,0,wallMat));

      // Living room furniture.
      addSofa(-4.15,-1.45);
      makeBox(1.25,0.12,0.68,-3.4,0.24,-2.55,woodMat);
      makeBox(1.45,0.055,0.9,-3.58,0.13,-2.55,mat(0xd4c2ac));
      addPlant(-5.0,-0.3,0.8);

      // Kitchen counters, island, cooker and refrigerator.
      makeBox(2.75,0.78,0.55,-0.05,0.47,-3.02,whiteMat);
      makeBox(2.8,0.12,0.63,-0.05,0.91,-3.02,woodMat);
      makeBox(0.68,1.45,0.72,1.05,0.8,-2.95,mat(0xd5dce0));
      makeBox(1.55,0.75,0.62,0.25,0.46,-1.45,woodMat);
      makeBox(1.65,0.12,0.7,0.25,0.88,-1.45,whiteMat);
      [ -0.25,0.22 ].forEach(dx => makeCylinder(0.11,0.11,0.035,dx,0.96,-3.02,metalMat));

      // Bathroom fixtures.
      makeBox(1.55,0.42,0.7,3.0,0.28,-2.85,whiteMat);
      makeBox(1.45,0.08,0.65,3.0,0.52,-2.85,mat(0xeaf4f4));
      makeBox(0.72,0.5,0.9,4.45,0.31,-1.5,whiteMat);
      makeCylinder(0.25,0.29,0.35,4.35,0.25,-2.95,whiteMat);
      makeBox(0.85,0.08,0.65,4.2,0.56,-2.45,metalMat);

      // Master suite.
      addBed(-4.05,2.45,0);
      makeBox(0.62,0.5,0.58,-5.0,0.32,0.55,woodMat);
      makeBox(0.62,0.5,0.58,-2.85,0.32,0.55,woodMat);
      addPlant(-5.0,3.35,0.72);

      // Bedroom and desk.
      addBed(0.15,2.5,0);
      makeBox(1.55,0.75,0.48,1.05,0.43,0.55,woodMat);
      makeBox(0.46,0.44,0.46,1.1,0.3,1.15,darkMat);
      addPlant(0.95,3.35,0.68);

      // Entrance console and small plant.
      makeBox(1.75,0.55,0.42,3.55,0.34,2.55,woodMat);
      makeBox(1.85,0.08,0.48,3.55,0.65,2.55,paleWood);
      addPlant(4.65,3.0,0.68);
      makeBox(0.09,0.72,1.0,5.25,0.38,2.9,woodMat);

      const pickableFloors = rooms.map(room => roomObjects[room.id].floor);
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDown = null;
      renderer.domElement.addEventListener('pointerdown', event => { pointerDown = { x:event.clientX, y:event.clientY }; });
      renderer.domElement.addEventListener('pointerup', event => {
        if (pointerDown && Math.hypot(event.clientX - pointerDown.x,event.clientY - pointerDown.y) < 6) {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer,camera);
          const hits = raycaster.intersectObjects(pickableFloors,false);
          if (hits.length && hits[0].object.userData.roomId) selectRoom(hits[0].object.userData.roomId,true);
        }
        pointerDown = null;
      });

      function applyScene(mode) {
        if (mode === 'night') {
          scene.background.set(0x18283b);
          scene.fog.color.set(0x18283b);
          hemi.intensity = 0.42;
          sun.intensity = 0.32;
          renderer.toneMappingExposure = 0.85;
        } else {
          scene.background.set(0xeaf1f4);
          scene.fog.color.set(0xeaf1f4);
          hemi.intensity = 2.0;
          sun.intensity = 2.25;
          renderer.toneMappingExposure = 1.12;
        }
        rooms.forEach(room => syncDevice(room,'light'));
      }

      function resetCamera() {
        camera.position.copy(startCamera);
        controls.target.set(0,0.4,0);
        controls.update();
      }

      function resize() {
        const width = Math.max(1,host.clientWidth);
        const height = Math.max(1,host.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width,height,false);
      }
      window.addEventListener('resize',resize);

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene,camera);
      }
      window.fpScene = { controls:controls, setScene:applyScene, resetCamera:resetCamera };
      state.sceneReady = true;
      applyScene(state.scene);
      resize();
      animate();
      selectRoom(state.selected,false);
    } catch (error) {
      console.error('ESSO floorplan 3D viewer could not start:',error);
      fallback.hidden = false;
    }
  }

  boot3D();
}
