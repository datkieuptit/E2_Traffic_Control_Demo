// =================================================================
// E2 - Traffic Signal Control Demo
// =================================================================

let DATA = {};
let selectedIntersectionId = 'INT_KIMMA_NGUYCHINHTHANH';
let selectedRealtimeCameraId = null;
let currentPlanId = 'PLAN_PEAK_MORNING';
let currentPhaseIdx = 0;
let phaseElapsed = 0;
let phaseInterval = null;

// ================== BOOTSTRAP ==================
fetch('data/mock_data.json')
    .then(r => r.json())
    .then(data => {
        DATA = data;
        initTabs();
        renderAll();
        startPhaseTimer();
        startEventTicker();
    })
    .catch(err => console.error('[E2] Failed to load mock_data.json:', err));

function renderAll() {
    renderHeader();
    renderLicense();
    renderSensors();
    renderIntersections();
    renderMainCams();
    renderEvents();
    renderRealtimeCameras();
    renderVehicleCounts();
    renderVehicleClasses();
    renderODSankey();
    renderTrajectories();
    renderSignalPlans();
    renderSignalStatus();
    renderPriorityModes();
    renderCorridors();
    renderTimeSpaceDiagram();
    renderForecastChart();
    renderPredictions();
    renderSuggestions();
    renderHourlyChart();
    renderTopIntersections();
    renderVehicleDist();
    renderHeatmap();
    initDragDrop();
}

// ================== TABS ==================
function initTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(n =>
        n.classList.toggle('active', n.dataset.tab === tabId)
    );
    document.querySelectorAll('.tab').forEach(t =>
        t.classList.toggle('active', t.id === `${tabId}Tab`)
    );
    const titles = {
        dashboard: 'Tổng Quan Giao Thông',
        realtime: 'Phân Tích Thời Gian Thực',
        signal: 'Điều Khiển Tín Hiệu',
        greenwave: 'Làn Sóng Xanh',
        forecast: 'Dự Báo & Mô Hình',
        visualization: 'Trực Quan Hoá',
        health: 'Giám Sát Hệ Thống'
    };
    document.getElementById('pageTitle').textContent = titles[tabId] || '';
}

// ================== HEADER & LICENSE ==================
function renderHeader() {
    const ov = DATA.system_overview;
    if (!ov) return;
    document.getElementById('totalVehicles').textContent =
        (ov.total_vehicles_today / 1000000).toFixed(2) + 'M';
}

function renderLicense() {
    const lic = DATA.license_info;
    if (!lic) return;
    const keyEl = document.getElementById('licenseKey');
    const ctrlEl = document.getElementById('licCtrl');
    const intEl = document.getElementById('licInt');
    const tagsEl = document.getElementById('complianceTags');
    if (keyEl) keyEl.textContent = lic.license_key;
    if (ctrlEl) ctrlEl.textContent = `${lic.active_controllers} / ${lic.max_controllers}`;
    if (intEl) intEl.textContent = `${lic.active_intersections} / ${lic.max_intersections}`;
    if (tagsEl) {
        tagsEl.innerHTML = lic.compliance.map(c =>
            `<span class="comp-tag">✓ ${c}</span>`
        ).join('');
    }
}

// ================== SENSORS ==================
function renderSensors() {
    const grid = document.getElementById('sensorGrid');
    if (!grid) return;
    const cams = DATA.camera_types || [];
    const sensors = DATA.sensor_types || [];
    grid.innerHTML = [
        ...cams.map(c => `
            <div class="sensor-card" style="border-left-color:${c.color}">
                <div class="sensor-icon" style="background:${c.color}22;color:${c.color}">${c.icon}</div>
                <div class="sensor-body">
                    <div class="sensor-name">${c.name}</div>
                    <div class="sensor-count">${c.total_count.toLocaleString()} <small>thiết bị</small></div>
                    <div class="sensor-desc">${c.desc}</div>
                    <div class="sensor-proto">📡 ${c.protocol}</div>
                </div>
            </div>
        `),
        ...sensors.map(s => `
            <div class="sensor-card" style="border-left-color:${s.color}">
                <div class="sensor-icon" style="background:${s.color}22;color:${s.color}">${s.icon}</div>
                <div class="sensor-body">
                    <div class="sensor-name">${s.name}</div>
                    <div class="sensor-count">${s.online.toLocaleString()} / ${s.count.toLocaleString()}</div>
                    <div class="sensor-desc">${s.desc}</div>
                    <div class="sensor-proto">📡 ${s.protocol}</div>
                </div>
            </div>
        `)
    ].join('');
}

// ================== INTERSECTIONS ==================
function renderIntersections() {
    const grid = document.getElementById('intersectionGrid');
    if (!grid || !DATA.intersection_groups) return;
    grid.innerHTML = DATA.intersection_groups.map(g => {
        const isActive = g.id === selectedIntersectionId;
        const phaseDots = ['r', 'g', 'g', 'y'].slice(0, g.signal_phases || 4)
            .map(c => `<span class="dot-mini ${c}"></span>`).join('');
        return `
            <div class="location-item ${isActive ? 'active' : ''}" onclick="selectIntersection('${g.id}')">
                <div class="loc-header">
                    <span class="loc-icon">${g.icon}</span>
                    <span class="loc-name">${g.name}</span>
                </div>
                <div class="loc-stats">
                    <span class="loc-cameras">${g.online}/${g.total_cameras}</span> camera •
                    ${g.signal_phases} pha • chu kỳ ${g.avg_cycle_time}s
                    <br>${g.zone} • Mức độ: <strong style="color:${trafficLevelColor(g.traffic_level)}">${trafficLevelLabel(g.traffic_level)}</strong>
                </div>
                <div class="loc-signal-state">${phaseDots}</div>
            </div>
        `;
    }).join('');
}

function trafficLevelColor(lvl) {
    return { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }[lvl] || '#7c8fa6';
}
function trafficLevelLabel(lvl) {
    return { low: 'Thấp', medium: 'TB', high: 'Cao', critical: 'Rất Cao' }[lvl] || lvl;
}

window.selectIntersection = function (id) {
    selectedIntersectionId = id;
    const g = DATA.intersection_groups.find(x => x.id === id);
    if (g) document.getElementById('selectedIntersectionName').textContent = g.name;
    renderIntersections();
    renderMainCams();
};

// ================== MAIN CAMERAS ==================
function renderMainCams() {
    const grid = document.getElementById('mainCamGrid');
    if (!grid) return;
    const g = DATA.intersection_groups.find(x => x.id === selectedIntersectionId);
    if (!g) return;
    const cams = (DATA.cameras || []).filter(c => g.cameras.includes(c.id));
    grid.innerHTML = cams.map(c => {
        const t = (c.type || '').toLowerCase().replace('_', '');
        const typeIcon = c.type === 'TYPE_3' ? '📊' : '🔭';
        const dotCls = c.status === 'online' ? 'green' : c.status === 'warning' ? 'yellow' : 'red';
        return `
            <div class="cam-box ${t}">
                <div class="cam-header">
                    <span class="dot ${dotCls}"></span> ${c.id}
                    <span style="margin-left:auto;color:var(--txt2);font-weight:400;">${dirLabel(c.direction)}</span>
                </div>
                <div class="cam-stream">
                    <img class="cam-video" src="data/pexels-tkirkgoz-11546501.jpg" alt="${c.id} feed"/>
                    <div class="cam-type-badge ${t}">${typeIcon} ${c.type.replace('_', ' ')}</div>
                    <div class="cam-live-tag">🔴 LIVE</div>
                    <div class="cam-stream-meta">${c.res} • ${c.bitrate}</div>
                </div>
                <div class="cam-footer">
                    <span class="tag">H.265</span>
                    <span class="tag">IP: ${c.ip}</span>
                    <span class="tag">${c.fps}fps</span>
                    <span class="tag">⏱ ${c.uptime}</span>
                </div>
            </div>
        `;
    }).join('');
}

function dirLabel(d) {
    return { north: '⬆ Bắc', south: '⬇ Nam', east: '➡ Đông', west: '⬅ Tây', overview: '🔭 Toàn cảnh' }[d] || d;
}

// ================== EVENTS ==================
function renderEvents() {
    const list = document.getElementById('eventList');
    if (!list) return;
    list.innerHTML = (DATA.events || []).map(e => `
        <div class="evt-card ${e.type}">
            <div class="evt-header">
                <strong>${e.title}</strong>
                <span class="et">${e.time}</span>
            </div>
            <div class="edesc">${e.desc}</div>
            <span class="evt-tag">${e.tag}</span>
        </div>
    `).join('');
}

function startEventTicker() {
    setInterval(() => {
        const list = document.getElementById('eventList');
        if (!list || !DATA.events?.length) return;
        const newE = { ...DATA.events[Math.floor(Math.random() * DATA.events.length)] };
        newE.time = 'vừa xong';
        const card = document.createElement('div');
        card.className = `evt-card ${newE.type}`;
        card.innerHTML = `
            <div class="evt-header"><strong>${newE.title}</strong><span class="et">${newE.time}</span></div>
            <div class="edesc">${newE.desc}</div>
            <span class="evt-tag">${newE.tag}</span>
        `;
        list.insertBefore(card, list.firstChild);
        if (list.children.length > 10) list.removeChild(list.lastChild);
    }, 6000);
}

// ================== REALTIME TAB ==================
function renderRealtimeCameras() {
    const grid = document.getElementById('realtimeCameraGrid');
    if (!grid) return;
    const sample = (DATA.cameras || []).slice(0, 12);
    if (!selectedRealtimeCameraId && sample.length) selectedRealtimeCameraId = sample[0].id;
    grid.innerHTML = sample.map(c => {
        const t = c.type === 'TYPE_3' ? 'type3' : 'type4';
        const icon = c.type === 'TYPE_3' ? '📊' : '🔭';
        const isActive = c.id === selectedRealtimeCameraId;
        return `
            <div class="camera-select-item ${t} ${isActive ? 'active' : ''}" onclick="selectRealtimeCamera('${c.id}')">
                <div class="camera-select-icon">${icon}</div>
                <div class="camera-select-info">
                    <div class="camera-select-id">${c.id}</div>
                    <div class="camera-select-name">${c.name}</div>
                    <div class="camera-select-location">${c.ip} • ${c.res}</div>
                </div>
            </div>
        `;
    }).join('');
    updateRealtimeOverlay();
}

window.selectRealtimeCamera = function (id) {
    selectedRealtimeCameraId = id;
    renderRealtimeCameras();
    renderVehicleCounts();
};

function updateRealtimeOverlay() {
    const cam = (DATA.cameras || []).find(c => c.id === selectedRealtimeCameraId);
    if (!cam) return;
    const protoEl = document.getElementById('rtStreamProtocol');
    const camEl = document.getElementById('rtStreamCamera');
    const phEl = document.getElementById('realtimeVideoPlaceholder');
    if (protoEl) protoEl.textContent = `RTSP://${cam.ip}:554/stream`;
    if (camEl) {
        camEl.textContent = cam.id;
        camEl.style.background = cam.type === 'TYPE_3' ? 'rgba(16,185,129,.9)' : 'rgba(59,130,246,.9)';
    }
    if (phEl) {
        const isT3 = cam.type === 'TYPE_3';
        phEl.innerHTML = `
            <img src="data/pexels-tkirkgoz-11546501.jpg" alt="${cam.id}" class="rt-stream-img"/>
            <div class="rt-stream-caption">
                <div class="rt-cap-icon">${isT3 ? '📊' : '🔭'}</div>
                <div class="rt-cap-title">${isT3 ? 'Camera TYPE_3 - Đo Đếm Lưu Lượng' : 'Camera TYPE_4 - Toàn Cảnh Nút Giao'}</div>
                <div class="rt-cap-sub">${isT3 ? 'RTSP + AI Vehicle Counting' : 'RTSP + O-D Matrix Analysis'}</div>
            </div>
        `;
    }
    // Detection boxes
    const overlay = document.getElementById('vehicleDetectionOverlay');
    if (overlay) {
        const types = ['car', 'bike', 'bus', 'truck'];
        const labels = { car: '🚗 Ô tô', bike: '🏍️ Xe máy', bus: '🚌 Buýt', truck: '🚛 Tải' };
        overlay.innerHTML = Array.from({ length: 5 }, (_, i) => {
            const t = types[i % types.length];
            const top = 20 + Math.random() * 50;
            const left = 10 + Math.random() * 70;
            const w = 80 + Math.random() * 50;
            const h = 50 + Math.random() * 30;
            return `<div class="detection-box ${t}" style="top:${top}%;left:${left}%;width:${w}px;height:${h}px;">${labels[t]}</div>`;
        }).join('');
    }
}

setInterval(updateRealtimeOverlay, 3500);

function renderVehicleCounts() {
    const grid = document.getElementById('vehicleCountGrid');
    if (!grid) return;
    const top4 = (DATA.vehicle_types_17 || []).slice(0, 4);
    const total = top4.reduce((s, v) => s + v.count, 0) || 1;
    grid.innerHTML = top4.map(v => `
        <div class="vc-item">
            <div class="vc-icon">${v.icon}</div>
            <div class="vc-info">
                <div class="vc-label">${v.name}</div>
                <div class="vc-value">${(v.count / 1000).toFixed(0)}K</div>
            </div>
        </div>
    `).join('');
}

function renderVehicleClasses() {
    const grid = document.getElementById('vehicleClassGrid');
    if (!grid || !DATA.vehicle_types_17) return;
    grid.innerHTML = DATA.vehicle_types_17.map(v => `
        <div class="vclass-card">
            <div class="vclass-icon">${v.icon}</div>
            <div class="vclass-info">
                <div class="vclass-name">${v.name}</div>
                <div class="vclass-count">${v.count >= 1000 ? (v.count / 1000).toFixed(0) + 'K' : v.count}</div>
                <div class="vclass-percent">${v.pct}% • PCU=${v.pcu}</div>
            </div>
        </div>
    `).join('');
}

// ================== O-D SANKEY ==================
function renderODSankey() {
    const sankeyEl = document.getElementById('odSankey');
    const ratioEl = document.getElementById('odRatioList');
    if (!sankeyEl || !DATA.od_matrix) return;
    const od = DATA.od_matrix;
    const dirs = od.directions;
    const dirIcons = { 'Bắc': '⬆', 'Nam': '⬇', 'Đông': '➡', 'Tây': '⬅' };
    const totalVol = od.flows.reduce((s, f) => s + f.volume, 0);

    // Build sankey nodes
    const fromCol = dirs.map(d => {
        const out = od.flows.filter(f => f.from === d).reduce((s, f) => s + f.volume, 0);
        return `<div class="sankey-node from"><span>${dirIcons[d]} Vào ${d}</span><strong>${out}</strong></div>`;
    }).join('');
    const toCol = dirs.map(d => {
        const inn = od.flows.filter(f => f.to === d).reduce((s, f) => s + f.volume, 0);
        return `<div class="sankey-node to"><span>Ra ${d} ${dirIcons[d]}</span><strong>${inn}</strong></div>`;
    }).join('');

    // Build flow bars
    const flowBars = od.flows
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8)
        .map(f => {
            const w = (f.volume / totalVol * 100) * 6;
            return `
                <div class="sankey-flow">
                    <span class="sf-from">${dirIcons[f.from]} ${f.from}</span>
                    <div class="sf-bar"><div class="sf-fill" style="width:${Math.min(100, w)}%"></div></div>
                    <span class="sf-to">${f.to} ${dirIcons[f.to]}</span>
                    <span class="sf-vol">${f.volume}</span>
                </div>
            `;
        }).join('');

    sankeyEl.innerHTML = `
        <div class="sankey-cols">
            <div class="sankey-col">${fromCol}</div>
            <div class="sankey-flows">${flowBars}</div>
            <div class="sankey-col">${toCol}</div>
        </div>
    `;

    if (ratioEl) {
        const tr = od.turn_ratios;
        ratioEl.innerHTML = `
            <div class="ratio-item"><span>↑ Đi thẳng</span><strong>${tr.straight}%</strong></div>
            <div class="ratio-item"><span>↰ Rẽ trái</span><strong>${tr.left}%</strong></div>
            <div class="ratio-item"><span>↱ Rẽ phải</span><strong>${tr.right}%</strong></div>
            <div class="ratio-item"><span>↩ Quay đầu</span><strong>${tr.uturn}%</strong></div>
            <div class="ratio-foot">Nguồn: Camera 04 (Toàn cảnh) • cập nhật mỗi chu kỳ đèn</div>
        `;
    }
}

// ================== TRAJECTORIES ==================
function renderTrajectories() {
    const list = document.getElementById('trajectoryList');
    if (!list || !DATA.trajectories) return;
    list.innerHTML = DATA.trajectories.map(t => {
        const cls = t.type === 'normal' ? 'normal'
            : t.type === 'anomaly_stop' ? 'warn'
                : 'danger';
        const ico = t.type === 'normal' ? '🟢'
            : t.type === 'anomaly_stop' ? '⚠️'
                : '🚨';
        return `
            <div class="traj-card ${cls}">
                <div class="traj-icon">${ico}</div>
                <div class="traj-body">
                    <div class="traj-head">
                        <strong>${t.id}</strong> • ${t.vehicle}
                        ${t.alert ? `<span class="traj-alert">${t.alert}</span>` : ''}
                    </div>
                    <div class="traj-meta">
                        <span>📍 ${t.from} → ${t.to}</span>
                        <span>⚡ ${t.speed} km/h</span>
                        <span>⏱ ${t.duration}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ================== SIGNAL CONTROL ==================
function renderSignalPlans() {
    const grid = document.getElementById('signalPlansGrid');
    if (!grid || !DATA.signal_plans) return;
    grid.innerHTML = DATA.signal_plans.map(p => {
        const isActive = p.id === currentPlanId;
        return `
            <div class="plan-card ${isActive ? 'active' : ''}" onclick="selectPlan('${p.id}')">
                <div class="plan-header">
                    <div class="plan-name">${p.name}</div>
                    <div class="plan-time">${p.time_range}</div>
                </div>
                <div class="plan-cycle">Chu kỳ: <strong>${p.cycle_time}s</strong> • Ưu tiên: ${p.priority}</div>
                <div class="plan-meta">
                    <span>${p.phases.length} pha</span>
                    <span>${p.algorithm || 'Webster'}</span>
                    ${isActive ? '<span class="active-tag">● ĐANG HOẠT ĐỘNG</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
    renderPhaseDisplay();
}

window.selectPlan = function (id) {
    currentPlanId = id;
    currentPhaseIdx = 0;
    phaseElapsed = 0;
    const p = DATA.signal_plans.find(x => x.id === id);
    if (p) {
        document.getElementById('currentPlanName').textContent = p.name;
        document.getElementById('cycleTime').textContent = `${p.cycle_time}s`;
    }
    renderSignalPlans();
};

function renderPhaseDisplay() {
    const el = document.getElementById('phaseDisplay');
    if (!el) return;
    const plan = DATA.signal_plans.find(p => p.id === currentPlanId);
    if (!plan) return;
    el.innerHTML = plan.phases.map((ph, i) => {
        const isActive = i === currentPhaseIdx;
        const isNext = i === (currentPhaseIdx + 1) % plan.phases.length;
        const cls = isActive ? 'active' : isNext ? 'next' : '';
        // Determine which light is on
        const phaseGreen = isActive;
        const phaseYellow = false; // simplified
        const phaseRed = !isActive;
        return `
            <div class="phase-card ${cls}">
                <div class="phase-num">PHA ${i + 1}</div>
                <div class="phase-direction">${ph.name.replace(/^Pha \d+ - /, '')}</div>
                <div class="phase-light">
                    <span class="signal-light red ${phaseRed ? 'on' : ''}"></span>
                    <span class="signal-light yellow ${phaseYellow ? 'on' : ''}"></span>
                    <span class="signal-light green ${phaseGreen ? 'on' : ''}"></span>
                </div>
                <div class="phase-time">${ph.green}s</div>
                <div class="phase-time-label">Thời gian xanh</div>
            </div>
        `;
    }).join('');

    document.getElementById('currentPhase').textContent = `Pha ${currentPhaseIdx + 1} - ${plan.phases[currentPhaseIdx].name.replace(/^Pha \d+ - /, '')}`;
}

function startPhaseTimer() {
    if (phaseInterval) clearInterval(phaseInterval);
    phaseInterval = setInterval(() => {
        const plan = DATA.signal_plans?.find(p => p.id === currentPlanId);
        if (!plan || !plan.phases.length || plan.cycle_time === 0) return;
        const ph = plan.phases[currentPhaseIdx];
        const dur = ph.green + ph.yellow;
        phaseElapsed++;
        const remaining = Math.max(0, dur - phaseElapsed);
        const remEl = document.getElementById('phaseRemaining');
        if (remEl) remEl.textContent = `${remaining}s`;
        const cycleEl = document.getElementById('cycleProgress');
        if (cycleEl) {
            // total elapsed in cycle
            let elapsedInCycle = phaseElapsed;
            for (let i = 0; i < currentPhaseIdx; i++) {
                elapsedInCycle += plan.phases[i].green + plan.phases[i].yellow;
            }
            cycleEl.style.width = `${Math.min(100, (elapsedInCycle / plan.cycle_time) * 100)}%`;
        }
        if (phaseElapsed >= dur) {
            currentPhaseIdx = (currentPhaseIdx + 1) % plan.phases.length;
            phaseElapsed = 0;
            renderPhaseDisplay();
        }
    }, 1000);
}

// ================== SIGNAL STATUS GRID ==================
function renderSignalStatus() {
    const grid = document.getElementById('signalStatusGrid');
    if (!grid || !DATA.intersection_groups) return;
    grid.innerHTML = DATA.intersection_groups.map(g => {
        const status = g.online === g.total_cameras ? 'online' : g.online >= g.total_cameras - 1 ? 'warn' : 'offline';
        const statusLabel = { online: '✓ Online', warn: '⚠ Cảnh báo', offline: '✕ Mất KN' }[status];
        const phaseIdx = g.current_phase || 1;
        const lights = ['red', 'green', 'red', 'red'].map((c, i) => {
            const on = (i + 1) === phaseIdx ? 'on' : '';
            return `<span class="signal-light ${c} ${on}"></span>`;
        }).join('');
        return `
            <div class="signal-status-card">
                <div class="ssc-header">
                    <span class="ssc-name">${g.icon} ${g.name}</span>
                    <span class="ssc-status ${status}">${statusLabel}</span>
                </div>
                <div class="ssc-lights">
                    <span style="font-size:10px;color:var(--txt2);">Pha ${phaseIdx}</span>
                    ${lights}
                </div>
                <div class="ssc-info">
                    <span>Chu kỳ: <strong>${g.avg_cycle_time}s</strong></span>
                    <span>${g.signal_phases} pha</span>
                    <span>${g.zone}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ================== PRIORITY MODES ==================
function renderPriorityModes() {
    const grid = document.getElementById('priorityModesGrid');
    if (!grid || !DATA.priority_modes) return;
    grid.innerHTML = DATA.priority_modes.map(m => `
        <div class="priority-card" style="border-left-color:${m.color}">
            <div class="priority-icon" style="background:${m.color}22;color:${m.color}">${m.icon}</div>
            <div class="priority-body">
                <div class="priority-title">${m.type} - ${m.name}</div>
                <div class="priority-desc">${m.desc}</div>
                <div class="priority-meta">
                    <span>Hôm nay: <strong>${m.active_today.toLocaleString()}</strong></span>
                    ${m.saved_seconds_avg > 0 ? `<span>Tiết kiệm TB: <strong>${m.saved_seconds_avg}s/sự kiện</strong></span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// ================== GREEN WAVE ==================
function renderCorridors() {
    const list = document.getElementById('corridorList');
    if (!list || !DATA.green_wave_corridors) return;
    list.innerHTML = DATA.green_wave_corridors.map(c => {
        const opt = c.status === 'optimizing' ? 'optimizing' : '';
        const statusLabel = c.status === 'active' ? '● HOẠT ĐỘNG' : '⟳ ĐANG TỐI ƯU';
        const nodes = (c.node_names || []).slice(0, 8).map((n, i) => {
            const ar = i < (c.node_names.length - 1) ? '<span class="arrow">→</span>' : '';
            return `<span class="node">${i + 1}. ${n}</span>${ar}`;
        }).join('');
        return `
            <div class="corridor-card ${opt}">
                <div class="corridor-header">
                    <div class="corridor-name">
                        ${c.name}
                        <span>${c.direction} • Thuật toán: ${c.algorithm}</span>
                    </div>
                    <div class="corridor-status ${c.status}">${statusLabel}</div>
                </div>
                <div class="corridor-stats">
                    <div class="cs-item"><div class="cs-label">Chiều dài</div><div class="cs-value">${c.length_km} km</div></div>
                    <div class="cs-item"><div class="cs-label">Số nút</div><div class="cs-value">${c.intersections}</div></div>
                    <div class="cs-item"><div class="cs-label">Tốc độ KN</div><div class="cs-value">${c.speed_kph} km/h</div></div>
                    <div class="cs-item"><div class="cs-label">Hiệu suất</div><div class="cs-value green">${c.efficiency}%</div></div>
                    <div class="cs-item"><div class="cs-label">Giảm dừng</div><div class="cs-value green">-${c.stops_reduced}%</div></div>
                </div>
                <div class="corridor-nodes">${nodes}</div>
            </div>
        `;
    }).join('');
}

function renderTimeSpaceDiagram() {
    const el = document.getElementById('timeSpaceDiagram');
    if (!el || !DATA.green_wave_corridors) return;
    const c = DATA.green_wave_corridors[0]; // Kim Mã as default
    const totalCycle = 165;
    const rows = (c.node_names || []).slice(0, 8).map((name, i) => {
        const offset = c.offset_pattern[i] || 0;
        const greenStart = (offset / totalCycle) * 100;
        const greenW = (40 / totalCycle) * 100;
        return `
            <div class="tsd-row">
                <div class="tsd-node-label">${i + 1}. ${name}</div>
                <div class="tsd-track">
                    <div class="tsd-segment red" style="left:0;width:100%;"></div>
                    <div class="tsd-segment green" style="left:${greenStart}%;width:${greenW}%;"></div>
                    <div class="tsd-segment yellow" style="left:${greenStart + greenW}%;width:2%;"></div>
                </div>
            </div>
        `;
    }).join('');
    el.innerHTML = `
        <div style="margin-bottom:10px;font-size:11px;color:var(--txt2);">
            Hành lang ${c.name} • Tốc độ KN ${c.speed_kph} km/h • Offset: ${c.offset_pattern.slice(0, 8).join(', ')}s
        </div>
        <div class="tsd-axis">${rows}</div>
        <div class="tsd-wave"></div>
        <div class="tsd-time-axis">
            <span>0s</span><span>30s</span><span>60s</span><span>90s</span><span>120s</span><span>150s</span>
        </div>
    `;
}

// ================== FORECAST ==================
function renderForecastChart() {
    const el = document.getElementById('forecastChart');
    if (!el || !DATA.forecast_24h) return;
    const max = Math.max(...DATA.forecast_24h);
    const now = new Date().getHours();
    el.innerHTML = DATA.forecast_24h.map((v, i) => {
        const h = (v / max) * 100;
        const isPredicted = i > now;
        const cls = isPredicted ? 'predicted' : '';
        return `
            <div class="fc-bar ${cls}" style="height:${h}%" title="${i}:00 - ${(v / 1000).toFixed(0)}K xe">
                ${i % 4 === 0 ? `<div class="fc-time">${String(i).padStart(2, '0')}h</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderPredictions() {
    const el = document.getElementById('predictionCards');
    if (!el || !DATA.incident_predictions) return;
    el.innerHTML = DATA.incident_predictions.map(p => {
        const lvlLbl = { high: 'CAO', med: 'TRUNG BÌNH', low: 'THẤP' }[p.level];
        return `
            <div class="pred-card ${p.level}">
                <div class="pred-header">
                    <div class="pred-name">${p.name}</div>
                    <span class="pred-level ${p.level}">${lvlLbl}</span>
                </div>
                <div class="pred-time">⏰ ${p.time}</div>
                <div style="font-size:10px;color:var(--txt2);margin-bottom:6px;">${p.reason}</div>
                <div class="pred-meta">
                    <span>Lưu lượng: <strong style="color:var(--warn)">${p.expected_volume}</strong></span>
                    <span>Confidence: <strong>${p.confidence}%</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

function renderSuggestions() {
    const el = document.getElementById('suggestionList');
    if (!el || !DATA.ai_suggestions) return;
    el.innerHTML = DATA.ai_suggestions.map(s => `
        <div class="suggest-card">
            <div class="suggest-icon">${s.icon}</div>
            <div class="suggest-body">
                <div class="suggest-title">${s.title}</div>
                <div class="suggest-desc">${s.desc}</div>
                <div class="suggest-meta">
                    <span class="impact">Tác động: ${s.impact}</span>
                    <span class="conf">Tin cậy: ${s.confidence}%</span>
                    <span style="color:var(--txt2);">Module: ${s.module}</span>
                </div>
            </div>
            <button class="suggest-action">✓ Áp dụng</button>
        </div>
    `).join('');
}

// ================== VISUALIZATION ==================
function renderHourlyChart() {
    const el = document.getElementById('hourlyChart');
    if (!el || !DATA.hourly_traffic) return;
    const max = Math.max(...DATA.hourly_traffic.map(h => h.volume));
    el.innerHTML = DATA.hourly_traffic.map(h => {
        const height = (h.volume / max) * 100;
        return `
            <div class="hc-bar ${h.is_peak ? 'peak' : ''}" style="height:${height}%" title="${h.hour} - ${(h.volume / 1000).toFixed(0)}K">
                ${parseInt(h.hour) % 3 === 0 ? `<div class="hc-label">${h.hour}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderTopIntersections() {
    const el = document.getElementById('topIntersections');
    if (!el || !DATA.top_intersections) return;
    el.innerHTML = DATA.top_intersections.map((i, idx) => `
        <div class="rank-item">
            <div class="rank-num">${idx + 1}</div>
            <div class="rank-name">${i.name}</div>
            <div class="rank-val">${(i.volume / 1000).toFixed(1)}K xe</div>
        </div>
    `).join('');
}

function renderVehicleDist() {
    const el = document.getElementById('vehicleDistribution');
    if (!el || !DATA.vehicle_types_17) return;
    const top8 = DATA.vehicle_types_17.slice(0, 8);
    const max = Math.max(...top8.map(v => v.pct));
    el.innerHTML = top8.map(v => `
        <div class="vd-item">
            <div class="vd-icon">${v.icon}</div>
            <div class="vd-name">${v.name}</div>
            <div class="vd-bar"><div class="vd-fill" style="width:${(v.pct / max) * 100}%"></div></div>
            <div class="vd-pct">${v.pct}%</div>
        </div>
    `).join('');
}

// ================== DRAG-DROP COUNTING TOOL ==================
const DD = {
    activeTool: 'rectangle',
    drawing: false,
    startPct: null,
    currentEl: null,
    shapeCount: 0
};

const DD_HINTS = {
    rectangle: '💡 <strong>Vùng đếm:</strong> bấm & kéo để vẽ vùng hình chữ nhật, hệ thống tự đếm xe trong vùng. Double-click để xoá.',
    line: '💡 <strong>Đường đếm:</strong> bấm & kéo ngang để tạo counting line. Mỗi xe cắt qua line được đếm 1 lần.',
    arrow: '💡 <strong>Hướng phân tích:</strong> bấm tại điểm đầu, kéo đến điểm cuối để định nghĩa hướng di chuyển.',
    zone: '💡 <strong>Zone OD:</strong> vùng cho phân tích ma trận Origin-Destination, tổng hợp tỷ lệ rẽ trái/phải/thẳng.'
};

function initDragDrop() {
    const stage = document.getElementById('ddDrawLayer');
    if (!stage) return;
    const tools = document.querySelectorAll('.dd-tool');
    const resetBtn = document.getElementById('ddReset');

    tools.forEach(t => {
        if (t.classList.contains('reset')) return;
        t.addEventListener('click', () => {
            tools.forEach(x => { if (!x.classList.contains('reset')) x.classList.remove('active'); });
            t.classList.add('active');
            DD.activeTool = t.dataset.tool;
            const hint = document.getElementById('ddHint');
            if (hint) hint.innerHTML = DD_HINTS[DD.activeTool] || '';
            stage.dataset.tool = DD.activeTool;
        });
    });

    if (resetBtn) resetBtn.addEventListener('click', resetDDCanvas);

    stage.dataset.tool = DD.activeTool;
    stage.addEventListener('mousedown', startDDDraw);
    stage.addEventListener('mousemove', updateDDDraw);
    document.addEventListener('mouseup', endDDDraw);
}

function getPctCoords(stage, clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
}

function startDDDraw(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.dd-shape')) return;
    const stage = e.currentTarget;
    DD.drawing = true;
    DD.startPct = getPctCoords(stage, e.clientX, e.clientY);

    const tool = DD.activeTool;
    const el = document.createElement('div');
    el.className = `dd-shape dd-temp dd-${tool}`;
    if (tool === 'zone') el.classList.add('zone-od');
    el.style.left = DD.startPct.x + '%';
    el.style.top = DD.startPct.y + '%';
    el.style.width = '0%';
    el.style.height = (tool === 'line') ? '0px' : '0%';

    el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        el.remove();
        DD.shapeCount = Math.max(0, DD.shapeCount - 1);
        updateDDCounter();
    });

    stage.appendChild(el);
    DD.currentEl = el;

    const hint = document.getElementById('ddEmptyHint');
    if (hint) hint.style.display = 'none';
    e.preventDefault();
}

function updateDDDraw(e) {
    if (!DD.drawing || !DD.currentEl) return;
    const stage = e.currentTarget;
    const pct = getPctCoords(stage, e.clientX, e.clientY);
    const tool = DD.activeTool;
    const sx = DD.startPct.x;
    const sy = DD.startPct.y;
    const dx = pct.x - sx;
    const dy = pct.y - sy;
    const el = DD.currentEl;

    if (tool === 'rectangle' || tool === 'zone') {
        el.style.left = Math.min(sx, pct.x) + '%';
        el.style.top = Math.min(sy, pct.y) + '%';
        el.style.width = Math.abs(dx) + '%';
        el.style.height = Math.abs(dy) + '%';
    } else if (tool === 'line') {
        el.style.left = Math.min(sx, pct.x) + '%';
        el.style.top = sy + '%';
        el.style.width = Math.abs(dx) + '%';
    } else if (tool === 'arrow') {
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        el.style.width = length + '%';
        el.style.transform = `rotate(${angle}deg)`;
        el.style.transformOrigin = '0 50%';
    }
}

function endDDDraw() {
    if (!DD.drawing || !DD.currentEl) return;
    DD.drawing = false;
    const tool = DD.activeTool;
    const el = DD.currentEl;
    el.classList.remove('dd-temp');

    const w = parseFloat(el.style.width) || 0;
    const h = parseFloat(el.style.height) || 0;

    let valid = false;
    if (tool === 'rectangle' || tool === 'zone') valid = w >= 4 && h >= 4;
    else if (tool === 'line' || tool === 'arrow') valid = w >= 4;

    if (!valid) {
        el.remove();
        DD.currentEl = null;
        const hint = document.getElementById('ddEmptyHint');
        if (hint && DD.shapeCount === 0) hint.style.display = '';
        return;
    }

    DD.shapeCount++;
    const idx = DD.shapeCount;

    if (tool === 'rectangle') {
        const vehicles = Math.floor(Math.random() * 700) + 120;
        const speed = Math.floor(Math.random() * 25) + 22;
        el.innerHTML = `
            <div class="dd-zone-label">Vùng đếm ${idx}</div>
            <div class="dd-zone-data">${vehicles} xe • ${speed} km/h</div>
        `;
    } else if (tool === 'zone') {
        const turns = `↑${Math.floor(Math.random() * 30) + 50}% ↰${Math.floor(Math.random() * 20) + 10}% ↱${Math.floor(Math.random() * 20) + 15}%`;
        el.innerHTML = `
            <div class="dd-zone-label">Zone OD ${idx}</div>
            <div class="dd-zone-data">${turns}</div>
        `;
    } else if (tool === 'line') {
        const flow = Math.floor(Math.random() * 1500) + 400;
        el.innerHTML = `
            <span class="dd-line-dot start"></span>
            <span class="dd-line-dot end"></span>
            <span class="dd-line-mark">Line ${idx} • ${flow} xe/giờ</span>
        `;
    } else if (tool === 'arrow') {
        const flow = Math.floor(Math.random() * 800) + 200;
        el.innerHTML = `
            <span class="dd-arrow-mark">Hướng ${idx} • ${flow} xe/h</span>
            <span class="dd-arrow-head"></span>
        `;
    }

    DD.currentEl = null;
    updateDDCounter();
}

function resetDDCanvas() {
    const stage = document.getElementById('ddDrawLayer');
    if (!stage) return;
    stage.querySelectorAll('.dd-shape').forEach(el => el.remove());
    DD.shapeCount = 0;
    updateDDCounter();
    const hint = document.getElementById('ddEmptyHint');
    if (hint) hint.style.display = '';
}

function updateDDCounter() {
    const el = document.getElementById('ddCounter');
    if (el) el.textContent = `${DD.shapeCount} đối tượng`;
    const hint = document.getElementById('ddEmptyHint');
    if (hint) hint.style.display = DD.shapeCount === 0 ? '' : 'none';
}

// ================== HEATMAP ==================
function renderHeatmap() {
    const el = document.getElementById('heatmapGrid');
    if (!el || !DATA.heatmap_data) return;
    el.innerHTML = DATA.heatmap_data.map(z => `
        <div class="hm-cell ${z.level}" title="${z.zone}: ${z.intensity}% • ${z.avg_speed} km/h">
            <div class="hm-zone">${z.zone.replace('Quận ', '')}</div>
            <div class="hm-intensity">${z.intensity}%</div>
            <div class="hm-meta">${z.intersections} nút • ${z.avg_speed} km/h</div>
        </div>
    `).join('');
}
