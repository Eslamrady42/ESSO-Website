import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const isAr = document.documentElement.lang === 'ar';
  const tr = (en, ar) => isAr ? ar : en;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const state = {
    project: null,
    model: null,
    floor: null,
    selectedRoom: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    root: null,
    rooms3d: new Map(),
    showWalls: true,
    showFurniture: true,
    showDevices: true,
    showLabels: true,
    floorW: 12,
    floorD: 10
  };

  if (!token) {
    $('viewerStatus').textContent = tr('Project token missing.', 'بيانات المشروع مفقودة.');
    return;
  }

  const COLORS = {
    slab: 0xd8d2c8,
    floor: 0xf0ebe2,
    wall: 0xd1c9bd,
    exterior: 0xa99f91,
    wood: 0x8b6a4e,
    woodDark: 0x5d4635,
    fabric: 0xaaa39a,
    fabricLight: 0xd8d1c8,
    metal: 0x92999b,
    glass: 0x8ebdcc,
    ceramic: 0xe9eceb,
    dark: 0x303538,
    green: 0x527c68,
    plant: 0x65815c,
    accent: 0x2d7568,
    review: 0xc58c2b,
    light: 0xffdf9b
  };

  function mat(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness == null ? 0.72 : roughness,
      metalness: metalness == null ? 0 : metalness
    });
  }

  function box(w, h, d, color, rough, metal) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d)), mat(color, rough, metal));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function cyl(r, h, color, segments, rough, metal) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.01, r), Math.max(0.01, r), Math.max(0.02, h), segments || 20), mat(color, rough, metal));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function sphere(r, color, rough, metal) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(color, rough, metal));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function group() { return new THREE.Group(); }

  function add(g, obj, x, y, z, rotY) {
    obj.position.set(x || 0, y || 0, z || 0);
    if (rotY != null) obj.rotation.y = rotY;
    g.add(obj);
    return obj;
  }

  function floorRooms() {
    return (state.model.rooms || []).filter(r => Number(r.floor) === Number(state.floor?.floor_number));
  }

  function polygon2D(room) {
    const p = Array.isArray(room.polygon) ? room.polygon : [];
    if (p.length >= 3) {
      return p.map(v => ({
        x: Number(v.x || 0) / 100 * state.floorW - state.floorW / 2,
        z: Number(v.y || 0) / 100 * state.floorD - state.floorD / 2
      }));
    }

    const x = Number(room.x || 0) - state.floorW / 2;
    const z = Number(room.y || 0) - state.floorD / 2;
    const w = Number(room.width || 0);
    const d = Number(room.depth || 0);
    if (w <= 0 || d <= 0) return [];
    return [
      {x:x,z:z},
      {x:x+w,z:z},
      {x:x+w,z:z+d},
      {x:x,z:z+d}
    ];
  }

  function envelope2D() {
    const p = Array.isArray(state.floor?.envelope?.points) ? state.floor.envelope.points : [];
    if (p.length >= 3) {
      return p.map(v => ({
        x: Number(v.x || 0) / 100 * state.floorW - state.floorW / 2,
        z: Number(v.y || 0) / 100 * state.floorD - state.floorD / 2
      }));
    }
    const rooms = floorRooms();
    if (rooms.length) {
      const polys = rooms.map(polygon2D).filter(p => p.length);
      const xs = polys.flatMap(p => p.map(v => v.x));
      const zs = polys.flatMap(p => p.map(v => v.z));
      if (xs.length && zs.length) {
        return [
          {x:Math.min.apply(null,xs),z:Math.min.apply(null,zs)},
          {x:Math.max.apply(null,xs),z:Math.min.apply(null,zs)},
          {x:Math.max.apply(null,xs),z:Math.max.apply(null,zs)},
          {x:Math.min.apply(null,xs),z:Math.max.apply(null,zs)}
        ];
      }
    }
    return [
      {x:-state.floorW/2,z:-state.floorD/2},
      {x: state.floorW/2,z:-state.floorD/2},
      {x: state.floorW/2,z: state.floorD/2},
      {x:-state.floorW/2,z: state.floorD/2}
    ];
  }

  function bounds(poly) {
    if (!poly || !poly.length) return {minX:0,maxX:0,minZ:0,maxZ:0,width:0,depth:0,cx:0,cz:0};
    const xs = poly.map(p => p.x), zs = poly.map(p => p.z);
    const minX = Math.min.apply(null,xs), maxX = Math.max.apply(null,xs);
    const minZ = Math.min.apply(null,zs), maxZ = Math.max.apply(null,zs);
    return {minX:minX,maxX:maxX,minZ:minZ,maxZ:maxZ,width:maxX-minX,depth:maxZ-minZ,cx:(minX+maxX)/2,cz:(minZ+maxZ)/2};
  }

  function pointInPoly(x,z,poly) {
    let inside = false;
    for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const xi=poly[i].x, zi=poly[i].z, xj=poly[j].x, zj=poly[j].z;
      const hit=((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/(zj-zi || 1e-9)+xi);
      if (hit) inside=!inside;
    }
    return inside;
  }

  function pointSegmentDistance(p,a,b) {
    const vx=b.x-a.x, vz=b.z-a.z, wx=p.x-a.x, wz=p.z-a.z;
    const vv=vx*vx+vz*vz || 1;
    const t=Math.max(0,Math.min(1,(wx*vx+wz*vz)/vv));
    const q={x:a.x+t*vx,z:a.z+t*vz};
    return Math.hypot(p.x-q.x,p.z-q.z);
  }

  function insideFootprint(poly,cx,cz,w,d,ang,clearance) {
    if (!poly || poly.length < 3) return false;
    const c=Math.cos(ang), s=Math.sin(ang), hw=w/2, hd=d/2;
    const pts=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd],[0,0]];
    for (const q of pts) {
      const x=cx+q[0]*c-q[1]*s, z=cz+q[0]*s+q[1]*c;
      if (!pointInPoly(x,z,poly)) return false;
      if (clearance > 0) {
        for (let i=0;i<poly.length;i++) {
          if (pointSegmentDistance({x:x,z:z},poly[i],poly[(i+1)%poly.length]) < clearance) return false;
        }
      }
    }
    return true;
  }

  function footprintOverlaps(a,b,gap) {
    const aw=(Math.abs(a.w*Math.cos(a.a||0))+Math.abs(a.d*Math.sin(a.a||0)))/2+gap;
    const ad=(Math.abs(a.w*Math.sin(a.a||0))+Math.abs(a.d*Math.cos(a.a||0)))/2+gap;
    const bw=(Math.abs(b.w*Math.cos(b.a||0))+Math.abs(b.d*Math.sin(b.a||0)))/2+gap;
    const bd=(Math.abs(b.w*Math.sin(b.a||0))+Math.abs(b.d*Math.cos(b.a||0)))/2+gap;
    return Math.abs(a.x-b.x) < aw+bw && Math.abs(a.z-b.z) < ad+bd;
  }

  function occupiedOk(candidate, occupied) {
    return !occupied.some(o => footprintOverlaps(candidate,o,0.07));
  }

  function openingPoints(room) {
    const out=[];
    const list=(room.door_details||[]).concat(room.window_details||[]);
    for(const o of list){
      if(!Number.isFinite(Number(o.x))||!Number.isFinite(Number(o.y))) continue;
      out.push({
        x:Number(o.x)/100*state.floorW-state.floorW/2,
        z:Number(o.y)/100*state.floorD-state.floorD/2,
        width:Number(o.width_pct||5)/100*Math.min(state.floorW,state.floorD)
      });
    }
    return out;
  }

  function nearOpening(room,cx,cz,clearance) {
    return openingPoints(room).some(o => Math.hypot(cx-o.x,cz-o.z) < Math.max(.35,clearance+o.width*.35));
  }

  function roomWallAnchors(room) {
    const poly=polygon2D(room);
    const anchors=[];
    if(poly.length<2) return anchors;
    let cx=0,cz=0;
    poly.forEach(p=>{cx+=p.x;cz+=p.z;});
    cx/=poly.length;cz/=poly.length;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
      if(len<.15) continue;
      const nx=-dz/len,nz=dx/len;
      const midX=(a.x+b.x)/2,midZ=(a.z+b.z)/2;
      const toCx=cx-midX,toCz=cz-midZ;
      const sign=(nx*toCx+nz*toCz)>0?-1:1;
      anchors.push({x:midX+nx*sign*.24,z:midZ+nz*sign*.24,angle:Math.atan2(dz,dx),len:len});
    }
    return anchors.sort((a,b)=>b.len-a.len);
  }

  function place(room,w,d,occupied,angles,preferWall=true) {
    const poly=polygon2D(room), b=bounds(poly);
    if(poly.length<3||b.width<=0||b.depth<=0) return null;
    const wallAnchors=preferWall?roomWallAnchors(room):[];
    const centerCandidates=[
      [b.cx,b.cz],
      [b.minX+b.width*.28,b.minZ+b.depth*.28],
      [b.minX+b.width*.72,b.minZ+b.depth*.28],
      [b.minX+b.width*.28,b.minZ+b.depth*.72],
      [b.minX+b.width*.72,b.minZ+b.depth*.72],
      [b.cx,b.minZ+b.depth*.22],
      [b.cx,b.minZ+b.depth*.78],
      [b.minX+b.width*.22,b.cz],
      [b.minX+b.width*.78,b.cz]
    ];
    const candidates=[];
    if(wallAnchors.length){
      for(const a of wallAnchors){
        const inwardX=Math.cos(a.angle+Math.PI/2), inwardZ=Math.sin(a.angle+Math.PI/2);
        for(const t of [.15,.30,.48,.62,.78]){
          const x=a.x+inwardX*Math.max(.22, d/2+.16);
          const z=a.z+inwardZ*Math.max(.22, d/2+.16);
          candidates.push([x,z,a.angle+Math.PI/2]);
        }
      }
    }
    centerCandidates.forEach(p=>candidates.push([p[0],p[1],null]));
    const scales=[1,.94,.88,.82,.76,.70,.64];
    const angs=angles&&angles.length?angles:[0,Math.PI/2];
    for(const sc of scales){
      for(const a of angs){
        const ww=w*sc,dd=d*sc;
        for(const p of candidates){
          const angle=p[2]!==null?p[2]:a;
          const cc={x:p[0],z:p[1],w:ww,d:dd,a:angle};
          if(nearOpening(room,cc.x,cc.z,Math.max(.45,dd*.35))) continue;
          if(insideFootprint(poly,cc.x,cc.z,cc.w,cc.d,cc.a,.12)&&occupiedOk(cc,occupied)) return cc;
        }
      }
    }
    return null;
  }

  function orientForRoom(room) {
    const anchors=roomWallAnchors(room);
    if(anchors.length) return anchors.slice(0,3).map(a=>a.angle+Math.PI/2);
    const b=bounds(polygon2D(room));
    return b.width>=b.depth?[0,Math.PI/2]:[Math.PI/2,0];
  }

  function addCarpet(g, w, d) {
    return add(g, box(w,0.025,d,0xcac0b2,0.96,0),0,0.015,0);
  }

  function makeBed(room,g,occ) {
    const b=bounds(polygon2D(room));
    const p=place(room,Math.min(2.15,Math.max(1.45,b.width*.58)),Math.min(2.25,Math.max(1.75,b.depth*.50)),occ,orientForRoom(room),true);
    if(!p) return;
    occ.push(p);
    const bed=group();
    add(bed,box(p.w,.26,p.d,COLORS.woodDark,.72),0,.23,0);
    add(bed,box(p.w-.08,.10,p.d-.12,0xf1ece4,.96),0,.41,0);
    add(bed,box(p.w,.95,.12,COLORS.woodDark,.72),0,.72,-p.d/2+.04);
    add(bed,box(p.w*.34,.11,Math.min(.46,p.d*.20),0xf9f4ec,.98),-p.w*.21,.50,-p.d*.29);
    add(bed,box(p.w*.34,.11,Math.min(.46,p.d*.20),0xf9f4ec,.98),p.w*.21,.50,-p.d*.29);
    add(bed,cyl(.025,.18,COLORS.metal,12,.35,.65),-p.w*.43,.09,p.d*.42);
    add(bed,cyl(.025,.18,COLORS.metal,12,.35,.65),p.w*.43,.09,p.d*.42);
    add(bed,cyl(.025,.18,COLORS.metal,12,.35,.65),-p.w*.43,.09,-p.d*.42);
    add(bed,cyl(.025,.18,COLORS.metal,12,.35,.65),p.w*.43,.09,-p.d*.42);
    add(g,addCarpet(bed,p.w*.92,p.d*.92),0,0,0,p.a);
    bed.position.set(p.x,.03,p.z); bed.rotation.y=p.a; g.add(bed);

    for(const side of [-1,1]){
      const np=place(room,.48,.48,occ,[p.a]);
      if(!np) continue;
      np.x=p.x+side*(p.w*.5+.32)*Math.cos(p.a);
      np.z=p.z+side*(p.w*.5+.32)*Math.sin(p.a);
      if(!insideFootprint(polygon2D(room),np.x,np.z,np.w,np.d,p.a,.07)||!occupiedOk(np,occ)) continue;
      occ.push(np);
      const ng=group();
      add(ng,box(np.w,.36,np.d,COLORS.wood,.72),0,.20,0);
      add(ng,cyl(.025,.40,COLORS.metal,12,.4,.3),0,.57,0);
      ng.position.set(np.x,.03,np.z); ng.rotation.y=p.a; g.add(ng);
    }

    const wp=place(room,Math.min(1.75,b.width*.32),.56,occ,[p.a,p.a+Math.PI/2]);
    if(wp){
      occ.push(wp);
      const wg=group();
      add(wg,box(wp.w,2.0,wp.d,COLORS.woodDark,.70),0,1,0);
      add(wg,box(.025,1.75,.025,COLORS.metal,.45,.6),-wp.w*.18,1.0,wp.d/2+.03);
      add(wg,box(.025,1.75,.025,COLORS.metal,.45,.6),wp.w*.18,1.0,wp.d/2+.03);
      wg.position.set(wp.x,.03,wp.z); wg.rotation.y=wp.a; g.add(wg);
    }
  }

  function makeSofa(room,g,occ) {
    const b=bounds(polygon2D(room));
    const p=place(room,Math.min(3.15,Math.max(1.9,b.width*.68)),Math.min(1.0,Math.max(.72,b.depth*.23)),occ,orientForRoom(room));
    if(!p) return;
    occ.push(p);
    const sg=group();
    add(sg,box(p.w,.42,p.d,COLORS.fabric,.92),0,.34,0);
    add(sg,box(p.w,.66,.24,COLORS.fabricLight,.96),0,.82,-p.d*.34);
    add(sg,box(p.w*.27,.12,p.d*.56,COLORS.fabricLight,.98,-1),-p.w*.30,.57,.02);
    add(sg,box(p.w*.27,.12,p.d*.56,COLORS.fabricLight,.98),0,.57,.02);
    add(sg,box(p.w*.27,.12,p.d*.56,COLORS.fabricLight,.98),p.w*.30,.57,.02);
    add(sg,box(.18,.08,p.d*.82,COLORS.woodDark,.7),-p.w*.44,.12,0);
    add(sg,box(.18,.08,p.d*.82,COLORS.woodDark,.7),p.w*.44,.12,0);
    sg.position.set(p.x,.03,p.z); sg.rotation.y=p.a; g.add(sg);

    const tp=place(room,.95,.58,occ,[p.a,p.a+Math.PI/2]);
    if(tp){
      occ.push(tp);
      const tg=group();
      add(tg,box(tp.w,.08,tp.d,COLORS.wood,.76),0,.40,0);
      add(tg,cyl(.03,.37,COLORS.metal,12,.42,.5),-.34,.19,-.20);
      add(tg,cyl(.03,.37,COLORS.metal,12,.42,.5),.34,.19,-.20);
      add(tg,cyl(.03,.37,COLORS.metal,12,.42,.5),-.34,.19,.20);
      add(tg,cyl(.03,.37,COLORS.metal,12,.42,.5),.34,.19,.20);
      tg.position.set(tp.x,.03,tp.z); tg.rotation.y=tp.a; g.add(tg);
    }

    const tv=place(room,Math.min(2.2,b.width*.46),.34,occ,[0,Math.PI/2],true);
    if(tv){
      occ.push(tv);
      const vg=group();
      add(vg,box(tv.w,.62,tv.d,COLORS.woodDark,.67),0,.33,0);
      add(vg,box(tv.w*.88,.85,.055,COLORS.dark,.32,.1),0,1.08,-tv.d/2-.04);
      tv && (vg.position.set(tv.x,.03,tv.z),vg.rotation.y=tv.a,g.add(vg));
    }
  }

  function makeDining(room,g,occ) {
    const b=bounds(polygon2D(room));
    const p=place(room,Math.min(1.75,Math.max(1.2,b.width*.44)),Math.min(1.0,Math.max(.75,b.depth*.30)),occ,orientForRoom(room));
    if(!p) return;
    occ.push(p);
    const tg=group();
    add(tg,box(p.w,.12,p.d,COLORS.wood,.75),0,.74,0);
    add(tg,cyl(.045,.70,COLORS.woodDark,14,.65),-p.w*.38,.35,-p.d*.35);
    add(tg,cyl(.045,.70,COLORS.woodDark,14,.65),p.w*.38,.35,-p.d*.35);
    add(tg,cyl(.045,.70,COLORS.woodDark,14,.65),-p.w*.38,.35,p.d*.35);
    add(tg,cyl(.045,.70,COLORS.woodDark,14,.65),p.w*.38,.35,p.d*.35);
    tg.position.set(p.x,.03,p.z); tg.rotation.y=p.a; g.add(tg);
    const chairPts=[[-1,-1],[1,-1],[-1,1],[1,1]];
    chairPts.forEach(q=>{
      const cp=place(room,.46,.46,occ,[p.a]);
      if(!cp) return;
      cp.x=p.x+q[0]*(p.w*.52); cp.z=p.z+q[1]*(p.d*.62);
      if(!insideFootprint(polygon2D(room),cp.x,cp.z,cp.w,cp.d,p.a,.05)||!occupiedOk(cp,occ)) return;
      occ.push(cp);
      const cg=group();
      add(cg,box(.42,.10,.42,COLORS.fabric,.95),0,.38,0);
      add(cg,cyl(.025,.36,COLORS.woodDark,10,.7),0,.18,0);
      cg.position.set(cp.x,.03,cp.z); cg.rotation.y=cp.a; g.add(cg);
    });
  }

  function makeKitchen(room,g,occ) {
    const poly=polygon2D(room), b=bounds(poly), horizontal=b.width>=b.depth;
    const cw=Math.min(horizontal?b.width:b.depth,4.2), cd=.58;
    const cp=place(room,cw,cd,occ,horizontal?[0,Math.PI/2]:[Math.PI/2,0],true);
    if(cp){
      occ.push(cp);
      const cg=group();
      add(cg,box(cp.w,.88,cp.d,0xd9d4cb,.72),0,.47,0);
      add(cg,box(cp.w+.02,.05,cp.d+.03,0xf4efe6,.45),0,.94,0);
      add(cg,box(.55,.82,.52,0xaeb1af,.38,.25),-cp.w*.28,.48,0);
      add(cg,box(.58,.82,.52,0xaeb1af,.38,.25),cp.w*.28,.48,0);
      cg.position.set(cp.x,.03,cp.z); cg.rotation.y=cp.a; g.add(cg);
    }
    const fridge=place(room,.72,.72,occ,[0,Math.PI/2]);
    if(fridge){
      occ.push(fridge);
      const fg=group();
      add(fg,box(.72,1.95,.72,0xd6d9d8,.35,.4),0,.99,0);
      add(fg,box(.40,.025,.025,COLORS.metal,.35,.7),0,1.04,.365);
      fg.position.set(fridge.x,.03,fridge.z); fg.rotation.y=fridge.a; g.add(fg);
    }
    if(b.width>3.2 && b.depth>2.9){
      const ip=place(room,Math.min(1.6,b.width*.30),Math.min(.72,b.depth*.22),occ,[0,Math.PI/2]);
      if(ip){
        occ.push(ip);
        const ig=group();
        add(ig,box(ip.w,.90,ip.d,0xd5d0c7,.7),0,.46,0);
        add(ig,box(ip.w+.03,.05,ip.d+.03,0xf4efe6,.45),0,.95,0);
        ig.position.set(ip.x,.03,ip.z); ig.rotation.y=ip.a; g.add(ig);
      }
    }
  }

  function makeBathroom(room,g,occ) {
    const sink=place(room,.65,.45,occ,[0,Math.PI/2]);
    if(sink){
      occ.push(sink);
      const sg=group();
      add(sg,box(.65,.16,.45,COLORS.ceramic,.48),0,.56,0);
      add(sg,cyl(.035,.44,COLORS.metal,14,.35,.65),0,.32,0);
      sg.position.set(sink.x,.03,sink.z); sg.rotation.y=sink.a; g.add(sg);
    }
    const toilet=place(room,.62,.90,occ,[0,Math.PI/2]);
    if(toilet){
      occ.push(toilet);
      const tg=group();
      add(tg,box(.62,.34,.72,COLORS.ceramic,.5),0,.20,0);
      add(tg,box(.44,.16,.40,COLORS.ceramic,.5),0,.46,-.08);
      tg.position.set(toilet.x,.03,toilet.z); tg.rotation.y=toilet.a; g.add(tg);
    }
    const shower=place(room,.90,.90,occ,[0,Math.PI/2]);
    if(shower){
      occ.push(shower);
      const sh=group();
      add(sh,box(.90,.04,.90,0xe0e5e4,.25,.2),0,.04,0);
      add(sh,box(.025,1.85,.86,COLORS.glass,.12,.15),-.43,.95,0);
      add(sh,cyl(.024,1.86,COLORS.metal,12,.35,.7),-.40,.93,-.40);
      sh.position.set(shower.x,.03,shower.z); sh.rotation.y=shower.a; g.add(sh);
    }
  }

  function makeOffice(room,g,occ) {
    const b=bounds(polygon2D(room));
    const p=place(room,Math.min(1.7,Math.max(1.05,b.width*.42)),.62,occ,orientForRoom(room));
    if(!p) return;
    occ.push(p);
    const dg=group();
    add(dg,box(p.w,.10,p.d,COLORS.wood,.75),0,.76,0);
    add(dg,cyl(.035,.72,COLORS.metal,12,.4,.6),-.55*p.w,.36,-.20);
    add(dg,cyl(.035,.72,COLORS.metal,12,.4,.6),.55*p.w,.36,-.20);
    dg.position.set(p.x,.03,p.z); dg.rotation.y=p.a; g.add(dg);
    const cp=place(room,.48,.48,occ,[p.a]);
    if(cp){
      cp.x=p.x-p.w*.42*Math.cos(p.a); cp.z=p.z-p.w*.42*Math.sin(p.a);
      if(insideFootprint(polygon2D(room),cp.x,cp.z,cp.w,cp.d,cp.a,.06)&&occupiedOk(cp,occ)){
        occ.push(cp);
        const cg=group();
        add(cg,box(.48,.12,.48,COLORS.fabric,.92),0,.42,0);
        add(cg,cyl(.03,.40,COLORS.metal,12,.4,.5),0,.20,0);
        cg.position.set(cp.x,.03,cp.z); g.add(cg);
      }
    }
  }

  function makeUtility(room,g,occ) {
    const b=bounds(polygon2D(room));
    const p=place(room,Math.min(.76,b.width*.34),Math.min(.72,b.depth*.28),occ,[0,Math.PI/2]);
    if(!p) return;
    occ.push(p);
    const wg=group();
    add(wg,box(p.w,.86,p.d,0xd6d9d8,.38,.3),0,.44,0);
    add(wg,cyl(Math.min(.21,p.w*.28),.05,0xb9bec0,24,.25,.1),0,.49,.05);
    wg.position.set(p.x,.03,p.z); wg.rotation.y=p.a; g.add(wg);
  }

  function buildFurniture(room,g) {
    if(!state.showFurniture) return;
    const occ=[];
    const t=String(room.type||'other').toLowerCase();
    if(t==='master_bedroom'||t==='bedroom') makeBed(room,g,occ);
    else if(t==='reception'||t==='living_room') makeSofa(room,g,occ);
    else if(t==='dining') makeDining(room,g,occ);
    else if(t==='kitchen') makeKitchen(room,g,occ);
    else if(t==='bathroom') makeBathroom(room,g,occ);
    else if(t==='office') makeOffice(room,g,occ);
    else if(t==='laundry'||t==='utility') makeUtility(room,g,occ);
  }

  function shapeFromPoly(poly) {
    const s=new THREE.Shape();
    if(!poly.length) return s;
    s.moveTo(poly[0].x,poly[0].z);
    for(let i=1;i<poly.length;i++) s.lineTo(poly[i].x,poly[i].z);
    s.closePath();
    return s;
  }

  function roomFloor(room,g) {
    const poly=polygon2D(room);
    if(poly.length<3)return;
    const floorColor=room.needs_review?0xf1e1b9:(
      room.type==='kitchen'?0xe8e2d5:
      room.type==='bathroom'?0xe4e9e8:
      (room.type==='master_bedroom'||room.type==='bedroom')?0xeee7dd:
      (room.type==='reception'||room.type==='living_room')?0xf1ece4:
      COLORS.floor
    );
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shapeFromPoly(poly)),mat(floorColor,.98));
    mesh.rotation.x=-Math.PI/2;
    mesh.position.y=.01;
    mesh.userData.roomId=room.id;
    mesh.receiveShadow=true;
    g.add(mesh);
  }

  function edgeKey(a,b) {
    const pa=a.x.toFixed(2)+','+a.z.toFixed(2);
    const pb=b.x.toFixed(2)+','+b.z.toFixed(2);
    return pa<pb?pa+'|'+pb:pb+'|'+pa;
  }

  function addWallSegment(a,b,height,thickness,color,g) {
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<.05)return;
    const m=box(len,height,thickness,color,.72,0);
    m.position.set((a.x+b.x)/2,height/2,(a.z+b.z)/2);
    m.rotation.y=-Math.atan2(dz,dx);
    g.add(m);
  }

  function renderWalls(g) {
    if(!state.showWalls)return;
    const edges=new Map();
    const addEdge=(a,b,type,thickness)=>{
      const k=edgeKey(a,b);
      if(edges.has(k))return;
      edges.set(k,{a:a,b:b,type:type||'interior',thickness:thickness,mesh:null});
    };

    (state.floor?.walls||[]).forEach(w=>{
      const pts=Array.isArray(w.points)?w.points:[];
      if(pts.length>=2){
        for(let i=0;i<pts.length-1;i++){
          addEdge(
            {x:Number(pts[i].x)/100*state.floorW-state.floorW/2,z:Number(pts[i].y)/100*state.floorD-state.floorD/2},
            {x:Number(pts[i+1].x)/100*state.floorW-state.floorW/2,z:Number(pts[i+1].y)/100*state.floorD-state.floorD/2},
            w.type,w.thickness_m
          );
        }
      }
    });

    const env=envelope2D();
    for(let i=0;i<env.length;i++) addEdge(env[i],env[(i+1)%env.length],'exterior',.18);

    floorRooms().forEach(room=>{
      const p=polygon2D(room);
      if(p.length>=2)for(let i=0;i<p.length;i++)addEdge(p[i],p[(i+1)%p.length],'interior',null);
    });

    edges.forEach(e=>{
      const isExterior=e.type==='exterior';
      const m=addWallSegment;
      addWallSegment(e.a,e.b,2.65,e.thickness||.13,isExterior?COLORS.exterior:COLORS.wall,g);
      const wall=g.children[g.children.length-1];
      if(wall){
        wall.userData.exterior=isExterior;
        wall.userData.a=e.a; wall.userData.b=e.b;
        wall.userData.baseVisible=true;
      }
    });
  }

  function updateCutaway() {
    if(!state.root||!state.camera)return;
    const cam=state.camera.position;
    state.root.traverse(obj=>{
      if(!obj.isMesh||!obj.userData.exterior||!obj.userData.a)return;
      const a=obj.userData.a,b=obj.userData.b;
      const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
      const nx=-dz/len,nz=dx/len;
      const toCam={x:cam.x-mx,z:cam.z-mz};
      const facing=Math.abs(nx*toCam.x+nz*toCam.z)>0.34*Math.hypot(toCam.x,toCam.z);
      const dist=Math.hypot(toCam.x,toCam.z);
      obj.visible=state.showWalls && !(facing && dist < Math.max(state.floorW,state.floorD)*3.5);
    });
  }

  function addOpeningMarkers(room,g) {
    if(!state.showLabels)return;
    const addOne=(o,isWin)=>{
      const x=Number(o.x||0)/100*state.floorW-state.floorW/2;
      const z=Number(o.y||0)/100*state.floorD-state.floorD/2;
      const width=Math.max(.18,Math.min(isWin?1.7:1.15,Number(o.width_pct||6)/100*Math.min(state.floorW,state.floorD)));
      const m=box(width,.045,isWin?.055:.16,isWin?COLORS.glass:COLORS.woodDark,.18,.15);
      m.position.set(x,.55,z);
      g.add(m);
    };
    (room.door_details||[]).forEach(o=>addOne(o,false));
    (room.window_details||[]).forEach(o=>addOne(o,true));
  }

  function nearestDoorPoint(room) {
    const doors=room.door_details||[];
    if(!doors.length) return null;
    const poly=polygon2D(room), b=bounds(poly);
    const cx=b.cx, cz=b.cz;
    const cands=doors.map(d=>({
      x:Number(d.x||0)/100*state.floorW-state.floorW/2,
      z:Number(d.y||0)/100*state.floorD-state.floorD/2
    })).filter(p=>pointInPoly(p.x,p.z,poly));
    if(!cands.length)return null;
    return cands.sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz))[0];
  }

  function addDevices(room,g) {
    if(!state.showDevices)return;
    const poly=polygon2D(room), b=bounds(poly);
    const ds=(state.model.devices||[]).filter(d=>d.room===room.name);
    if(!ds.length||poly.length<3)return;
    ds.forEach(dev=>{
      const qty=Math.max(1,Math.min(12,Number(dev.qty||1)));
      const type=String(dev.type||'').toLowerCase();
      for(let i=0;i<qty;i++){
        let x=b.cx,z=b.cz,y=2.48;
        if(type.includes('smoke')){
          y=2.62;
          const m=cyl(.10,.035,0xd9dede,24,.35,.2);m.position.set(x,y,z);m.userData.roomId=room.id;g.add(m);
          continue;
        }
        if(type.includes('ir hvac')||type.includes('remote')){
          y=1.55;
          x=b.minX+b.width*.84;z=b.cz;
          if(!pointInPoly(x,z,poly)){x=b.cx;z=b.cz;}
          const m=box(.16,.22,.055,0xe7e7e5,.38,.1);m.position.set(x,y,z);m.userData.roomId=room.id;g.add(m);
          continue;
        }
        if(type.includes('water leak')){
          y=.10;
          x=b.cx;z=b.minZ+b.depth*.78;
        } else if(type.includes('gas')){
          y=.62;x=b.cx;z=b.minZ+b.depth*.20;
        } else if(type.includes('lighting switch')||type.includes('switch')){
          y=1.22;
          const dp=nearestDoorPoint(room);
          if(dp){x=dp.x;z=dp.z;} else {x=b.minX+b.width*.08;z=b.cz;}
          if(!pointInPoly(x,z,poly)){x=b.cx;z=b.cz;}
          const plate=box(.18,.30,.055,0xf0f1ee,.40,.05);
          plate.position.set(x,y,z);plate.userData.roomId=room.id;g.add(plate);
          continue;
        } else {
          const cols=Math.min(4,qty);
          x=b.minX+b.width*(.30+(i%cols)*(.40/Math.max(1,cols-1)));
          z=b.minZ+b.depth*(.30+Math.floor(i/cols)*.36);
          if(!pointInPoly(x,z,poly)){x=b.cx;z=b.cz;}
        }
        const col=dev.category==='Safety'?0xd47d64:(dev.category==='Lighting'?0xe2b44f:COLORS.accent);
        const m=sphere(.075,col,.42,.18);
        m.position.set(x,y,z);m.userData.roomId=room.id;g.add(m);
      }
    });
  }

  function buildFloor3D() {
    if(!state.root||!state.floor)return;
    while(state.root.children.length){
      const child=state.root.children.pop();
      child.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material){
          const ms=Array.isArray(o.material)?o.material:[o.material];
          ms.forEach(mm=>mm.dispose&&mm.dispose());
        }
      });
    }
    state.rooms3d.clear();

    state.floorW=Math.max(.1,Number(state.floor.width_m||12));
    state.floorD=Math.max(.1,Number(state.floor.depth_m||10));
    const env=envelope2D();

    const base=group();
    const slab=new THREE.Mesh(new THREE.ShapeGeometry(shapeFromPoly(env)),mat(COLORS.slab,.96));
    slab.rotation.x=-Math.PI/2;slab.position.y=-.08;slab.receiveShadow=true;base.add(slab);
    state.root.add(base);

    floorRooms().forEach(room=>{
      const rg=group();
      rg.userData.roomId=room.id;
      roomFloor(room,rg);
      buildFurniture(room,rg);
      addDevices(room,rg);
      addOpeningMarkers(room,rg);
      state.root.add(rg);
      state.rooms3d.set(room.id,rg);
    });

    const walls=group();
    renderWalls(walls);
    state.root.add(walls);

    const foundation=box(state.floorW+.9,.07,state.floorD+.9,0xc3bdb3,.98);
    foundation.position.y=-.13;foundation.receiveShadow=true;state.root.add(foundation);

    fitCamera();
    render2D();
    if(state.selectedRoom) highlight3D(state.selectedRoom);
  }

  function rootBounds() {
    return new THREE.Box3().setFromObject(state.root);
  }

  function fitCamera() {
    if(!state.camera||!state.controls||!state.root)return;
    const b=rootBounds(), size=b.getSize(new THREE.Vector3()), center=b.getCenter(new THREE.Vector3());
    const maxDim=Math.max(size.x,size.y,size.z,.1);
    const dist=maxDim*1.55;
    // Start from a front/quarter architectural cutaway angle so the facade facing the viewer is open.
    state.camera.position.set(center.x+dist*.82,center.y+dist*.74,center.z+dist*1.04);
    state.camera.near=Math.max(.01,dist/200);
    state.camera.far=Math.max(100,dist*30);
    state.camera.updateProjectionMatrix();
    state.controls.target.copy(center);
    state.controls.minDistance=Math.max(1,dist*.14);
    state.controls.maxDistance=Math.max(30,dist*8);
    state.controls.update();
  }

  function topView() {
    const b=rootBounds(), c=b.getCenter(new THREE.Vector3()), d=Math.max(state.floorW,state.floorD)*1.2;
    state.camera.position.set(c.x,d*1.7,c.z+.01);
    state.camera.lookAt(c);
    state.controls.target.copy(c);
    state.controls.update();
  }

  function highlight3D(id) {
    state.rooms3d.forEach((g,rid)=>{
      const active=rid===id;
      g.traverse(o=>{
        if(!o.isMesh||!o.material)return;
        const ms=Array.isArray(o.material)?o.material:[o.material];
        ms.forEach(m=>{
          if(m.emissive){
            m.emissive.setHex(active?0x234d45:0);
            m.emissiveIntensity=active?.22:0;
          }
        });
      });
    });
  }

  function render2D() {
    const el=$('floorPlan2d');
    if(!state.floor){el.innerHTML='<div class="empty-state">'+esc(tr('No floor available.','لا يوجد دور متاح.'))+'</div>';return;}
    const rooms=floorRooms();
    if(!rooms.length){el.innerHTML='<div class="empty-state">'+esc(tr('No reliable rooms were detected for this floor.','لم يتم اكتشاف غرف موثوقة في هذا الدور.'))+'</div>';return;}

    const env=Array.isArray(state.floor.envelope?.points)&&state.floor.envelope.points.length>=3?state.floor.envelope.points:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
    const ps=p=>p.map(q=>Number(q.x).toFixed(2)+','+Number(q.y).toFixed(2)).join(' ');
    const roomShapes=rooms.map(r=>{
      let p=Array.isArray(r.polygon)&&r.polygon.length>=3?r.polygon:null;
      if(!p){
        p=[
          {x:Number(r.x||0)/state.floorW*100,y:Number(r.y||0)/state.floorD*100},
          {x:(Number(r.x||0)+Number(r.width||0))/state.floorW*100,y:Number(r.y||0)/state.floorD*100},
          {x:(Number(r.x||0)+Number(r.width||0))/state.floorW*100,y:(Number(r.y||0)+Number(r.depth||0))/state.floorD*100},
          {x:Number(r.x||0)/state.floorW*100,y:(Number(r.y||0)+Number(r.depth||0))/state.floorD*100}
        ];
      }
      return {r:r,p:p};
    });

    const wallLines=(state.floor.walls||[]).map(w=>Array.isArray(w.points)&&w.points.length>=2?w.points:null).filter(Boolean);
    const roomEls=roomShapes.map(x=>{
      const selected=x.r.id===state.selectedRoom;
      const fill=x.r.needs_review?'#f0dfa9':'#dceae7';
      const stroke=selected?'#275d54':'#56756f';
      return '<polygon points=\''+ps(x.p)+'\' class="plan-room-poly '+(x.r.needs_review?'review ':'')+(selected?'selected':'')+'" data-room-id=\''+esc(x.r.id)+'\' style="fill:'+fill+';stroke:'+stroke+';"></polygon>' +
             '<text x=\''+(x.p.reduce((a,v)=>a+Number(v.x),0)/x.p.length).toFixed(2)+'\' y=\''+(x.p.reduce((a,v)=>a+Number(v.y),0)/x.p.length).toFixed(2)+'\' class="plan-room-label">'+esc(x.r.name)+'</text>';
    }).join('');

    const doorEls=rooms.flatMap(r=>(r.door_details||[]).map(d=>'<circle cx=\''+esc(d.x)+'\' cy=\''+esc(d.y)+'\' r="1.15" class="plan-door"></circle>')).join('');
    const winEls=rooms.flatMap(r=>(r.window_details||[]).map(d=>'<rect x=\''+(Number(d.x||0)-1.4)+'\' y=\''+(Number(d.y||0)-.6)+'\' width="2.8" height="1.2" class="plan-window"></rect>')).join('');

    el.innerHTML='<div class="plan-svg-wrap"><svg class="esso-plan-svg" viewBox="0 0 100 100" role="img" aria-label="'+esc(tr('AI reconstructed floor plan','المخطط المعاد بناؤه بالذكاء الاصطناعي'))+'">' +
      '<polygon points=\''+ps(env)+'\' class="plan-envelope"></polygon>' +
      wallLines.map(w=>'<polyline points=\''+ps(w)+'\' class="plan-wall"></polyline>').join('') +
      roomEls+doorEls+winEls+
      '</svg><div class="plan-scale-note">'+esc(tr('Normalized preliminary geometry — source drawing remains authoritative.','هندسة أولية بإحداثيات نسبية — الرسم الأصلي هو المرجع الأساسي.'))+'</div></div>';

    el.querySelectorAll('[data-room-id]').forEach(node=>node.addEventListener('click',()=>{
      state.selectedRoom=node.dataset.roomId;
      showRoomDetails((state.model.rooms||[]).find(r=>r.id===state.selectedRoom)||null);
      render2D();highlight3D(state.selectedRoom);
    }));
  }

  function showRoomDetails(room) {
    const b=$('roomDetails');
    if(!room){b.hidden=true;return;}
    const devices=(state.model.devices||[]).filter(d=>d.room===room.name);
    const ev=room.evidence||{};
    b.hidden=false;
    b.innerHTML='<strong>'+esc(room.name)+'</strong>' +
      '<span>'+esc(room.type||tr('Room','غرفة'))+(room.area_sqm?' • '+esc(room.area_sqm)+' m²':' • '+esc(tr('Area not verified','المساحة غير مؤكدة')))+'</span>' +
      '<span>'+esc(tr('Confidence','الثقة'))+': '+Math.round(Number(room.confidence||0))+'%</span>' +
      (ev.label_detected?'<span>Label: '+esc(ev.label_text)+'</span>':'') +
      '<div>'+(devices.map(d=>esc(d.type)+' × '+esc(d.qty)).join('<br>')||esc(tr('No device data','لا توجد بيانات أجهزة')))+'</div>';
  }

  function renderFloors() {
    const tabs=$('floorTabs');
    const floors=state.model.floors||[];
    tabs.innerHTML=floors.map(f=>'<button type="button" class="floor-tab '+(Number(f.floor_number)===Number(state.floor?.floor_number)?'active':'')+'" data-floor=\''+esc(f.floor_number)+'\'>'+esc(tr('Floor','الدور'))+' '+esc(f.floor_number)+'</button>').join('');
    tabs.querySelectorAll('.floor-tab').forEach(b=>b.addEventListener('click',()=>{
      state.floor=floors.find(f=>Number(f.floor_number)===Number(b.dataset.floor))||state.floor;
      state.selectedRoom=null;
      renderFloors();
      buildFloor3D();
      showRoomDetails(null);
    }));
  }

  function renderStats() {
    const rooms=state.model.rooms||[], devices=state.model.devices||[];
    const review=rooms.filter(r=>r.needs_review).length;
    const total=state.model.project?.area_sqm ?? state.project.project?.area ?? 'TBD';
    $('viewerStats').innerHTML=[
      [tr('Area','المساحة'),total!=='TBD'?String(total)+' m²':'TBD'],
      [tr('Floors','الأدوار'),(state.model.floors||[]).length],
      [tr('Rooms','الغرف'),rooms.length],
      [tr('Devices','الأجهزة'),devices.length],
      [tr('Needs review','تحتاج مراجعة'),review]
    ].map(v=>'<div class="viewer-stat"><span>'+esc(v[0])+'</span><strong>'+esc(v[1])+'</strong></div>').join('');
  }

  function renderTables() {
    const devices=state.model.devices||[], boq=state.model.boq||[];
    $('deviceTable').innerHTML='<div class="table-scroll"><table class="smart-table"><thead><tr><th>'+tr('Room','الغرفة')+'</th><th>'+tr('Device','الجهاز')+'</th><th>'+tr('Qty','الكمية')+'</th><th>'+tr('Category','الفئة')+'</th><th>'+tr('Required','المطلوب')+'</th></tr></thead><tbody>'+
      (devices.length?devices.map(d=>'<tr><td>'+esc(d.room)+'</td><td>'+esc(d.type)+'</td><td>'+esc(d.qty)+'</td><td>'+esc(d.category)+'</td><td>'+esc(d.required==='required'?tr('Yes','نعم'):tr('Recommended','موصى به'))+'</td></tr>').join(''):'<tr><td colspan="5">'+esc(tr('No devices generated.','لم يتم إنشاء أجهزة.'))+'</td></tr>')+
      '</tbody></table></div>';
    $('boqTable').innerHTML='<div class="table-scroll"><table class="smart-table"><thead><tr><th>'+tr('Category','الفئة')+'</th><th>'+tr('Item','البند')+'</th><th>'+tr('Qty','الكمية')+'</th><th>'+tr('Rooms','الغرف')+'</th><th>'+tr('Required','المطلوب')+'</th></tr></thead><tbody>'+
      (boq.length?boq.map(b=>'<tr><td>'+esc(b.category)+'</td><td>'+esc(b.item)+'</td><td>'+esc(b.quantity)+'</td><td>'+esc((b.rooms||[]).join(', ')||tr('Project','المشروع'))+'</td><td>'+esc(b.required?tr('Yes','نعم'):tr('Recommended','موصى به'))+'</td></tr>').join(''):'<tr><td colspan="5">'+esc(tr('No BOQ generated.','لم يتم إنشاء BOQ.'))+'</td></tr>')+
      '</tbody></table></div>';
  }

  function renderReview() {
    const a=state.project.analysis||{};
    const notes=[...(a.needs_review||[]),...(a.analysis_notes||[])];
    const box=$('reviewBox');
    if(!notes.length){box.hidden=true;return;}
    box.hidden=false;
    box.innerHTML='<strong>'+esc(tr('Engineering review required','تحتاج هذه النتائج إلى مراجعة هندسية'))+'</strong><ul>'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
  }

  function setup3D() {
    const host=$('model3d');
    host.innerHTML='<div class="model3d-toolbar">' +
      '<button type="button" data-action="fit">'+tr('Fit View','ملاءمة العرض')+'</button>' +
      '<button type="button" data-action="top">'+tr('Top View','المسقط')+'</button>' +
      '<button type="button" data-action="walls">'+tr('Walls','الجدران')+'</button>' +
      '<button type="button" data-action="furniture">'+tr('Furniture','الأثاث')+'</button>' +
      '<button type="button" data-action="devices">'+tr('Devices','الأجهزة')+'</button>' +
      '<button type="button" data-action="labels">'+tr('Labels','المسميات')+'</button>' +
      '</div><div class="model3d-canvas-wrap"><canvas id="esso3dCanvas"></canvas></div>' +
      '<div class="model3d-hud"><span class="model3d-badge">ESSO DIGITAL TWIN</span><span>'+tr('Orbit • Zoom • Pan','دوران • تكبير • تحريك')+'</span></div>';

    const canvas=$('esso3dCanvas');
    state.renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false});
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    state.renderer.outputColorSpace=THREE.SRGBColorSpace;
    state.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure=1.05;
    state.renderer.shadowMap.enabled=true;
    state.renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    state.scene=new THREE.Scene();
    state.scene.background=new THREE.Color(0xe7e4de);
    state.scene.fog=new THREE.Fog(0xe7e4de,35,140);

    const hemi=new THREE.HemisphereLight(0xffffff,0x766f66,2.1);
    state.scene.add(hemi);
    const key=new THREE.DirectionalLight(0xffffff,3.5);
    key.position.set(10,18,8);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);
    key.shadow.camera.left=-35;key.shadow.camera.right=35;key.shadow.camera.top=35;key.shadow.camera.bottom=-35;
    state.scene.add(key);
    const fill=new THREE.DirectionalLight(0xd7e7ff,1.0);
    fill.position.set(-8,10,-10);state.scene.add(fill);

    state.root=new THREE.Group();
    state.scene.add(state.root);

    state.camera=new THREE.PerspectiveCamera(42,1,.01,1000);
    state.controls=new OrbitControls(state.camera,canvas);
    state.controls.enableDamping=true;
    state.controls.dampingFactor=.075;
    state.controls.screenSpacePanning=true;
    state.controls.enablePan=true;
    state.controls.minPolarAngle=.18;
    state.controls.maxPolarAngle=Math.PI*.49;

    canvas.addEventListener('pointerup',e=>{
      if(Math.abs(e.clientX-(canvas._downX||e.clientX))>5 || Math.abs(e.clientY-(canvas._downY||e.clientY))>5)return;
      const rect=canvas.getBoundingClientRect();
      const ndc=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      const ray=new THREE.Raycaster();ray.setFromCamera(ndc,state.camera);
      const meshes=[];
      state.rooms3d.forEach(g=>g.traverse(o=>{if(o.isMesh)meshes.push(o);}));
      const hits=ray.intersectObjects(meshes,true);
      let id=hits[0]?.object?.userData?.roomId||null;
      if(!id&&hits[0]){
        const p=hits[0].point;
        id=floorRooms().find(r=>pointInPoly(p.x,p.z,polygon2D(r)))?.id||null;
      }
      if(id){
        state.selectedRoom=id;
        showRoomDetails((state.model.rooms||[]).find(r=>r.id===id)||null);
        render2D();highlight3D(id);
      }
    });
    canvas.addEventListener('pointerdown',e=>{canvas._downX=e.clientX;canvas._downY=e.clientY;});

    host.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{
      const a=btn.dataset.action;
      if(a==='fit')fitCamera();
      if(a==='top')topView();
      if(a==='walls'){state.showWalls=!state.showWalls;buildFloor3D();}
      if(a==='furniture'){state.showFurniture=!state.showFurniture;buildFloor3D();}
      if(a==='devices'){state.showDevices=!state.showDevices;buildFloor3D();}
      if(a==='labels'){state.showLabels=!state.showLabels;buildFloor3D();}
    }));

    window.addEventListener('resize',resize3D);
    resize3D();
  }

  function resize3D() {
    if(!state.renderer||!state.camera)return;
    const canvas=$('esso3dCanvas');
    if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const w=Math.max(320,rect.width),h=Math.max(420,rect.height);
    state.renderer.setSize(w,h,false);
    state.camera.aspect=w/h;
    state.camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    if(state.controls)state.controls.update();
    updateCutaway();
    if(state.renderer&&state.scene&&state.camera)state.renderer.render(state.scene,state.camera);
  }

  async function run() {
    try {
      const r=await fetch('api/project.php?token='+encodeURIComponent(token),{credentials:'same-origin',cache:'no-store'});
      const j=await r.json();
      if(!r.ok||!j.success)throw new Error(j.message||tr('Project not found','المشروع غير موجود'));
      state.project=j.project;
      state.model=state.project.digital_model||{};
      const floors=state.model.floors||[];
      if(!floors.length)throw new Error(tr('No floor model is available yet.','لا يوجد نموذج أدوار متاح حتى الآن.'));
      state.floor=floors[0];
      $('viewerStatus').hidden=true;
      $('viewer').hidden=false;
      $('projectToken').textContent=tr('PROJECT ','المشروع ')+state.project.token;
      $('projectTitle').textContent=(state.model.project?.type||tr('Smart Home','المنزل الذكي'))+(isAr?' — المعاينة الرقمية':' — Digital Twin');
      $('projectSubtitle').textContent=String(state.model.rooms?.length||0)+' '+tr('rooms','غرف')+' • '+String(state.model.devices?.length||0)+' '+tr('smart items','أجهزة ذكية');
      renderFloors();renderStats();renderTables();renderReview();setup3D();buildFloor3D();animate();
    } catch(e) {
      $('viewerStatus').textContent=e.message||tr('Unable to load preview.','تعذر تحميل المعاينة.');
    }
  }

  run();
})();