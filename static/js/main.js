// ===== МАТРИЦА =====
function startMatrix(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789⚡THUNDERTRACE';
    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array(cols).fill(1);
    return setInterval(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillStyle = Math.random() > 0.9 ? '#ffffff' : '#00b4ff88';
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }, 35);
}

// ===== ПЕРЕВОДЫ =====
const i18n = {
    en: {
        search_title: '⚡ USERNAME SEARCH', enter_username: 'Enter username...',
        variations: 'Search variations', similar: 'Similar nicknames',
        filter_by: 'Filter:', search_btn: 'SEARCH', found: 'Found',
        not_found: 'Not Found', time: 'Time', total: 'Total',
        results: '⚡ RESULTS', history: '🕐 HISTORY', custom_sites: '➕ CUSTOM SITES'
    },
    uk: {
        search_title: '⚡ ПОШУК НІКНЕЙМУ', enter_username: 'Введіть нікнейм...',
        variations: 'Шукати варіації', similar: 'Схожі нікнейми',
        filter_by: 'Фільтр:', search_btn: 'ПОШУК', found: 'Знайдено',
        not_found: 'Не знайдено', time: 'Час', total: 'Всього',
        results: '⚡ РЕЗУЛЬТАТИ', history: '🕐 ІСТОРІЯ', custom_sites: '➕ СВОЇ САЙТИ'
    },
    ru: {
        search_title: '⚡ ПОИСК НИКНЕЙМА', enter_username: 'Введите никнейм...',
        variations: 'Искать вариации', similar: 'Похожие ники',
        filter_by: 'Фильтр:', search_btn: 'ПОИСК', found: 'Найдено',
        not_found: 'Не найдено', time: 'Время', total: 'Всего',
        results: '⚡ РЕЗУЛЬТАТЫ', history: '🕐 ИСТОРИЯ', custom_sites: '➕ СВОИ САЙТЫ'
    }
};

let currentLang = 'en';
let currentResults = {};
let usernames = [];
let searchMatrix = null;
let timerInterval = null;
let map = null;

// ===== ЯЗЫК =====
function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.textContent = i18n[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[lang][key]) el.placeholder = i18n[lang][key];
    });
    setTimeout(makeBlueLightning, 100);
}

// ===== ТЕМА =====
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const btn = document.querySelector('.theme-btn');
    btn.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
}

// ===== WELCOME =====
document.getElementById('begin-btn').addEventListener('click', () => {
    const welcome = document.getElementById('welcome-screen');
    welcome.style.opacity = '0';
    welcome.style.transition = 'opacity 0.8s';
    setTimeout(() => {
        welcome.style.display = 'none';
        document.getElementById('main-app').classList.remove('hidden');
        loadHistory();
    }, 800);
});

// ===== НИКНЕЙМЫ =====
function addRow() {
    const container = document.getElementById('usernames-container');
    const row = document.createElement('div');
    row.className = 'username-row';
    row.innerHTML = `
        <input type="text" class="search-input username-field" placeholder="Enter username...">
        <button class="remove-row-btn" onclick="removeRow(this)">−</button>
    `;
    container.appendChild(row);
    row.querySelector('input').focus();
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.username-row');
    if (rows.length > 1) {
        btn.parentElement.remove();
    }
}

function getSearchUsernames() {
    return Array.from(document.querySelectorAll('.username-field'))
        .map(i => i.value.trim())
        .filter(v => v.length > 0);
}

// ===== ПОИСК =====
async function startSearch() {
    let simInterval = null;
    usernames = getSearchUsernames();
    if (usernames.length === 0) { 
        alert('Please enter at least one username!'); 
        return; 
    }

    document.getElementById('progress-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('stats-section').classList.add('hidden');
    document.getElementById('export-section').classList.add('hidden');
    document.getElementById('map-section').classList.add('hidden');
    document.getElementById('results-grid').innerHTML = '';

        if (searchMatrix) clearInterval(searchMatrix);
    searchMatrix = startMatrix('search-matrix');

    // Сброс прогресса
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Searching... 0%';

    let seconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        document.getElementById('progress-timer').textContent = `${m}:${s}`;
    }, 1000);

    // Плавная симуляция прогресса
    let simProgress = 0;
    simInterval = setInterval(() => {
        if (simProgress < 90) {
            simProgress += Math.random() * 2;
            const bar = document.getElementById('progress-bar');
            const current = parseFloat(bar.style.width) || 0;
            if (simProgress > current) {
                bar.style.width = Math.min(simProgress, 90) + '%';
                document.getElementById('progress-text').textContent = 
                    `Searching... ${Math.floor(Math.min(simProgress, 90))}%`;
            }
        }
    }, 400);

    document.getElementById('search-btn').disabled = true;
    document.getElementById('search-btn').textContent = '⚡ SEARCHING... ⚡';

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usernames: usernames,
                variations: document.getElementById('variations-check').checked,
                similar: document.getElementById('similar-check').checked
            })
        });
        currentResults = await response.json();
        displayResults(currentResults);
    } catch (e) {
        console.error(e);
        alert('Search error. Make sure the server is running.');
    }

    clearInterval(timerInterval);
    clearInterval(simInterval);
    clearInterval(searchMatrix);
    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('progress-text').textContent = 'Searching... 100%';
    await new Promise(r => setTimeout(r, 500));
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('search-btn').disabled = false;
    document.getElementById('search-btn').innerHTML = '<i class="fas fa-bolt btn-bolt"></i> SEARCH <i class="fas fa-bolt btn-bolt"></i>';

    if (Notification.permission === 'granted') {
        new Notification('ThunderTrace ⚡', { body: 'Search completed!' });
    }
}

// ===== SOCKET.IO =====
const socket = io();

socket.on('progress', data => {
    document.getElementById('progress-bar').style.width = data.percent + '%';
    document.getElementById('progress-text').textContent = `Searching... ${data.percent}%`;
});

socket.on('result', data => {
    // Карточки добавляем только в displayResults
});

socket.on('done', data => {
    document.getElementById('stat-found').textContent = data.found;
    document.getElementById('stat-time').textContent = data.time + 's';
    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-notfound').textContent = data.total - data.found;
});

// ===== РЕЗУЛЬТАТЫ =====
function displayResults(results) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '';
    const seen = new Set();
    let totalFound = 0, totalAll = 0;

    for (const [username, sites] of Object.entries(results)) {
        sites.forEach(site => {
            totalAll++;
            if (site.found) {
                const key = `${username}-${site.name}-${site.url}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    totalFound++;
                    addResultCard(site, username);
                }
            }
        });
    }

    document.getElementById('stat-found').textContent = totalFound;
    document.getElementById('stat-notfound').textContent = totalAll - totalFound;
    document.getElementById('stat-total').textContent = totalAll;
    document.getElementById('stats-section').classList.remove('hidden');
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('export-section').classList.remove('hidden');

    initMap(results);
    if (Notification.permission !== 'granted') Notification.requestPermission();
    
    // Обновляем историю после поиска
    setTimeout(loadHistory, 1000);
}

function addResultCard(site, username) {
    const grid = document.getElementById('results-grid');
    const card = document.createElement('div');
    card.className = `result-card ${site.found ? 'found' : 'notfound'}`;
    card.setAttribute('data-cat', site.category || 'other');
    const iconUrl = `https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64`;
    card.innerHTML = `
        <img class="site-icon" src="${iconUrl}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${site.name}">
        <div class="site-icon-fallback" style="display:none">🌐</div>
        <div class="result-info">
            <div class="result-name">${site.country || '🌍'} ${site.name}</div>
            <a href="${site.url}" target="_blank" class="result-url">${site.url}</a>
            <div class="result-meta">
                <span class="tag">${site.category || 'other'}</span>
                <span class="tag confidence-${site.confidence}">${site.confidence}</span>
                ${site.location ? `<span class="tag">📍 ${site.location}</span>` : ''}
            </div>
        </div>
        <div class="result-status">${site.found ? '✅' : '❌'}</div>
    `;
    grid.appendChild(card);
}

// ===== ФИЛЬТРЫ =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');
        document.querySelectorAll('.result-card').forEach(card => {
            card.style.display = (cat === 'all' || card.getAttribute('data-cat') === cat) ? 'flex' : 'none';
        });
    });
});

// ===== КАРТА =====
async function initMap(results) {
    const mapSection = document.getElementById('map-section');
    mapSection.classList.remove('hidden');

    await new Promise(r => setTimeout(r, 300));

    if (!map) {
        map = L.map('world-map').setView([20, 10], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CartoDB'
        }).addTo(map);
    } else {
        map.eachLayer(l => {
            if (l instanceof L.Marker || l instanceof L.CircleMarker) map.removeLayer(l);
        });
    }

    setTimeout(() => map.invalidateSize(), 400);

    // Координаты стран платформ
    const countryCoords = {
        '🌍': [37, -97], '🇺🇦': [49, 32],  '🇷🇺': [55, 37],
        '🇺🇸': [38, -97], '🇩🇪': [51, 10], '🇬🇧': [55, -3],
        '🇫🇷': [46, 2],   '🇯🇵': [36, 138],'🇰🇿': [48, 68],
        '🇧🇾': [53, 28],  '🇦🇿': [40, 47], '🇵🇱': [52, 20],
        '🇨🇳': [35, 105], '🇸🇪': [59, 18], '🇳🇱': [52, 5]
    };

    let hasMarkers = false;

    for (const [username, sites] of Object.entries(results)) {
        for (const site of sites.filter(s => s.found)) {

            // Если есть реальная локация из профиля
            if (site.location && site.location.length > 1) {
                try {
                    const geo = await fetch('/api/geocode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ location: site.location })
                    });
                    const coords = await geo.json();
                    if (coords.lat && coords.lon) {
                        L.circleMarker([coords.lat, coords.lon], {
                            radius: 14, fillColor: '#00ff41',
                            color: '#00b4ff', weight: 3,
                            opacity: 1, fillOpacity: 0.9
                        }).bindPopup(`
                            <b>⚡ ${site.name}</b><br>
                            👤 ${username}<br>
                            📍 ${site.location}<br>
                            <a href="${site.url}" target="_blank">Open profile</a>
                        `).addTo(map);
                        hasMarkers = true;
                        continue;
                    }
                } catch (e) {}
            }

            // Фолбек — показываем по стране платформы
            const coords = countryCoords[site.country] || countryCoords['🌍'];
            const jitter = [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8];
            L.circleMarker([coords[0] + jitter[0], coords[1] + jitter[1]], {
                radius: 8, fillColor: '#a855f7',
                color: '#3b82f6', weight: 2,
                opacity: 0.8, fillOpacity: 0.6
            }).bindPopup(`
                <b>${site.name}</b><br>
                👤 ${username}<br>
                <a href="${site.url}" target="_blank">Open profile</a>
            `).addTo(map);
            hasMarkers = true;
        }
    }

    if (hasMarkers) {
        setTimeout(() => map.invalidateSize(), 500);
    }
}

// ===== ЭКСПОРТ =====
async function exportResults(type) {
    if (type === 'html') { exportHTML(); return; }
    if (type === 'pdf') { exportHTML(true); return; }
    const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentResults)
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thundertrace_${Date.now()}.${type}`;
    a.click();
}

function exportHTML(forPrint = false) {
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>ThunderTrace Report</title>
    <style>
        body{font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:30px}
        h1{color:#a855f7;font-size:2rem;margin-bottom:20px}
        .card{background:#141414;border:1px solid #333;border-left:3px solid #00ff41;
              border-radius:8px;padding:12px;margin-bottom:10px}
        a{color:#a855f7} .meta{color:#888;font-size:0.8rem}
    </style></head><body>
    <h1>⚡ ThunderTrace Report</h1>
    <p style="color:#888">Generated: ${new Date().toLocaleString()}</p><br>`;

    for (const [username, sites] of Object.entries(currentResults)) {
        const found = sites.filter(s => s.found);
        html += `<h2 style="color:#a855f7">@${username} — ${found.length} found</h2>`;
        found.forEach(s => {
            html += `<div class="card">
                <b>${s.country} ${s.name}</b>
                <br><a href="${s.url}">${s.url}</a>
                <br><span class="meta">${s.category} | confidence: ${s.confidence}${s.location ? ' | 📍 ' + s.location : ''}</span>
            </div>`;
        });
    }
    html += '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (forPrint) {
        const win = window.open(url);
        win.onload = () => win.print();
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `thundertrace_${Date.now()}.html`;
        a.click();
    }
}

// ===== ИСТОРИЯ =====
async function loadHistory() {
    const res = await fetch('/api/history');
    const history = await res.json();
    const list = document.getElementById('history-list');

    if (history.length === 0) {
        list.innerHTML = '<p style="color:#555;padding:15px">No search history yet.</p>';
        return;
    }

    list.innerHTML = history.reverse().map(h => `
        <div class="history-item" style="display:block;padding:0;cursor:default">
            <div class="history-item-header" onclick="toggleHistory(${h.id}, this)">
                <span class="history-nick">⚡ ${h.username}</span>
                <span class="history-found">✅ ${h.found} found</span>
                <span class="history-date">${h.date}</span>
                <span class="history-arrow">▼</span>
                <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistory(${h.id})" title="Delete">🗑️</button>
            </div>
            <div class="history-results" id="hist-${h.id}">
                ${h.results && h.results.length > 0
                    ? h.results.map(r => `
                        <div class="history-result-item">
                            ${r.country || '🌍'} <b>${r.name}</b>
                            — <a href="${r.url}" target="_blank">${r.url}</a>
                            <span style="color:var(--text2);font-size:0.75rem"> [${r.confidence}]</span>
                        </div>
                    `).join('')
                    : '<p style="color:#555;padding:8px">No results saved</p>'
                }
                <button class="export-btn" style="margin-top:10px" 
                    onclick="searchFromHistory('${h.username}')">
                    🔍 Search again
                </button>
            </div>
        </div>
    `).join('');
}

function toggleHistory(id, headerEl) {
    const results = document.getElementById(`hist-${id}`);
    const arrow = headerEl.querySelector('.history-arrow');
    results.classList.toggle('open');
    arrow.classList.toggle('open');
}

async function deleteHistory(id) {
    await fetch(`/api/history/delete/${id}`, { method: 'DELETE' });
    loadHistory();
}

async function clearAllHistory() {
    if (!confirm('Delete all history?')) return;
    await fetch('/api/history/clear', { method: 'DELETE' });
    loadHistory();
}

function searchFromHistory(username) {
    const container = document.getElementById('usernames-container');
    container.innerHTML = `
        <div class="username-row">
            <input type="text" class="search-input username-field" 
                   placeholder="Enter username..." value="${username}">
            <button class="remove-row-btn" onclick="removeRow(this)">−</button>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== СВОИ САЙТЫ =====
async function loadCustomSites() {
    const res = await fetch('/api/sites/custom');
    const sites = await res.json();
    const list = document.getElementById('custom-sites-list');
    if (!list) return;
    if (sites.length === 0) {
        list.innerHTML = '<div style="color:#666;font-size:0.85rem;padding:8px 0;">No custom sites added yet.</div>';
        return;
    }
    list.innerHTML = sites.map(s => `
        <div class="custom-site-item">
            <span class="custom-site-name"><i class="fas fa-bolt bolt"></i> ${s.name}</span>
            <span class="custom-site-url">${s.url}</span>
            <button class="remove-row-btn" onclick="deleteCustomSite('${s.name.replace(/'/g,"\\'")}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function addCustomSite() {
    const name = document.getElementById('cs-name').value.trim();
    const url = document.getElementById('cs-url').value.trim();
    const check = document.getElementById('cs-check').value.trim();
    const cat = document.getElementById('cs-cat').value;

    if (!name || !url) {
        alert('Fill in Name and URL!');
        return;
    }
    if (!url.includes('{username}')) {
        alert('URL must contain {username}\nExample: https://example.com/{username}');
        return;
    }

    const res = await fetch('/api/sites/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, check_string: check || '', category: cat, country: '🌍' })
    });
    const data = await res.json();

    if (data.status === 'ok') {
        document.getElementById('cs-name').value = '';
        document.getElementById('cs-url').value = '';
        document.getElementById('cs-check').value = '';
        loadCustomSites();
    } else {
        alert('Error: ' + (data.message || 'Unknown error'));
    }
}

async function deleteCustomSite(name) {
    if (!confirm(`Delete site "${name}"?`)) return;
    await fetch('/api/sites/custom/' + encodeURIComponent(name), { method: 'DELETE' });
    loadCustomSites();
}

// ===== СИНИЕ МОЛНИИ =====
function makeBlueLightning() {
    const selectors = ['.section-title', '.history-nick', '.logo-small', '.stat-label'];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.innerHTML = el.innerHTML.replace(/⚡/g,
                '<span style="filter:hue-rotate(190deg) saturate(3) brightness(1.3);display:inline-block">⚡</span>'
            );
        });
    });
}

// ===== СТАРТ =====
window.addEventListener('load', () => {
    startMatrix('matrix-canvas');
    setTimeout(makeBlueLightning, 500);
    loadCustomSites();
    if (Notification.permission !== 'granted') Notification.requestPermission();
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('matrix-canvas');
        if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    });
});