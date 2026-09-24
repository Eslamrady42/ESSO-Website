(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const isAr = document.documentElement.lang === 'ar';
  const tr = (en, ar) => isAr ? ar : en;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const state = {
    project: null,
    model: null,
    selectedFloor: null,
    selectedRoom: null,
    canvas: null,
    ctx: null,
    dragging: false,
    lastX: 0,
    lastY: 0,
    rotY: -0.68,
    rotX: 0.62,
    zoom: 1,
    roomMeshes: []
  };

  if (!token) {
    $('viewerStatus').textContent = tr('Project token missing.', 'بيانات المشروع مفقودة.');
    return;
  }

  async function run() {
    try {
      const r = await fetch('api/project.php?token=' + encodeURIComponent(token), { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || tr('Project not found', 'المشروع غير موجود'));

      state.project = j.project;
      state.model = state.project.digital_model || {};
      const floors = state.model.floors || [];
      state.selectedFloor = floors[0]?.floor_number ?? state.model.rooms?.[0]?.floor ?? 1;

      $('viewerStatus').hidden = true;
      $('viewer').hidden = false;
      $('projectToken').textContent = tr('PROJECT ', 'المشروع ') + state.project.token;
      $('projectTitle').textContent = (state.model.project?.type || tr('Smart Home', 'المنزل الذكي')) + (isAr ? ' — معاينة رقمية' : ' — Digital Preview');
      $('projectSubtitle').textContent = `${state.model.rooms?.length || 0} ${tr('rooms', 'غرف')} • ${state.model.devices?.length || 0} ${tr('smart items', 'أجهزة ذكية')}`;

      renderFloors();
      renderStats();
      renderTables();
      renderReview();
      render2D();
      init3D();
    } catch (e) {
      $('viewerStatus').textContent = e.message || tr('Unable to load preview.', 'تعذر تحميل المعاينة.');
    }
  }

  function currentRooms() {
    return (state.model.rooms || []).filter(r => Number(r.floor) === Number(state.selectedFloor));
  }

  function renderFloors() {
    const tabs = $('floorTabs');
    const floors = state.model.floors || [];
    tabs.innerHTML = floors.map(f => `<button type="button" class="floor-tab ${Number(f.floor_number) === Number(state.selectedFloor) ? 'active' : ''}" data-floor="${f.floor_number}">${tr('Floor', 'الدور')} ${f.floor_number}</button>`).join('');
    tabs.querySelectorAll('.floor-tab').forEach(b => b.addEventListener('click', () => {
      state.selectedFloor = Number(b.dataset.floor);
      state.selectedRoom = null;
      renderFloors();
      render2D();
      draw3D();
    }));
  }

  function renderStats() {
    const rooms = state.model.rooms || [];
    const devices = state.model.devices || [];
    const reviewRooms = rooms.filter(r => r.needs_review).length;
    const totalArea = state.model.project?.area_sqm ?? state.project.project?.area ?? 'TBD';
    $('viewerStats').innerHTML = [
      [tr('Area', 'المساحة'), totalArea !== 'TBD' ? totalArea + ' m²' : 'TBD'],
      [tr('Floors', 'الأدوار'), (state.model.floors || []).length],
      [tr('Rooms', 'الغرف'), rooms.length],
      [tr('Devices', 'الأجهزة'), devices.length],
      [tr('Rooms needing review', 'غرف تحتاج مراجعة'), reviewRooms],
    ].map(([a,b]) => `<div class="viewer-stat"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
  }


  function roomBox(r) {
    return {x:Number(r.x||0), y:Number(r.y||0), w:Math.max(0.8,Number(r.width||1)), h:Math.max(0.8,Number(r.depth||1))};
  }

  function overlap(a,b){
    const ox=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const oy=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    return {area:ox*oy, ox, oy};
  }

  // Repair grossly overlapping AI boxes while preserving their rough relative location.
  // This prevents the viewer from displaying the unreadable pile-up seen when a vision model
  // returns mutually inconsistent rectangles. It is a display repair, not an engineering claim.
  function repairRoomLayout(rooms, floorW, floorD){
    const out=rooms.map(r=>({...r, x:Number(r.x||0), y:Number(r.y||0), width:Number(r.width||2.5), depth:Number(r.depth||2.5)}));
    const hasTooMuchOverlap = ()=>{
      let bad=0, pairs=0;
      for(let i=0;i<out.length;i++) for(let j=i+1;j<out.length;j++){
        const a=roomBox(out[i]),b=roomBox(out[j]),o=overlap(a,b); const minA=Math.min(a.w*a.h,b.w*b.h);
        if(minA>0 && o.area/minA>0.38) bad++; pairs++;
      }
      return pairs>0 && bad/Math.max(1,pairs)>.18;
    };
    for(let pass=0; pass<18 && hasTooMuchOverlap(); pass++){
      for(let i=0;i<out.length;i++) for(let j=i+1;j<out.length;j++){
        const a=roomBox(out[i]),b=roomBox(out[j]),o=overlap(a,b); if(o.area<=0) continue;
        const ax=a.x+a.w/2, ay=a.y+a.h/2, bx=b.x+b.w/2, by=b.y+b.h/2;
        if(o.ox >= o.oy){
          const push=(o.ox/2)+0.08; if(ax<=bx){out[i].x-=push;out[j].x+=push;}else{out[i].x+=push;out[j].x-=push;}
        }else{
          const push=(o.oy/2)+0.08; if(ay<=by){out[i].y-=push;out[j].y+=push;}else{out[i].y+=push;out[j].y-=push;}
        }
      }
      out.forEach(r=>{r.x=Math.max(0.15,Math.min(floorW-r.width-0.15,r.x));r.y=Math.max(0.15,Math.min(floorD-r.depth-0.15,r.y));});
    }
    // Final deterministic pack if the model supplied unusable geometry.
    if(hasTooMuchOverlap()){
      const gap=.18; let x=.25,y=.25,rowH=0;
      const sorted=[...out].sort((a,b)=>(Number(b.width*b.depth)-Number(a.width*a.depth)));
      for(const r of sorted){
        if(x+r.width>floorW-.25){x=.25;y+=rowH+gap;rowH=0;}
        r.x=x;r.y=y;x+=r.width+gap;rowH=Math.max(rowH,r.depth);
      }
    }
    return out;
  }

  function render2D() {
    const el = $('floorPlan2d');
    const floors = state.model.floors || [];
    const f = floors.find(x => Number(x.floor_number) === Number(state.selectedFloor));
    let rooms = currentRooms();
    if (!rooms.length) {
      el.innerHTML = `<div class="empty-state">${tr('No reliable rooms were detected for this floor.', 'لم يتم اكتشاف غرف موثوقة في هذا الدور.')}</div>`;
      return;
    }

    const floorW = Math.max(1, Number(f?.width_m || Math.max(...rooms.map(r => Number(r.x || 0) + Number(r.width || 0)), 10)));
    const floorD = Math.max(1, Number(f?.depth_m || Math.max(...rooms.map(r => Number(r.y || 0) + Number(r.depth || 0)), 8)));
    rooms = repairRoomLayout(rooms, floorW, floorD);
    const devices = state.model.devices || [];
    const deviceMap = {};
    devices.forEach(d => { deviceMap[d.room] = (deviceMap[d.room] || 0) + Number(d.qty || 0); });

    el.innerHTML = `<div class="plan-canvas" style="aspect-ratio:${floorW}/${floorD};">${rooms.map(r => {
      const selected = state.selectedRoom === r.id ? ' selected' : '';
      const review = r.needs_review ? ' review' : '';
      const left = Math.max(0, Math.min(96, Number(r.x || 0) / floorW * 100));
      const top = Math.max(0, Math.min(96, Number(r.y || 0) / floorD * 100));
      const width = Math.max(6, Math.min(100 - left, Number(r.width || 1) / floorW * 100));
      const height = Math.max(7, Math.min(100 - top, Number(r.depth || 1) / floorD * 100));
      return `<button type="button" class="plan-room${review}${selected}" data-room="${esc(r.id)}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;">
        <span class="plan-room-name">${esc(r.name)}</span>
        <span class="plan-room-meta">${r.area_sqm ? esc(r.area_sqm)+' m²' : 'TBD'} · ${deviceMap[r.name] || 0} devices</span>
      </button>`;
    }).join('')}</div>`;

    el.querySelectorAll('.plan-room').forEach(b => b.addEventListener('click', () => {
      state.selectedRoom = b.dataset.room;
      const room = rooms.find(r => r.id === state.selectedRoom);
      showRoomDetails(room);
      render2D();
      draw3D();
    }));
  }

  function showRoomDetails(room) {
    const box = $('roomDetails');
    if (!room) { box.hidden = true; return; }
    const devices = (state.model.devices || []).filter(d => d.room === room.name);
    box.hidden = false;
    box.innerHTML = `<strong>${esc(room.name)}</strong><span>${esc(room.type || tr('Room', 'غرفة'))}</span><span>${room.area_sqm ? esc(room.area_sqm)+' m²' : tr('Area TBD', 'المساحة غير محددة')}</span><div>${devices.map(d => `${esc(d.type)} × ${esc(d.qty)}`).join('<br>') || tr('No device data', 'لا توجد بيانات أجهزة')}</div>`;
  }

  function renderTables() {
    const devices = state.model.devices || [];
    const boq = state.model.boq || [];
    $('deviceTable').innerHTML = `<div class="table-scroll"><table class="smart-table"><thead><tr><th>${tr('Room','الغرفة')}</th><th>${tr('Device','الجهاز')}</th><th>${tr('Qty','الكمية')}</th><th>${tr('Category','الفئة')}</th><th>${tr('Required','المطلوب')}</th></tr></thead><tbody>${devices.length ? devices.map(d => `<tr><td>${esc(d.room)}</td><td>${esc(d.type)}</td><td>${esc(d.qty)}</td><td>${esc(d.category)}</td><td>${d.required === 'required' ? tr('Yes','نعم') : tr('Recommended','موصى به')}</td></tr>`).join('') : `<tr><td colspan="5">${tr('No devices generated.','لم يتم إنشاء أجهزة.')}</td></tr>`}</tbody></table></div>`;
    $('boqTable').innerHTML = `<div class="table-scroll"><table class="smart-table"><thead><tr><th>${tr('Category','الفئة')}</th><th>${tr('Item','البند')}</th><th>${tr('Qty','الكمية')}</th><th>${tr('Rooms','الغرف')}</th><th>${tr('Required','المطلوب')}</th></tr></thead><tbody>${boq.length ? boq.map(b => `<tr><td>${esc(b.category)}</td><td>${esc(b.item)}</td><td>${esc(b.quantity)}</td><td>${esc((b.rooms || []).join(', ') || tr('Project','المشروع'))}</td><td>${b.required ? tr('Yes','نعم') : tr('Recommended','موصى به')}</td></tr>`).join('') : `<tr><td colspan="5">${tr('No BOQ generated.','لم يتم إنشاء BOQ.')}</td></tr>`}</tbody></table></div>`;
  }

  function renderReview() {
    const analysis = state.project.analysis || {};
    const notes = [ ...(analysis.needs_review || []), ...(analysis.analysis_notes || []) ];
    const box = $('reviewBox');
    if (!notes.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<strong>${tr('Engineering review required','تحتاج هذه النتائج إلى مراجعة هندسية')}</strong><ul>${notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function init3D() {
    const host = $('model3d');
    host.innerHTML = '<canvas id="esso3dCanvas" aria-label="Interactive 3D digital twin"></canvas><div class="model3d-hint">Interactive 3D preview • drag to rotate • scroll to zoom</div>';
    state.canvas = $('esso3dCanvas');
    state.ctx = state.canvas.getContext('2d');
    if (!state.ctx) {
      host.innerHTML = '<div class="empty-state">3D preview is unavailable in this browser.</div>';
      return;
    }
    state.canvas.addEventListener('pointerdown', e => {
      state.dragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.canvas.setPointerCapture?.(e.pointerId);
    });
    state.canvas.addEventListener('pointermove', e => {
      if (!state.dragging) return;
      state.rotY += (e.clientX - state.lastX) * 0.008;
      state.rotX = Math.max(0.25, Math.min(1.15, state.rotX - (e.clientY - state.lastY) * 0.006));
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      draw3D();
    });
    state.canvas.addEventListener('pointerup', e => { state.dragging = false; state.canvas.releasePointerCapture?.(e.pointerId); });
    state.canvas.addEventListener('pointercancel', () => { state.dragging = false; });
    state.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      state.zoom = Math.max(0.55, Math.min(2.5, state.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
      draw3D();
    }, { passive: false });
    state.canvas.addEventListener('click', e => handle3DClick(e));
    window.addEventListener('resize', draw3D);
    draw3D();
  }

  function worldToCamera(x, y, z) {
    const cy = Math.cos(state.rotY), sy = Math.sin(state.rotY);
    const cx = Math.cos(state.rotX), sx = Math.sin(state.rotX);
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const y1 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    return { x: x1, y: y1, z: z2 };
  }

  // Architectural orthographic projection: keeps the whole floor readable
  // instead of making distant rooms collapse into a tiny perspective cluster.
  function project(p, cx, cy, scale) {
    return {
      x: cx + p.x * scale,
      y: cy - p.y * scale,
      z: p.z
    };
  }


  function shade(hex, factor){
    const n=parseInt(hex.replace('#',''),16), r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    return `rgb(${Math.max(0,Math.min(255,Math.round(r*factor)))},${Math.max(0,Math.min(255,Math.round(g*factor)))},${Math.max(0,Math.min(255,Math.round(b*factor)))})`;
  }

  function drawFurnitureBox(x,z,w,d,h,fill='#a88c73',outline='#5f5146',label=''){
    const rh=Math.max(0.08,Number(h||0.35));
    const pts3=[[x,0,z],[x+w,0,z],[x+w,0,z+d],[x,0,z+d],[x,rh,z],[x+w,rh,z],[x+w,rh,z+d],[x,rh,z+d]];
    const pts=pts3.map(p=>project(worldToCamera(p[0],p[1],p[2]),state._cx,state._cy,state._scale));
    const faces=[[0,1,5,4],[1,2,6,5],[3,0,4,7],[4,5,6,7]];
    faces.forEach((idx,fi)=>{
      const path=new Path2D(); path.moveTo(pts[idx[0]].x,pts[idx[0]].y); idx.slice(1).forEach(i=>path.lineTo(pts[i].x,pts[i].y)); path.closePath();
      state.ctx.fillStyle=fi===3?fill:shade(fill,[0.92,0.82,0.74][Math.min(fi,2)]); state.ctx.fill(path);
      state.ctx.strokeStyle=outline; state.ctx.lineWidth=.7; state.ctx.stroke(path);
    });
    if(label){const q=project(worldToCamera(x+w/2,rh+.03,z+d/2),state._cx,state._cy,state._scale);state.ctx.fillStyle='#4a3f36';state.ctx.font='8px Arial';state.ctx.textAlign='center';state.ctx.fillText(label,q.x,q.y);}
  }

  function drawRug(x,z,w,d,fill='#d9c9b4'){
    const p1=project(worldToCamera(x,0.015,z),state._cx,state._cy,state._scale),p2=project(worldToCamera(x+w,0.015,z),state._cx,state._cy,state._scale),p3=project(worldToCamera(x+w,0.015,z+d),state._cx,state._cy,state._scale),p4=project(worldToCamera(x,0.015,z+d),state._cx,state._cy,state._scale);
    const path=new Path2D(); path.moveTo(p1.x,p1.y);path.lineTo(p2.x,p2.y);path.lineTo(p3.x,p3.y);path.lineTo(p4.x,p4.y);path.closePath();state.ctx.fillStyle=fill;state.ctx.fill(path);state.ctx.strokeStyle='#aa9c8b';state.ctx.lineWidth=.5;state.ctx.stroke(path);
  }

  function drawBed(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||4),d=Number(r.depth||4);
    const bw=Math.max(1.6,w*.58),bd=Math.max(1.8,d*.46),bx=x+w*.21,bz=z+d*.22;
    drawRug(x+w*.13,z+d*.12,w*.74,d*.72,'#d7c7b0');
    drawFurnitureBox(bx,bz,bw,bd,.28,'#8b684d');
    drawFurnitureBox(bx+.05,bz+.03,bw-.1,bd-.12,.07,'#eee4d4');
    drawFurnitureBox(bx,bz+bd*.78,bw*.22,bd*.13,.38,'#a7a7a3');
    drawFurnitureBox(bx+bw*.78,bz+bd*.78,bw*.22,bd*.13,.38,'#a7a7a3');
    drawFurnitureBox(x+w*.05,z+d*.18,.34,.75,.65,'#765945');
    drawFurnitureBox(x+w*.79,z+d*.18,.34,.75,.65,'#765945');
    drawFurnitureBox(x+w*.72,z+d*.63,w*.2,.48,.86,'#6b5b4d');
  }

  function drawSofa(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||5),d=Number(r.depth||4);
    drawRug(x+w*.14,z+d*.20,w*.62,d*.46,'#d8d0c5');
    drawFurnitureBox(x+w*.12,z+d*.18,w*.26,d*.18,.58,'#8e7561');
    drawFurnitureBox(x+w*.40,z+d*.18,w*.26,d*.18,.58,'#947a65');
    drawFurnitureBox(x+w*.68,z+d*.18,w*.16,d*.18,.58,'#9a7d68');
    drawFurnitureBox(x+w*.13,z+d*.38,w*.71,d*.17,.34,'#b8a08a');
    drawFurnitureBox(x+w*.37,z+d*.63,w*.24,d*.15,.24,'#6f8087');
    drawFurnitureBox(x+w*.76,z+d*.52,.42,.52,1.05,'#5f4d41');
  }

  function drawDining(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||5),d=Number(r.depth||4);
    const tw=w*.46,td=d*.23,tx=x+w*.27,tz=z+d*.38;
    drawRug(x+w*.20,z+d*.26,w*.60,d*.50,'#d6cec2');
    drawFurnitureBox(tx,tz,tw,td,.44,'#8d674b');
    [[x+w*.22,z+d*.31],[x+w*.66,z+d*.31],[x+w*.22,z+d*.67],[x+w*.66,z+d*.67]].forEach(([cx,cz])=>drawFurnitureBox(cx,cz,.32,.42,.34,'#76604f'));
  }

  function drawKitchen(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||4),d=Number(r.depth||4);
    drawFurnitureBox(x+w*.07,z+d*.08,w*.86,.34,1.0,'#b6b0a5');
    drawFurnitureBox(x+w*.07,z+d*.08,w*.86,.10,1.04,'#e3ddd0');
    drawFurnitureBox(x+w*.57,z+d*.42,w*.25,d*.34,.92,'#a9a39a');
    drawFurnitureBox(x+w*.61,z+d*.44,w*.17,d*.27,.96,'#d8d1c1');
    drawFurnitureBox(x+w*.16,z+d*.67,w*.28,.30,.90,'#aaa49a');
  }

  function drawBathroom(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||3),d=Number(r.depth||3);
    drawRug(x+w*.10,z+d*.62,w*.28,d*.18,'#cfd8dc');
    drawFurnitureBox(x+w*.10,z+d*.16,w*.25,d*.25,.43,'#e7e9e6');
    drawFurnitureBox(x+w*.58,z+d*.12,w*.24,d*.34,.18,'#d7dce0');
    drawFurnitureBox(x+w*.18,z+d*.54,w*.50,d*.18,.60,'#e2e4df');
    drawFurnitureBox(x+w*.72,z+d*.50,.20,.20,1.1,'#a8b0b4');
  }

  function drawOffice(r){
    const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||4),d=Number(r.depth||4);
    drawFurnitureBox(x+w*.15,z+d*.18,w*.56,d*.16,.55,'#8b664b');
    drawFurnitureBox(x+w*.34,z+d*.39,w*.22,d*.16,.36,'#6b7a80');
    drawFurnitureBox(x+w*.72,z+d*.18,.35,.38,.58,'#765b49');
    drawFurnitureBox(x+w*.20,z+d*.55,w*.22,.22,.32,'#8b735d');
  }


  function drawDeviceMarkers(r){
    const devices=(state.model.devices||[]).filter(d=>d.room===r.name);
    if(!devices.length) return;
    const x=Number(r.x||0), z=Number(r.y||0), w=Number(r.width||3), d=Number(r.depth||3);
    let shown=0;
    for(const dev of devices.slice(0,6)){
      const px=x+w*(0.17+(shown%3)*0.30), pz=z+d*(0.18+Math.floor(shown/3)*0.48);
      const q=project(worldToCamera(px,1.08,pz),state._cx,state._cy,state._scale);
      state.ctx.beginPath(); state.ctx.arc(q.x,q.y,3.2,0,Math.PI*2);
      state.ctx.fillStyle=dev.category==='Safety'?'#d9785a':(dev.category==='Lighting'?'#e5bf4a':'#4d8791'); state.ctx.fill();
      state.ctx.strokeStyle='rgba(255,255,255,.9)'; state.ctx.lineWidth=1; state.ctx.stroke();
      shown++;
    }
  }

  function drawRoomFurniture(r){
    const t=String(r.type||'other').toLowerCase();
    if(t==='master_bedroom'||t==='bedroom'||t.includes('bed')) return drawBed(r);
    if(t==='reception'||t==='living_room'||t==='living') return drawSofa(r);
    if(t==='dining') return drawDining(r);
    if(t==='kitchen') return drawKitchen(r);
    if(t==='bathroom') return drawBathroom(r);
    if(t==='office') return drawOffice(r);
    if(t==='laundry'||t==='utility'){
      const x=Number(r.x||0),z=Number(r.y||0),w=Number(r.width||2),d=Number(r.depth||2);
      drawFurnitureBox(x+w*.12,z+d*.15,w*.28,d*.25,.82,'#c4c7c6');
      drawFurnitureBox(x+w*.52,z+d*.15,w*.28,d*.25,.82,'#d0d1cf');
    }
  }

  function polygonWorld(room, fw, fd){
    const pts=Array.isArray(room.polygon)?room.polygon:[];
    if(pts.length>=3) return pts.map(pt=>({x:Number(pt.x||0)/100*fw-fw/2,z:Number(pt.y||0)/100*fd-fd/2}));
    const x=Number(room.x||0),z=Number(room.y||0),w=Number(room.width||1),d=Number(room.depth||1);
    return [{x:x-fw/2,z:z-fd/2},{x:x+w-fw/2,z:z-fd/2},{x:x+w-fw/2,z:z+d-fd/2},{x:x-fw/2,z:z+d-fd/2}];
  }

  function drawExtrudedRoom(room, fw, fd){
    const base=polygonWorld(room,fw,fd); if(base.length<3)return;
    const h=2.15, ceiling=2.35;
    const bottom=base.map(p=>[p.x,0,p.z]), top=base.map(p=>[p.x,h,p.z]);
    const bot2=bottom.map(p=>project(worldToCamera(p[0],p[1],p[2]),state._cx,state._cy,state._scale));
    const top2=top.map(p=>project(worldToCamera(p[0],p[1],p[2]),state._cx,state._cy,state._scale));
    const floorPath=new Path2D(); floorPath.moveTo(bot2[0].x,bot2[0].y); for(let i=1;i<bot2.length;i++)floorPath.lineTo(bot2[i].x,bot2[i].y); floorPath.closePath();
    const floorTone = room.needs_review ? '#e4cf9e' : ({
      kitchen:'#d9d5cc', bathroom:'#d7dfe2', master_bedroom:'#d8c7b2', bedroom:'#d9cdbd',
      reception:'#d8c5aa', living_room:'#d7c3a7', dining:'#d8c7ad', office:'#d5d5cf'
    }[String(room.type||'').toLowerCase()] || '#d8c3a9');
    state.ctx.fillStyle=floorTone;state.ctx.fill(floorPath);state.ctx.strokeStyle='#8c7968';state.ctx.lineWidth=1;state.ctx.stroke(floorPath);
    // subtle plank/tile guides to make the model read like an architectural preview
    for(let gx=-30;gx<50;gx+=0.55){
      const a=project(worldToCamera(gx,0.02,-40),state._cx,state._cy,state._scale);
      const b=project(worldToCamera(gx,0.02,40),state._cx,state._cy,state._scale);
      state.ctx.strokeStyle='rgba(110,95,82,.10)';state.ctx.lineWidth=.45;state.ctx.beginPath();state.ctx.moveTo(a.x,a.y);state.ctx.lineTo(b.x,b.y);state.ctx.stroke();
    }
    for(let i=0;i<base.length;i++){
      const j=(i+1)%base.length;
      const wall=[bot2[i],bot2[j],top2[j],top2[i]];
      const path=new Path2D();path.moveTo(wall[0].x,wall[0].y);wall.slice(1).forEach(q=>path.lineTo(q.x,q.y));path.closePath();
      const wallTone = state.selectedRoom === room.id ? '#c6d9d7' : (i%3===0 ? '#eeeae5' : '#ddd7cf'); state.ctx.fillStyle=wallTone; state.ctx.fill(path); state.ctx.strokeStyle='#756f69'; state.ctx.lineWidth=1.2; state.ctx.stroke(path);
    }
    // opening markers: preliminary placement along the first room edge, proportional to count.
    const edgeLen=base.length?Math.hypot(base[1].x-base[0].x,base[1].z-base[0].z):0;
    const markers=(room.doors||0)+(room.windows||0);
    if(markers && edgeLen>0){
      const p0=base[0],p1=base[1];
      const dx=p1.x-p0.x,dz=p1.z-p0.z;
      const nx=-dz/Math.max(edgeLen,.001),nz=dx/Math.max(edgeLen,.001);
      const count=Math.min(8,markers);
      for(let k=0;k<count;k++){
        const t=(k+1)/(count+1),mx=p0.x+dx*t,mz=p0.z+dz*t;
        const q1=project(worldToCamera(mx,1.0,mz),state._cx,state._cy,state._scale);
        const q2=project(worldToCamera(mx+nx*.18,1.0,mz+nz*.18),state._cx,state._cy,state._scale);
        state.ctx.strokeStyle=k<(room.doors||0)?'#7a5b42':'#4f7880'; state.ctx.lineWidth=2; state.ctx.beginPath();state.ctx.moveTo(q1.x,q1.y);state.ctx.lineTo(q2.x,q2.y);state.ctx.stroke();
      }
    }
    const roomForFurniture={...room,x:(base.reduce((a,p)=>a+p.x,0)/base.length)+fw/2,y:(base.reduce((a,p)=>a+p.z,0)/base.length)+fd/2,width:Math.max(2,Math.max(...base.map(p=>p.x))-Math.min(...base.map(p=>p.x))),depth:Math.max(2,Math.max(...base.map(p=>p.z))-Math.min(...base.map(p=>p.z)))};
    drawRoomFurniture(roomForFurniture);
    drawDeviceMarkers(roomForFurniture);
    const label=project(worldToCamera((base.reduce((a,p)=>a+p.x,0)/base.length),ceiling,(base.reduce((a,p)=>a+p.z,0)/base.length)),state._cx,state._cy,state._scale);
    state.ctx.fillStyle=state.selectedRoom===room.id?'#0d3941':'rgba(36,51,58,.78)';state.ctx.font=state.selectedRoom===room.id?'700 12px Arial':'600 10px Arial';state.ctx.textAlign='center';state.ctx.fillText(String(room.name||'Room').slice(0,24),label.x,label.y);
    state.roomMeshes.push({id:room.id,polygon:top2,room});
  }

  function draw3D() {
    if (!state.ctx || !state.canvas) return;
    const rect=state.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(420,rect.width||700),h=Math.max(360,rect.height||520);
    state.canvas.width=Math.round(w*dpr);state.canvas.height=Math.round(h*dpr);state.ctx.setTransform(dpr,0,0,dpr,0,0);state.ctx.clearRect(0,0,w,h);
    const bg=state.ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#f7f8fa');bg.addColorStop(1,'#e8ecef');state.ctx.fillStyle=bg;state.ctx.fillRect(0,0,w,h);
    const rooms=currentRooms(), floor=(state.model.floors||[]).find(f=>Number(f.floor_number)===Number(state.selectedFloor));
    const fw=Number(floor?.width_m||Math.max(...rooms.map(r=>Number(r.x||0)+Number(r.width||0)),12));
    const fd=Number(floor?.depth_m||Math.max(...rooms.map(r=>Number(r.y||0)+Number(r.depth||0)),10));
    const repairedRooms=repairRoomLayout(rooms,fw,fd);
    const maxDim=Math.max(fw,fd,10);
    const scale=Math.min((w-70)/maxDim,(h-85)/(maxDim*0.78))*state.zoom;
    state._cx=w/2;state._cy=h*.66;state._scale=scale;state.roomMeshes=[];
    // floor slab
    const slab=[[-fw/2,-.08,-fd/2],[fw/2,-.08,-fd/2],[fw/2,-.08,fd/2],[-fw/2,-.08,fd/2]].map(p=>project(worldToCamera(p[0],p[1],p[2]),state._cx,state._cy,state._scale));
    const slabPath=new Path2D();slabPath.moveTo(slab[0].x,slab[0].y);slab.slice(1).forEach(q=>slabPath.lineTo(q.x,q.y));slabPath.closePath();state.ctx.fillStyle='#c9b8a4';state.ctx.fill(slabPath);state.ctx.strokeStyle='#817366';state.ctx.stroke(slabPath);
    repairedRooms.slice().sort((a,b)=>Number(a.y||0)-Number(b.y||0)).forEach(r=>drawExtrudedRoom(r,fw,fd));
    state.ctx.fillStyle='#4c5960';state.ctx.font='600 12px Arial';state.ctx.textAlign='left';state.ctx.fillText(`${tr('Floor', 'الدور')} ${state.selectedFloor} • ${repairedRooms.length} ${tr('rooms', 'غرف')}`,14,22);
    state.ctx.fillStyle='#65747b';state.ctx.font='11px Arial';state.ctx.fillText(tr('Architectural cutaway • furnished schematic • preliminary digital twin', 'مخطط معماري مجسم • تأثيث تخطيطي • نموذج رقمي أولي'),14,40);
  }

  function pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj-xi)*(pt.y-yi)/(yj-yi || 1e-9)+xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function handle3DClick(e) {
    const rect = state.canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const hit = [...state.roomMeshes].reverse().find(m => pointInPolygon(pt, m.polygon));
    if (!hit) return;
    state.selectedRoom = hit.id;
    showRoomDetails(hit.room);
    render2D();
    draw3D();
  }

  run();
})();
