// --- Gestion des données historiques et initialisation des graphiques ---
let chartInstance = null;
const chartInstances = {};
// === Gestion persistante des dossiers ===
const DOSSIERS_STORAGE_KEY = "dossiersUtilisateur";
// Charger les dossiers depuis localStorage dès que la page est prête
window.addEventListener("DOMContentLoaded", () => {
    loadDossiersLocal();
});


// Retourne l'historique pour un rucher/esp donné, avec compatibilité 'rucher1'/'rucher2'
function getHistorique(rucher) {
    try {
        const data = window.historiqueRuches || {};
        if (data && data[rucher]) return data[rucher];
        if (rucher === 'rucher1' && data['esp1']) return data['esp1'];
        if (rucher === 'rucher2' && data['esp2']) return data['esp2'];
    } catch (e) { /* ignore */ }
    return [];
}

// Helpers pour améliorer le rendu des graphiques
function hexToRgba(hex, alpha) {
    // Supporte #RGB et #RRGGBB
    let r = 0, g = 0, b = 0;
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
        r = parseInt(clean.slice(0, 2), 16);
        g = parseInt(clean.slice(2, 4), 16);
        b = parseInt(clean.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeAreaGradient(ctx, hexColor) {
    const h = ctx.canvas.height || 200;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, hexToRgba(hexColor, 0.25));
    gradient.addColorStop(1, hexToRgba(hexColor, 0));
    return gradient;
}

function buildPrettyChartConfig(labels, dataPoints, labelY, borderColor, ctx) {
    return {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelY,
                data: dataPoints,
                borderColor: borderColor,
                backgroundColor: makeAreaGradient(ctx, borderColor),
                borderWidth: 3,
                fill: true,
                tension: 0.4,            // courbes légèrement plus lisses
                pointRadius: 3,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: borderColor,
                pointHoverBorderWidth: 2,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                borderCapStyle: 'round',
                borderJoinStyle: 'round'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 700, easing: 'easeOutQuart' },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: labelY, color: '#333', font: { size: 14, weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
                    ticks: { color: '#555', font: { size: 12 } }
                },
                x: {
                    title: { display: true, text: 'Heure', color: '#333', font: { size: 14, weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                    ticks: { color: '#555', font: { size: 12 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            const v = context.parsed.y;
                            return `${labelY}: ${typeof v === 'number' ? v.toLocaleString() : v}`;
                        }
                    }
                }
            }
        }
    };
}



// --- Fonctions pour le menu mobile ---
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    if (sidebar.classList.contains('open')) {
        setTimeout(adjustSidebarHeight, 50);
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

function closeSidebarOnMenuClick() {
    try {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    } catch (error) {
        console.error('Erreur lors de la fermeture de la sidebar:', error);
    }
}

// --- Gestion du redimensionnement ---
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
    adjustSidebarHeight();
});

function adjustSidebarHeight() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (!sidebar || !overlay) {
            console.warn('Sidebar ou overlay non trouvé pour ajustement hauteur');
            return;
        }
        const viewportHeight = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0,
            screen.height || 0
        );
        if (viewportHeight > 0) {
            sidebar.style.setProperty('height', viewportHeight + 'px', 'important');
            sidebar.style.setProperty('min-height', viewportHeight + 'px', 'important');
            overlay.style.setProperty('height', viewportHeight + 'px', 'important');
        }
    }
}

function safeAdjustSidebarHeight() {
    if (document.readyState === 'loading') {
        setTimeout(safeAdjustSidebarHeight, 100);
        return;
    }
    adjustSidebarHeight();
}

window.addEventListener('load', safeAdjustSidebarHeight);
window.addEventListener('DOMContentLoaded', safeAdjustSidebarHeight);
window.addEventListener('orientationchange', function() {
    setTimeout(safeAdjustSidebarHeight, 100);
    setTimeout(safeAdjustSidebarHeight, 500);
});

let scrollTimeout;
window.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(safeAdjustSidebarHeight, 100);
});

// --- Configuration des noms de ruchers ---
function chargerNomsRuchers() {
    try {
        Object.keys(window.historiqueRuches).forEach(espId => {
            const title = document.getElementById(espId + '-title');
            if (title) {
                const icon = title.querySelector('span'); // garder l'icône
                if (icon) {
                    // Supprimer ancien texte
                    while (icon.nextSibling) icon.parentNode.removeChild(icon.nextSibling);
                    // Ajouter le nouveau nom
                    icon.insertAdjacentText('afterend', ' ' + (localStorage.getItem(espId + '-name') || espId.toUpperCase()));
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors du chargement des noms de ruchers:', error);
    }
}

function ouvrirConfig() {
    const modal = document.getElementById('configModal');
    const container = document.getElementById('esp-name-container');
    container.innerHTML = ''; // vider avant de générer

    Object.keys(window.historiqueRuches).forEach(espId => {
        const label = document.createElement('label');
        label.textContent = espId.toUpperCase() + ' :';
        label.setAttribute('for', espId + '-name');

        const input = document.createElement('input');
        input.type = 'text';
        input.id = espId + '-name';
        input.style.width = '100%';
        input.style.marginBottom = '10px';
        input.value = localStorage.getItem(espId + '-name') || espId.toUpperCase();

        container.appendChild(label);
        container.appendChild(input);
    });

    modal.style.display = 'flex';
}

function mettreAJourNomsSidebar() {
    Object.keys(window.historiqueRuches).forEach(espId => {
        const title = document.getElementById(`${espId}-title`);
        if (title) title.innerHTML = `<span class="iconify" data-icon="game-icons:beehive"></span> ${localStorage.getItem(espId+'-name') || espId.toUpperCase()}`;
    });
}
function fermerConfig() {
    const modal = document.getElementById('configModal');
    if (modal) modal.style.display = 'none';
}

function sauvegarderConfig() {
    Object.keys(window.historiqueRuches).forEach(espId => {
        const input = document.getElementById(espId + '-name');
        if (input) localStorage.setItem(espId + '-name', input.value);
    });
    mettreAJourNomsSidebar(); // mettre à jour la sidebar avec les nouveaux noms
    fermerConfig(); // fermer le modal
}

// Ferme le modal de configuration si clic en dehors
window.onclick = function(event) {
    const modal = document.getElementById('configModal');
    if (event.target === modal) {
        fermerConfiguration();
    }
};

// --- Initialisation ---


function toggleSubmenu(id) {
    try {
        const submenu = document.getElementById(id);
        if (submenu) {
            submenu.style.display = submenu.style.display === 'flex' ? 'none' : 'flex';
        }
    } catch (error) {
        console.error('Erreur lors du toggle submenu:', error);
    }
}

// --- Fonctions pour le Dashboard ---
let editMode = false;
let dashboardCards = [];
function afficherDashboard() {
    console.log('Dashboard affiché');
    closeSidebarOnMenuClick();

    const dashboardItem = document.querySelector('.dashboard-item');
    if (dashboardItem) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        dashboardItem.classList.add('active');
    }

    const mainContainer = document.querySelector('.main');
    mainContainer.innerHTML = `
        <div id="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #333;">Dashboard</h1>
            <button id="edit-dashboard-btn" class="btn btn-primary" onclick="toggleEditMode()">
                <span id="edit-btn-text"><i class="fas fa-edit"></i> Modifier</span>
            </button>
        </div>
        <div id="dashboard-content">
            <div id="dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;"></div>

            <div id="add-card-section" style="display: none; margin-top: 20px; padding: 20px; border: 2px dashed #ccc; border-radius: 8px; text-align: center;">
                <h3>Ajouter une nouvelle carte</h3>
                <select id="card-type-select" style="margin: 10px; padding: 8px;">
                    <option value="">Choisir un ESP</option>
                </select>
                <button class="btn btn-primary" onclick="ajouterCarte()" style="margin-left: 10px;">Ajouter</button>
            </div>
        </div>
    `;

    // Remplir dynamiquement le select avec les ESP existants dans historiqueRuches
    const select = document.getElementById('card-type-select');
    const types = ['poids', 'temperature', 'humidite'];
    Object.keys(historiqueRuches).forEach(espId => {
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = `${espId}-${type}`;
            option.textContent = `${espId.toUpperCase()} - ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            select.appendChild(option);
        });
    });

    chargerCartesDashboard();
}

function toggleEditMode() {
    editMode = !editMode;
    const editBtn = document.getElementById('edit-btn-text');
    const addCardSection = document.getElementById('add-card-section');

    if (editMode) {
        editBtn.textContent = '✅ Terminer';
        addCardSection.style.display = 'block';
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.classList.add('edit-mode');
            card.querySelector('.card-delete-btn').style.display = 'block';
            card.querySelector('.resize-handle').style.display = 'block';
            card.querySelector('.card-size-controls').style.display = 'flex';
            activerDragAndDrop(card);
        });
    } else {
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
        addCardSection.style.display = 'none';
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.classList.remove('edit-mode');
            card.querySelector('.card-delete-btn').style.display = 'none';
            card.querySelector('.resize-handle').style.display = 'none';
            card.querySelector('.card-size-controls').style.display = 'none';
            desactiverDragAndDrop(card);
        });
        sauvegarderCartesDashboard();
    }
}

function ajouterCarte() {
    const select = document.getElementById('card-type-select');
    const cardType = select.value;

    if (!cardType) {
        alert('Veuillez sélectionner un type de carte');
        return;
    }
    if (dashboardCards.includes(cardType)) {
        alert('Cette carte est déjà présente dans le dashboard');
        return;
    }

    dashboardCards.push(cardType);
    const newOrder = document.querySelectorAll('.dashboard-card').length;
    const cardData = { size: 'medium', order: newOrder };
    creerCarte(cardType, cardData);
    select.value = '';
}

function supprimerCarte(cardType) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
        // Détruire le graphique associé si présent
        const canvasId = `chart-${cardType}`;
        try {
            const existing = chartInstances[canvasId] || Chart.getChart(canvasId);
            if (existing) {
                existing.destroy();
                delete chartInstances[canvasId];
            }
        } catch (e) { /* ignore */ }
        // Retirer la carte de la liste et du DOM
        dashboardCards = dashboardCards.filter(card => card !== cardType);
        const el = document.getElementById(`card-${cardType}`);
        if (el) el.remove();
    }
}

function creerCarte(cardType, cardData = null) {
    const [rucher, type] = cardType.split('-');
    const rucherName = rucher === 'rucher1' ?
        (localStorage.getItem('rucher1-name') || 'Rucher 1') :
        (localStorage.getItem('rucher2-name') || 'Rucher 2');
    const typeLabel = type === 'poids' ? 'Poids (kg)' :
                     type === 'temperature' ? 'Température (°C)' :
                     'Humidité (%)';
    const size = cardData?.size || 'medium';
    const order = cardData?.order || dashboardCards.length;

    const cardHtml = `
        <div id="card-${cardType}" class="dashboard-card" data-size="${size}" data-order="${order}" style="
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            grid-column: span ${getSizeColumns(size)};
            order: ${order};
        ">
            <div class="card-size-controls" style="display: ${editMode ? 'flex' : 'none'};">
                <button class="size-btn ${size === 'small' ? 'active' : ''}" onclick="changerTailleCarte('${cardType}', 'small')">S</button>
                <button class="size-btn ${size === 'medium' ? 'active' : ''}" onclick="changerTailleCarte('${cardType}', 'medium')">M</button>
                <button class="size-btn ${size === 'large' ? 'active' : ''}" onclick="changerTailleCarte('${cardType}', 'large')">L</button>
            </div>
            <button class="card-delete-btn" onclick="supprimerCarte('${cardType}')" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                cursor: pointer;
                display: ${editMode ? 'block' : 'none'};
            ">×</button>
            <div class="resize-handle" style="display: ${editMode ? 'block' : 'none'};"></div>
            <h3 style="margin-top: 0; color: #333;">${rucherName} - ${typeLabel}</h3>
            <canvas id="chart-${cardType}" style="max-height: ${getSizeHeight(size)}px;"></canvas>
        </div>
    `;

    document.getElementById('dashboard-grid').insertAdjacentHTML('beforeend', cardHtml);

    if (editMode) {
        const card = document.getElementById(`card-${cardType}`);
        card.classList.add('edit-mode');
        activerDragAndDrop(card);
    }

    setTimeout(() => creerGraphiqueCarte(cardType), 100);
}

// Crée/détruit proprement le graphique d'une carte
function creerGraphiqueCarte(cardType) {
    const [rucher, type] = cardType.split('-');

    // ✅ On récupère d'abord les données AVANT de les utiliser dans le console.log
    let dataFiltrees = getHistorique(rucher).slice(-10);
    console.log(rucher, dataFiltrees);

    if (!Array.isArray(dataFiltrees) || dataFiltrees.length === 0) return;

    const labels = dataFiltrees.map(d => new Date(d.heure).toLocaleTimeString());
    let dataPoints = [];
    let labelY = '';
    let borderColor = '';

    if (type === 'poids') {
        dataPoints = dataFiltrees.map(d => d.poids);
        labelY = 'Poids (kg)';
        borderColor = '#007bff';
    } else if (type === 'temperature') {
        dataPoints = dataFiltrees.map(d => d.temperature);
        labelY = 'Température (°C)';
        borderColor = '#dc3545';
    } else if (type === 'humidite') {
        dataPoints = dataFiltrees.map(d => d.humidite);
        labelY = 'Humidité (%)';
        borderColor = '#28a745';
    }

    const canvasId = `chart-${cardType}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ✅ Détruire un graphique existant si présent
    try {
        const existing = chartInstances[canvasId] || Chart.getChart(canvasId);
        if (existing) {
            existing.destroy();
            delete chartInstances[canvasId];
        }
    } catch (e) { /* ignore */ }

    // ✅ Créer le nouveau graphique
    chartInstances[canvasId] = new Chart(
        ctx,
        buildPrettyChartConfig(labels, dataPoints, labelY, borderColor, ctx)
    );
}


function chargerCartesDashboard() {
    const savedCards = localStorage.getItem('dashboard-cards');
    const savedCardsData = localStorage.getItem('dashboard-cards-data');

    if (savedCards) {
        dashboardCards = JSON.parse(savedCards);
        const cardsData = savedCardsData ? JSON.parse(savedCardsData) : {};
        const sortedCards = dashboardCards.sort((a, b) => {
            const orderA = cardsData[a]?.order || 0;
            const orderB = cardsData[b]?.order || 0;
            return orderA - orderB;
        });
        sortedCards.forEach(cardType => {
            const cardData = cardsData[cardType];
            creerCarte(cardType, cardData);
        });
    }
}

function sauvegarderCartesDashboard() {
    const cardsData = {};
    document.querySelectorAll('.dashboard-card').forEach(card => {
        const cardType = card.id.replace('card-', '');
        cardsData[cardType] = {
            size: card.dataset.size,
            order: parseInt(card.dataset.order) || 0
        };
    });
    localStorage.setItem('dashboard-cards-data', JSON.stringify(cardsData));
    localStorage.setItem('dashboard-cards', JSON.stringify(dashboardCards));
}

// --- Fonctions utilitaires pour les tailles ---
function getSizeColumns(size) {
    switch(size) {
        case 'small': return 1;
        case 'medium': return 2;
        case 'large': return 3;
        default: return 2;
    }
}

function getSizeHeight(size) {
    switch(size) {
        case 'small': return 150;
        case 'medium': return 200;
        case 'large': return 300;
        default: return 200;
    }
}

function changerTailleCarte(cardType, newSize) {
    const card = document.getElementById(`card-${cardType}`);
    const canvas = document.getElementById(`chart-${cardType}`);
    card.dataset.size = newSize;
    card.style.gridColumn = `span ${getSizeColumns(newSize)}`;
    canvas.style.maxHeight = `${getSizeHeight(newSize)}px`;

    card.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    card.querySelector(`[onclick*="'${newSize}'"]`).classList.add('active');

    setTimeout(() => {
        const chart = Chart.getChart(canvas);
        if (chart) {
            chart.resize();
        }
    }, 100);
}

// --- Drag & Drop ---
let draggedElement = null;
let dropZones = [];

function activerDragAndDrop(card) {
    card.draggable = true;
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
}

function desactiverDragAndDrop(card) {
    card.draggable = false;
    card.removeEventListener('dragstart', handleDragStart);
    card.removeEventListener('dragend', handleDragEnd);
}

function creerZonesDeDépôt() {
    const grid = document.getElementById('dashboard-grid');
    const cards = Array.from(grid.querySelectorAll('.dashboard-card')).sort((a, b) => {
        return parseInt(a.dataset.order) - parseInt(b.dataset.order);
    });

    document.querySelectorAll('.drop-zone').forEach(zone => zone.remove());
    dropZones = [];

    const firstZone = document.createElement('div');
    firstZone.className = 'drop-zone';
    firstZone.dataset.insertIndex = '0';
    grid.insertBefore(firstZone, cards[0] || null);
    dropZones.push(firstZone);

    cards.forEach((card, index) => {
        if (index < cards.length - 1) {
            const zone = document.createElement('div');
            zone.className = 'drop-zone';
            zone.dataset.insertIndex = (index + 1).toString();
            grid.insertBefore(zone, cards[index + 1]);
            dropZones.push(zone);
        }
    });

    const lastZone = document.createElement('div');
    lastZone.className = 'drop-zone';
    lastZone.dataset.insertIndex = cards.length.toString();
    grid.appendChild(lastZone);
    dropZones.push(lastZone);

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleZoneDragOver);
        zone.addEventListener('dragleave', handleZoneDragLeave);
        zone.addEventListener('drop', handleZoneDrop);
    });
}

function supprimerZonesDeDépôt() {
    document.querySelectorAll('.drop-zone').forEach(zone => zone.remove());
    dropZones = [];
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    setTimeout(() => {
        creerZonesDeDépôt();
        dropZones.forEach(zone => zone.classList.add('active'));
    }, 10);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    setTimeout(() => {
        supprimerZonesDeDépôt();
        draggedElement = null;
    }, 100);
}

function handleZoneDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleZoneDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleZoneDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    let insertIndex = parseInt(this.dataset.insertIndex);
    const draggedOrder = parseInt(draggedElement.dataset.order);
    const cards = Array.from(document.querySelectorAll('.dashboard-card')).sort((a, b) => {
        return parseInt(a.dataset.order) - parseInt(b.dataset.order);
    });
    const draggedCard = cards.find(card => parseInt(card.dataset.order) === draggedOrder);
    const currentIndex = cards.indexOf(draggedCard);

    if (insertIndex === currentIndex || insertIndex === currentIndex + 1) {
        reorganiserCartes();
        return false;
    }

    if (insertIndex > currentIndex) {
        for (let i = currentIndex + 1; i < insertIndex; i++) {
            if (cards[i]) {
                const newOrder = parseInt(cards[i].dataset.order) - 1;
                cards[i].dataset.order = newOrder;
                cards[i].style.order = newOrder;
            }
        }
        draggedCard.dataset.order = insertIndex - 1;
        draggedCard.style.order = insertIndex - 1;
    } else {
        for (let i = insertIndex; i < currentIndex; i++) {
            if (cards[i]) {
                const newOrder = parseInt(cards[i].dataset.order) + 1;
                cards[i].dataset.order = newOrder;
                cards[i].style.order = newOrder;
            }
        }
        draggedCard.dataset.order = insertIndex;
        draggedCard.style.order = insertIndex;
    }

    reorganiserCartes();
    return false;
}

function reorganiserCartes() {
    const grid = document.getElementById('dashboard-grid');
    const cards = Array.from(grid.querySelectorAll('.dashboard-card')).sort((a, b) => {
        return parseInt(a.dataset.order) - parseInt(b.dataset.order);
    });
    document.querySelectorAll('.drop-zone').forEach(zone => zone.remove());
    cards.forEach(card => {
        grid.appendChild(card);
    });
}

// --- Export XLSX ---
function exporterDonneesXLSX(rucher) {
    const exportBtn = document.getElementById(`export-xlsx-btn-${rucher}`);
    if (!exportBtn) {
        console.error("Bouton d'export introuvable");
        return;
    }

    const texteOriginal = exportBtn.innerHTML;
    exportBtn.innerHTML = '⏳ Chargement...';
    exportBtn.disabled = true;

    const url = rucher === 'rucher1' ? '/api/historique/complet' : '/api/historique/rucher2/complet';
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des données');
            }
            return response.json();
        })
        .then(donnees => {
            if (donnees.length === 0) {
                alert('Aucune donnée disponible pour ce rucher.');
                return;
            }
            procederExportXLSX(rucher, donnees);
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Impossible de récupérer les données complètes. Exportation des données disponibles localement.');
            let donnees = [];
            if (rucher === 'rucher1') {
                donnees = historiqueRucher1;
            } else if (rucher === 'rucher2') {
                donnees = historiqueRucher2;
            }
            if (donnees.length === 0) {
                alert('Aucune donnée disponible pour ce rucher.');
                return;
            }
            procederExportXLSX(rucher, donnees);
        })
        .finally(() => {
            exportBtn.innerHTML = texteOriginal;
            exportBtn.disabled = false;
        });
}

function procederExportXLSX(rucher, donnees) {
    if (donnees.length === 0) {
        alert('Aucune donnée disponible pour ce rucher.');
        return;
    }

    const donneesFormatees = donnees.map(d => {
        const date = new Date(d.heure);
        const dateFormatee = date.toLocaleDateString();
        const heureFormatee = date.toLocaleTimeString();
        return {
            'Date': dateFormatee,
            'Heure': heureFormatee,
            'Poids (kg)': d.poids !== undefined ? d.poids : '',
            'Température (°C)': d.temperature !== undefined ? d.temperature : '',
            'Humidité (%)': d.humidite !== undefined ? d.humidite : ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(donneesFormatees);
    const wb = XLSX.utils.book_new();
    const rucherName = rucher === 'rucher1' ?
        (localStorage.getItem('rucher1-name') || 'Rucher 1') :
        (localStorage.getItem('rucher2-name') || 'Rucher 2');

    XLSX.utils.book_append_sheet(wb, ws, rucherName);
    const dateActuelle = new Date();
    const dateStr = dateActuelle.toISOString().split('T')[0];
    const nomFichier = `${rucherName}_complet_${dateStr}.xlsx`;
    XLSX.writeFile(wb, nomFichier);
}

// --- Affichage des graphiques ---
function afficherTousLesGraphiques(rucheId) {
    closeSidebarOnMenuClick();

    const mainContainer = document.querySelector('.main');
    mainContainer.innerHTML = `
        <h2 style="color: #333; margin-bottom: 20px;">${rucher}</h2>
        <div id="graph-poids-container">
            <h3>Poids</h3>
            <div id="dernier-poids-container-poids">
                <div id="dernier-poids-poids">0</div>
                <div id="fleche-container-poids">
                    <div id="trait-poids"></div>
                    <div id="pointe-poids"></div>
                </div>
            </div>
            <canvas id="graphique-poids"></canvas>
        </div>
        <div id="graph-temperature-container">
            <h3>Température</h3>
            <div id="derniere-valeur-container-temperature">
                <div id="derniere-valeur-temperature">0</div>
                <div id="unite-valeur-temperature"></div>
            </div>
            <canvas id="graphique-temperature"></canvas>
        </div>
        <div id="graph-humidite-container">
            <h3>Humidité</h3>
            <div id="derniere-valeur-container-humidite">
                <div id="derniere-valeur-humidite">0</div>
                <div id="unite-valeur-humidite"></div>
            </div>
            <canvas id="graphique-humidite"></canvas>
        </div>
    `;

    afficherGraphique(rucherId, 'poids');
    afficherGraphique(rucherId, 'temperature');
    afficherGraphique(rucherId, 'humidite');
}


function creerGraphiqueTous(rucher, type) {
    let dataFiltrée = [];
    if (rucher === 'rucher1') dataFiltrée = historiqueRucher1.slice(-10);
    if (rucher === 'rucher2') dataFiltrée = historiqueRucher2.slice(-10);

    const labels = dataFiltrée.map(d => new Date(d.heure).toLocaleTimeString());
    let dataPoints = [];
    let labelY = '';
    let borderColor = '';

    if (type === 'poids') {
        dataPoints = dataFiltrée.map(d => d.poids);
        labelY = 'Poids (kg)';
        borderColor = '#007bff';
        if (dataFiltrée.length > 0) {
            const dernierPoids = dataFiltrée[dataFiltrée.length - 1].poids;
            document.getElementById('dernier-poids').textContent = dernierPoids;
            if (dataFiltrée.length > 1) {
                const avantDernierPoids = dataFiltrée[dataFiltrée.length - 2].poids;
                const flecheContainer = document.getElementById('fleche-container');
                const trait = document.getElementById('trait');
                const pointe = document.getElementById('pointe');
                const dernierPoidsEl = document.getElementById('dernier-poids');

                if (dernierPoids > avantDernierPoids) {
                    flecheContainer.style.transform = 'rotate(-135deg)';
                    trait.style.backgroundColor = 'green';
                    pointe.style.borderTopColor = 'green';
                    dernierPoidsEl.style.color = 'green';
                } else if (dernierPoids < avantDernierPoids) {
                    flecheContainer.style.transform = 'rotate(-45deg)';
                    trait.style.backgroundColor = 'red';
                    pointe.style.borderTopColor = 'red';
                    dernierPoidsEl.style.color = 'red';
                } else {
                    flecheContainer.style.transform = 'rotate(-90deg)';
                    trait.style.backgroundColor = 'gray';
                    pointe.style.borderTopColor = 'gray';
                    dernierPoidsEl.style.color = 'black';
                }
            }
        }
    } else if (type === 'temperature') {
        const donneesAvecTemp = dataFiltrée.filter(d => d.temperature !== undefined && d.temperature !== null);
        if (donneesAvecTemp.length > 0) {
            dataPoints = donneesAvecTemp.map(d => d.temperature);
            labels.length = 0;
            labels.push(...donneesAvecTemp.map(d => new Date(d.heure).toLocaleTimeString()));
            const derniereTemp = dataPoints[dataPoints.length - 1];
            document.getElementById('derniere-temperature').textContent = derniereTemp.toFixed(1);
        }
        labelY = 'Température (°C)';
        borderColor = '#dc3545';
    } else if (type === 'humidite') {
        const donneesAvecHumidite = dataFiltrée.filter(d => d.humidite !== undefined && d.humidite !== null);
        if (donneesAvecHumidite.length > 0) {
            dataPoints = donneesAvecHumidite.map(d => d.humidite);
            labels.length = 0;
            labels.push(...donneesAvecHumidite.map(d => new Date(d.heure).toLocaleTimeString()));
            const derniereHumidite = dataPoints[dataPoints.length - 1];
            document.getElementById('derniere-humidite').textContent = derniereHumidite.toFixed(1);
        }
        labelY = 'Humidité (%)';
        borderColor = '#28a745';
    }

    const ctx = document.getElementById(`graphique-${type}`).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelY,
                data: dataPoints,
                borderColor: borderColor,
                backgroundColor: borderColor + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: labelY }
                },
                x: {
                    title: { display: true, text: 'Heure' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function afficherGraphique(rucher, type) {
    let dataFiltrée = historiqueRuches[rucher] || [];
    dataFiltrée = dataFiltrée.slice(-10);

    const labels = dataFiltrée.map(d => new Date(d.heure).toLocaleTimeString());
    let dataPoints = [];
    let labelY = '';

    if (type === 'poids') {
        dataPoints = dataFiltrée.map(d => d.poids);
        labelY = 'Poids (kg)';
    } else if (type === 'temperature') {
        const donneesAvecTemp = dataFiltrée.filter(d => d.temperature != null);
        dataPoints = donneesAvecTemp.map(d => d.temperature);
        labels.length = 0;
        labels.push(...donneesAvecTemp.map(d => new Date(d.heure).toLocaleTimeString()));
        labelY = 'Température (°C)';
    } else if (type === 'humidite') {
        const donneesAvecHumidite = dataFiltrée.filter(d => d.humidite != null);
        dataPoints = donneesAvecHumidite.map(d => d.humidite);
        labels.length = 0;
        labels.push(...donneesAvecHumidite.map(d => new Date(d.heure).toLocaleTimeString()));
        labelY = 'Humidité (%)';
    }

    // Mettre à jour les dernières valeurs et flèches
    if (type === 'poids' && dataPoints.length > 0) {
        const dernierPoids = dataPoints[dataPoints.length - 1];
        const avantDernierPoids = dataPoints[dataPoints.length - 2] || dernierPoids;

        document.getElementById('dernier-poids-poids').textContent = dernierPoids;
        const fleche = document.getElementById('fleche-container-poids');
        if (dernierPoids > avantDernierPoids) {
            fleche.style.transform = 'rotate(90deg)';
        } else if (dernierPoids < avantDernierPoids) {
            fleche.style.transform = 'rotate(90deg)';
        } else {
            fleche.style.transform = 'rotate(90deg)';
        }
    } else if (type === 'temperature' && dataPoints.length > 0) {
        document.getElementById('derniere-valeur-temperature').textContent = dataPoints[dataPoints.length - 1].toFixed(1);
        document.getElementById('unite-valeur-temperature').textContent = '°C';
    } else if (type === 'humidite' && dataPoints.length > 0) {
        document.getElementById('derniere-valeur-humidite').textContent = dataPoints[dataPoints.length - 1].toFixed(1);
        document.getElementById('unite-valeur-humidite').textContent = '%';
    }

    const canvasId = `graphique-${type}`;
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

    const color = type === 'poids' ? '#007bff' : (type === 'temperature' ? '#dc3545' : '#28a745');
    chartInstances[canvasId] = new Chart(ctx, buildPrettyChartConfig(labels, dataPoints, labelY, color, ctx));
}function chargerTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    appliquerTheme(theme);
}

function appliquerTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
    } else {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
}




// --- Ajout du bouton Paramètres dans la sidebar (UNE SEULE FOIS) ---


// --- Initialisation finale ---
document.addEventListener('DOMContentLoaded', () => {
    chargerTheme();
    chargerNomsRuchers();
    ajouterBoutonParametres(); // Appelé UNE SEULE FOIS
    setTimeout(afficherDashboard, 100);
});
// Ouvre la seconde barre latérale


// Ouvre le modal pour modifier les noms des ruchers
function ouvrirModalNoms() {
    closeSidebarParam(); // Ferme la barre latérale des paramètres

    // Charge les noms actuels
    const rucher1NomInput = document.getElementById('rucher1-nom');
    const rucher2NomInput = document.getElementById('rucher2-nom');
    rucher1NomInput.value = localStorage.getItem('rucher1-name') || 'Rucher 1';
    rucher2NomInput.value = localStorage.getItem('rucher2-name') || 'Rucher 2';

    // Affiche le modal
    document.getElementById('modalNoms').style.display = 'block';
}

// Ferme le modal pour modifier les noms des ruchers
function fermerModalNoms() {
    document.getElementById('modalNoms').style.display = 'none';
}

// Sauvegarde les nouveaux noms des ruchers
function sauvegarderNomsRuchers() {
    const rucher1Nom = document.getElementById('rucher1-nom').value.trim();
    const rucher2Nom = document.getElementById('rucher2-nom').value.trim();

    if (rucher1Nom) {
        localStorage.setItem('rucher1-name', rucher1Nom);
        document.getElementById('rucher1-title').innerHTML = '<span class="iconify" data-icon="game-icons:beehive"></span> ' + rucher1Nom;
    }

    if (rucher2Nom) {
        localStorage.setItem('rucher2-name', rucher2Nom);
        document.getElementById('rucher2-title').innerHTML = '<span class="iconify" data-icon="game-icons:beehive"></span> ' + rucher2Nom;
    }

    fermerModalNoms();
}

// Modifie la fonction ajouterBoutonParametres pour ouvrir la seconde barre latérale
// CORRECTION : Vérifier si l'élément existe avant d'assigner onclick
function ajouterBoutonParametres() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.error("Sidebar non trouvé pour ajouter le bouton Paramètres");
        return;
    }

    // Vérifier si le bouton existe déjà
    if (document.getElementById('param-btn')) {
        return;
    }

    const btn = document.createElement('div');
    btn.className = 'config-button';
    btn.id = 'param-btn';
    btn.innerHTML = `<i class="fas fa-cog"></i> Paramètres`;
    
    // ✅ CORRECTION : Utiliser addEventListener au lieu de onclick direct
    btn.addEventListener('click', ouvrirParam);
    
    sidebar.appendChild(btn);
}

// CORRECTION pour tous les getElementById problématiques
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Élément non trouvé: ${id}`);
        return null;
    }
    return element;
}

// Exemple d'utilisation :
const modal = safeGetElement('configModal');
if (modal) {
    // Faire quelque chose avec modal
}
// Liste des ruches initiales
let hives = ["Ruche 1", "Ruche 2", "Ruche 3"];

const hiveList = document.getElementById("hiveList");

const renameForm = document.getElementById("renameForm");
const saveBtn = document.getElementById("saveBtn");

// Fonction pour afficher les ruches dans la sidebar
function renderHives() {
  hiveList.innerHTML = "";
  hives.forEach((hive, index) => {
    const div = document.createElement("div");
    div.textContent = hive;
    div.dataset.index = index;
    hiveList.appendChild(div);
  });
}


// Ouvre la fenêtre Paramètres
function ouvrirParam() {
    document.getElementById('configModal').style.display = 'flex';
    document.getElementById('esp-name-container').innerHTML = ''; // vide le formulaire
    document.getElementById('saveESPBtn').style.display = 'none'; // cacher le bouton sauvegarder
}

// Ferme le modal quand on clique sur la croix
document.getElementById('closeParamModal').onclick = function() {
    document.getElementById('paramModal').style.display = 'none';
}

// Ferme le modal si on clique en dehors
window.addEventListener('click', function(event) {
    const modal = document.getElementById('paramModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Fonction de déconnexion
function deconnexion() {
    // Exemple : on vide le localStorage et on redirige
    localStorage.clear();
    alert('Vous êtes déconnecté !');
    window.location.href = '/login.html'; // à adapter selon ton site
}
// Ouvre le modal de renommer
function ouvrirModalNoms() {
    // Ferme le modal paramètres si ouvert
    document.getElementById('paramModal').style.display = 'none';

    // Charge les noms actuels
    document.getElementById('rucher1-nom').value = localStorage.getItem('rucher1-name') || 'Rucher 1';
    document.getElementById('rucher2-nom').value = localStorage.getItem('rucher2-name') || 'Rucher 2';

    document.getElementById('modalNoms').style.display = 'block';
}

// Ferme le modal
document.getElementById('closeModalNoms').onclick = function() {
    document.getElementById('modalNoms').style.display = 'none';
}

// Ferme si clic en dehors
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modalNoms');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
})

// Sauvegarde les nouveaux noms et met à jour l’affichage
function sauvegarderNomsRuchers() {
    const rucher1Nom = document.getElementById('rucher1-nom').value.trim();
    const rucher2Nom = document.getElementById('rucher2-nom').value.trim();

    if (rucher1Nom) {
        localStorage.setItem('rucher1-name', rucher1Nom);
        document.getElementById('rucher1-title').innerHTML =
            '<span class="iconify" data-icon="game-icons:beehive"></span> ' + rucher1Nom;
    }

    if (rucher2Nom) {
        localStorage.setItem('rucher2-name', rucher2Nom);
        document.getElementById('rucher2-title').innerHTML =
            '<span class="iconify" data-icon="game-icons:beehive"></span> ' + rucher2Nom;
    }

    document.getElementById('modalNoms').style.display = 'none';
}
let dossiers = []; // {nom: "Dossier 1", ruches: ["Ruche 1"]}
let ruches = ["Ruche 1", "Ruche 2", "Ruche 3"]; // ruches disponibles

// Ouvrir le modal
function ouvrirModalGestion() {
    document.getElementById('modalGestion').style.display = 'block';
    renderDossiers();
    renderRuches();
}

// Fermer le modal
document.getElementById('closeModalGestion').onclick = function() {
    document.getElementById('modalGestion').style.display = 'none';
}
function fermerParam() {
    const modal = document.getElementById('paramModal');
    if (modal) modal.style.display = 'none';
}
// Créer un dossier
// === Créer un nouveau dossier dans la sidebar et sur le serveur ===
// Créer un dossier


// --- Gestion des dossiers côté client ---
const STORAGE_KEY = "deletedDossiers";

// Récupérer les dossiers supprimés dans le navigateur
function getDeletedDossiers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}


// Renommer un dossier
function renommerDossier(index) {
    const nouveauNom = prompt("Nouveau nom du dossier:", dossiers[index].nom);
    if (nouveauNom) {
        dossiers[index].nom = nouveauNom;
        renderDossiers();
    }
}

// Affichage des dossiers
window.toggleDossier = function(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) {
        console.warn("⚠️ toggleDossier : submenu introuvable pour", submenuId);
        return;
    }
    submenu.style.display = (submenu.style.display === "none" || submenu.style.display === "") ? "block" : "none";
};

function renderDossiers() {
    const sidebar = document.getElementById("sidebarRuches");
    sidebar.innerHTML = "";

    const dossiers = JSON.parse(localStorage.getItem("dossiers") || "[]");

    dossiers.forEach(nom => {
        const divTitle = document.createElement("div");
        divTitle.className = "menu-item dossier-title";
        divTitle.textContent = nom;
        divTitle.onclick = () => toggleDossier(nom);
        sidebar.appendChild(divTitle);

        const divSubmenu = document.createElement("div");
        divSubmenu.className = "submenu";
        divSubmenu.id = nom;
        divSubmenu.style.display = "none";
        divSubmenu.style.marginLeft = "15px";
        sidebar.appendChild(divSubmenu);
    });
}


// Affichage des ruches disponibles
function renderRuches() {
    const container = document.getElementById('ruchesContainer');
    container.innerHTML = '';
    ruches.forEach(r => {
        const div = document.createElement('div');
        div.className = 'ruche';
        div.draggable = true;
        div.ondragstart = dragRuche;
        div.textContent = r;
        container.appendChild(div);
    });
}

// Drag & Drop
let draggedRuche = null;

function dragRuche(e) {
    draggedRuche = e.target;
}


function dropRuche(e, dossierIndex) {
    e.preventDefault();
    if (!draggedRuche) return;

    const nomRuche = draggedRuche.textContent;

    // Retirer de la liste principale si existante
    ruches = ruches.filter(r => r !== nomRuche);

    // Retirer de tout autre dossier
    dossiers.forEach(d => d.ruches = d.ruches.filter(r => r !== nomRuche));

    // Ajouter au dossier
    dossiers[dossierIndex].ruches.push(nomRuche);
    draggedRuche = null;

    renderDossiers();
    renderRuches();
}

function toggleSubmenu(id) {
    const submenu = document.getElementById(id);
    if (submenu.style.display === "none" || submenu.style.display === "") {
        submenu.style.display = "block";
    } else {
        submenu.style.display = "none";
    }
}

// Toggle sous-menu ruche
function toggleSubmenu(rucheId) {
    const submenu = document.getElementById(rucheId);
    if (!submenu) return;
    submenu.style.display = submenu.style.display === "block" ? "none" : "block";
}

// Afficher tous les graphiques pour une ruche/ESP
function afficherTousLesGraphiques(rucheId) {
    afficherGraphique(rucheId, "poids");
    afficherGraphique(rucheId, "temperature");
    afficherGraphique(rucheId, "humidite");
}
async function afficherTousLesGraphiques(espId) {
    try {
        // Récupérer les données depuis ton API Flask
        const response = await fetch(`/api/historique/${espId}`);
        const dataFiltrée = await response.json();

        // Réinitialiser le contenu principal
        const mainContainer = document.querySelector('.main');
        mainContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">${espId.toUpperCase()} - Tous les graphiques</h2>
                <button id="export-xlsx-btn" class="btn btn-primary" onclick="exporterDonneesXLSX('${espId}')">
                    <i class="fas fa-file-excel"></i> Exporter en Excel
                </button>
            </div>
            <div class="graphiques-container">
                <div class="graphique-item">
                    <h3>Poids (kg)</h3>
                    <div id="poids-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <div id="dernier-poids" style="font-size: 30px; font-weight: bold; margin-right: 10px;">0</div>
                        <div id="fleche-container" style="width: 15px; height: 30px;">
                            <div id="trait" style="width: 3px; height: 20px; background-color: green;"></div>
                            <div id="pointe" style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid green;"></div>
                        </div>
                    </div>
                    <canvas id="graphique-poids" style="max-height: 250px;"></canvas>
                </div>
                <div class="graphique-item">
                    <h3>Température (°C)</h3>
                    <div id="temperature-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <div id="derniere-temperature" style="font-size: 30px; font-weight: bold; color: #ff6b35;">0</div>
                        <div style="font-size: 20px; margin-left: 5px; color: #666;">°C</div>
                    </div>
                    <canvas id="graphique-temperature" style="max-height: 250px;"></canvas>
                </div>
                <div class="graphique-item">
                    <h3>Humidité (%)</h3>
                    <div id="humidite-container" style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <div id="derniere-humidite" style="font-size: 30px; font-weight: bold; color: #4a90e2;">0</div>
                        <div style="font-size: 20px; margin-left: 5px; color: #666;">%</div>
                    </div>
                    <canvas id="graphique-humidite" style="max-height: 250px;"></canvas>
                </div>
            </div>
        `;

        // Mettre à jour les dernières valeurs visibles
        if (dataFiltrée.length > 0) {
            document.getElementById('dernier-poids').textContent = dataFiltrée[dataFiltrée.length-1].poids || 0;
            document.getElementById('derniere-temperature').textContent = dataFiltrée[dataFiltrée.length-1].temperature || 0;
            document.getElementById('derniere-humidite').textContent = dataFiltrée[dataFiltrée.length-1].humidite || 0;
        }

        // Fonction interne pour tracer un graphique
        function tracerGraphique(type, couleur) {
            let dataPoints = [];
            let labels = dataFiltrée.map(d => new Date(d.heure).toLocaleTimeString());
            let labelY = '';

            if (type === 'poids') {
                dataPoints = dataFiltrée.map(d => d.poids);
                labelY = 'Poids (kg)';
            } else if (type === 'temperature') {
                const donneesAvecTemp = dataFiltrée.filter(d => d.temperature != null);
                dataPoints = donneesAvecTemp.map(d => d.temperature);
                labels = donneesAvecTemp.map(d => new Date(d.heure).toLocaleTimeString());
                labelY = 'Température (°C)';
            } else if (type === 'humidite') {
                const donneesAvecHumidite = dataFiltrée.filter(d => d.humidite != null);
                dataPoints = donneesAvecHumidite.map(d => d.humidite);
                labels = donneesAvecHumidite.map(d => new Date(d.heure).toLocaleTimeString());
                labelY = 'Humidité (%)';
            }

            const canvasId = `graphique-${type}`;
            const ctx = document.getElementById(canvasId).getContext('2d');

            if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

            chartInstances[canvasId] = new Chart(ctx, buildPrettyChartConfig(labels, dataPoints, labelY, couleur, ctx));
        }

        // Tracer les 3 graphiques
        tracerGraphique('poids', '#007bff');
        tracerGraphique('temperature', '#ff6b35');
        tracerGraphique('humidite', '#4a90e2');

    } catch (err) {
        console.error("Erreur lors du chargement des données :", err);
    }
}


function remplirSelectCartes() {
    const select = document.getElementById('card-type-select');
    // historiqueRuches contient tous les ESP et leurs données
    const types = ['poids', 'temperature', 'humidite'];

    Object.keys(historiqueRuches).forEach(espId => {
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = `${espId}-${type}`;
            option.textContent = `${espId.toUpperCase()} - ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            select.appendChild(option);
        });
    });
}
function ouvrirRenommerESP() {
    const container = document.getElementById('esp-name-container');
    container.innerHTML = ''; // vider

    Object.keys(window.historiqueRuches).forEach(espId => {
        const label = document.createElement('label');
        label.textContent = espId.toUpperCase() + ' :';
        label.setAttribute('for', espId + '-name');

        const input = document.createElement('input');
        input.type = 'text';
        input.id = espId + '-name';
        input.style.width = '100%';
        input.style.marginBottom = '10px';
        input.value = localStorage.getItem(espId + '-name') || espId.toUpperCase();

        container.appendChild(label);
        container.appendChild(input);
    });

    document.getElementById('saveESPBtn').style.display = 'inline-block'; // montrer le bouton enregistrer
}

function deplacerESPVersDossier(espId, dossierId) {
    const espElem = document.getElementById(espId + '-title');
    const dossierElem = document.getElementById(dossierId);

    if (espElem && dossierElem) {
        dossierElem.appendChild(espElem);
    } else {
        alert("ESP ou dossier introuvable !");
    }
}
// Au chargement de la page, cacher les dossiers supprimés
// --- Supprimer un dossier ---



// Au chargement de la page, cacher les dossiers supprimés
window.addEventListener("DOMContentLoaded", () => {
    let deleted = JSON.parse(localStorage.getItem("deletedDossiers") || "[]");
    deleted.forEach(dossierId => {
        const dossierElems = document.querySelectorAll(`[data-dossier='${dossierId}']`);
        dossierElems.forEach(el => el.style.display = "none");
    });
});


// Commencer le drag


// Déposer dans un dossier


function dragESP(ev, espId) {
    draggedESP = espId;
    ev.dataTransfer.setData("text/plain", espId);
}







function allowDrop(ev) {
    ev.preventDefault();
}

let draggedESP = null;

function startDrag(e, espId) {
    draggedESP = espId;
}

function dropESP(e, dossierNom) {
    e.preventDefault();
    if (!draggedESP) return;

    const dossiers = JSON.parse(localStorage.getItem("dossiers")) || [];
    dossiers.forEach(d => {
        let ruches = JSON.parse(localStorage.getItem(`dossier_${d}`)) || [];
        ruches = ruches.filter(r => r !== draggedESP);
        localStorage.setItem(`dossier_${d}`, JSON.stringify(ruches));
    });

    let ruches = JSON.parse(localStorage.getItem(`dossier_${dossierNom}`)) || [];
    ruches.push(draggedESP);
    localStorage.setItem(`dossier_${dossierNom}`, JSON.stringify(ruches));

    loadDossiersLocal();
    draggedESP = null;
}



// Ajouter un dossier depuis le modal



// Toggle dossier

function loadDossiersLocal() {
    const sidebar = document.getElementById("sidebarRuches");
    if (!sidebar) return;
    sidebar.innerHTML = "";

    // Dossiers utilisateur
    const dossiersUtilisateur = JSON.parse(localStorage.getItem("dossiers_utilisateur")) || {};
    for (const dossierNom in dossiersUtilisateur) {
        const ruches = dossiersUtilisateur[dossierNom];
        creerDossierInterface(dossierNom, ruches);
    }
}





document.addEventListener("DOMContentLoaded", () => {
    const addEspBtn = document.getElementById("addEspBtn");
    const espContainer = document.getElementById("esp-name-container");

    // Fonction pour créer un élément ESP32
    function creerESP(name) {
        const div = document.createElement("div");
        div.className = "esp-item";
        div.textContent = name;
        espContainer.appendChild(div);
    }

    // Bouton Ajouter ESP32
    addEspBtn.addEventListener("click", () => {
        const name = prompt("Entrez le nom de l'ESP32 :");
        if (name && name.trim() !== "") {
            creerESP(name.trim());
        } else {
            alert("Nom invalide.");
        }
    });
});
// Affiche le formulaire d'ajout ESP
function afficherFormulaireESP() {
    const formContainer = document.getElementById("esp-form-container");
    formContainer.style.display = "block";
}

// Fonction pour ajouter l'ESP32 et l'envoyer à Flask
function ajouterESP() {
    const espIdInput = document.getElementById("esp-id");
    const espKeyInput = document.getElementById("esp-key");
    const espContainer = document.getElementById("esp-name-container");

    const id = espIdInput.value.trim();
    const key = espKeyInput.value.trim();

    if (!id || !key) {
        alert("Veuillez remplir les deux champs !");
        return;
    }

    fetch("/add_esp32", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, key: key })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Ajouter dans la modale
            const div = document.createElement("div");
            div.className = "esp-item";
            div.textContent = `ID: ${id}, Clé: ${key}`;
            espContainer.appendChild(div);

            // Ajouter un nouveau dossier pour cet ESP dans la sidebar
            const sidebar = document.getElementById("sidebarRuches");

            // Créer le titre du dossier
            const dossierDiv = document.createElement("div");
            dossierDiv.className = "menu-item dossier-title";
            dossierDiv.textContent = id;
            dossierDiv.onclick = function() { toggleDossier(id); };
            sidebar.appendChild(dossierDiv);

            // Créer le submenu (vide pour l'instant)
            const submenu = document.createElement("div");
            submenu.className = "submenu";
            submenu.id = id;  // id = esp_id
            submenu.style.display = "none";
            submenu.style.marginLeft = "15px";
            sidebar.appendChild(submenu);

            // Réinitialiser le formulaire
            espIdInput.value = "";
            espKeyInput.value = "";
            document.getElementById("esp-form-container").style.display = "none";
        } else {
            alert(data.error || "Erreur lors de l'ajout !");
        }
    });
}
// === Affiche dans la modale tous les dossiers avec un bouton "Supprimer" ===
// --- Afficher la modale "Gérer dossiers" ---


// --- Au chargement : masquer uniquement les dossiers réellement supprimés ---
window.addEventListener("DOMContentLoaded", () => {
    const deleted = getDeletedDossiers();
    const allDossiers = Array.from(document.querySelectorAll(".dossier-title"))
                             .map(d => d.getAttribute("data-dossier"));

    allDossiers.forEach(dossierId => {
        if (deleted.includes(dossierId)) {
            const elems = document.querySelectorAll(`[data-dossier='${dossierId}']`);
            elems.forEach(el => el.remove());
        }
    });
});
// --- Stockage des dossiers supprimés dans le navigateur ---
function getDeletedDossiers() {
    return JSON.parse(localStorage.getItem("deletedDossiers") || "[]");
}

// Sauvegarder les dossiers supprimés
function saveDeletedDossiers(deleted) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deleted));
}
window.addEventListener("DOMContentLoaded", () => {
    loadDossiersLocal();
    refreshGestionDossiers();
});

// ---- LocalStorage ----
function saveDossiers() {
    localStorage.setItem("dossiersData", JSON.stringify(dossiersData));
}
function renderAllDossiers() {
    const sidebar = document.getElementById("sidebarRuches");
    sidebar.innerHTML = ""; // On vide avant de tout reconstruire

    for (const nom in dossiersData) {
        const divTitle = document.createElement("div");
        divTitle.className = "menu-item dossier-title";
        divTitle.setAttribute("data-dossier", nom);
        divTitle.innerHTML = `<i class="fas fa-folder"></i> ${nom}`;
        divTitle.onclick = () => toggleDossier(nom);
        sidebar.appendChild(divTitle);

        const divSubmenu = document.createElement("div");
        divSubmenu.className = "submenu";
        divSubmenu.id = nom;
        divSubmenu.style.display = "none";
        divSubmenu.style.marginLeft = "15px";
        sidebar.appendChild(divSubmenu);
    }
}


// Sauvegarder les dossiers dans localStorage
// Sauvegarder l'état complet des dossiers
function sauvegarderDossiers() {
    console.log('💾 Début sauvegarde...');
    
    const dossiersData = {};
    
    // Récupérer TOUS les dossiers sans exception
    const tousLesDossiers = document.querySelectorAll('.dossier-title[data-dossier]');
    console.log('📁 Dossiers trouvés pour sauvegarde:', tousLesDossiers.length);
    
    tousLesDossiers.forEach(dossierElem => {
        const dossierNom = dossierElem.getAttribute('data-dossier');
        console.log('💾 Sauvegarde du dossier:', dossierNom);
        
        const submenu = document.getElementById(dossierNom);
        
        if (submenu) {
            const ruches = [];
            // Récupérer toutes les ruches de ce dossier
            submenu.querySelectorAll('.menu-item').forEach(rucheElem => {
                // ✅ CORRECTION : Vérifier que c'est bien une ruche et non un sous-menu
                if (!rucheElem.querySelector('.submenu')) {
                    const rucheId = rucheElem.id.replace('-title', '');
                    if (rucheId && rucheId !== '') {
                        ruches.push(rucheId);
                        console.log('  📌 Ruche ajoutée:', rucheId);
                    }
                }
            });
            dossiersData[dossierNom] = ruches;
        } else {
            console.warn('⚠️ Submenu non trouvé pour:', dossierNom);
        }
    });
    
    // ✅ SAUVEGARDE SÉCURISÉE
    try {
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiersData));
        console.log('✅ Sauvegarde réussie. Dossiers:', Object.keys(dossiersData));
        console.log('📊 Détails:', dossiersData);
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
    }
}



// Charger les dossiers depuis localStorage
function chargerDossiers() {
    const saved = localStorage.getItem("dossiers_utilisateur");
    if (!saved) {
        console.log('Aucun dossier sauvegardé trouvé');
        return {};
    }
    
    try {
        const data = JSON.parse(saved);
        console.log('📂 Dossiers chargés depuis storage:', data);
        
        // ✅ VÉRIFICATION : S'assurer que c'est un objet valide
        if (typeof data !== 'object' || data === null) {
            console.error('❌ Format de sauvegarde invalide');
            return {};
        }
        
        return data;
    } catch (e) {
        console.error('❌ Erreur parsing dossiers:', e);
        
        // ✅ RÉCUPÉRATION : Essayer de récupérer les données
        try {
            // Tentative de récupération depuis l'ancien format
            const ancienneSauvegarde = localStorage.getItem("dossiers");
            if (ancienneSauvegarde) {
                console.log('🔄 Récupération depuis ancien format...');
                return JSON.parse(ancienneSauvegarde);
            }
        } catch (e2) {
            console.error('❌ Échec récupération ancien format');
        }
        
        return {};
    }
}


let reconstructionEffectuee = false;

function reconstruireDossiers() {
    if (reconstructionEffectuee) {
        console.log('⚠️ Reconstruction déjà effectuée, skip');
        return;
    }

    console.log('🔧 Tentative de reconstruction...');
    
    const dossiersData = chargerDossiers();
    console.log('📦 Dossiers à reconstruire:', dossiersData);

    // Vérifier si on a des données valides
    if (Object.keys(dossiersData).length === 0) {
        console.log('ℹ️ Aucun dossier à reconstruire');
        reconstructionEffectuee = true;
        return;
    }

    const sidebar = document.getElementById('sidebarRuches');
    if (!sidebar) {
        console.log('⏳ Sidebar non trouvée, retry dans 500ms');
        setTimeout(reconstruireDossiers, 500);
        return;
    }

    // Vérifier que le backend a fini de charger
    const contenuBackend = sidebar.innerHTML;
    if (!contenuBackend.includes('dossier-title') && !contenuBackend.includes('menu-item')) {
        console.log('⏳ Backend pas encore chargé, retry dans 300ms');
        setTimeout(reconstruireDossiers, 300);
        return;
    }

    // ✅ RECONSTRUCTION SÉCURISÉE
    reconstruireDossiersSecurise(dossiersData, sidebar);
}

function reconstruireDossiersSecurise(dossiersData, sidebar) {
    console.log('🏗️ Début reconstruction sécurisée...');
    
    let dossiersReconstruits = 0;
    
    Object.keys(dossiersData).forEach(dossierNom => {
        if (dossierNom && dossierNom.trim() !== '') {
            if (creerDossierInterfaceSecurisee(dossierNom, dossiersData[dossierNom])) {
                dossiersReconstruits++;
            }
        }
    });
    
    reconstructionEffectuee = true;
    console.log(`✅ Reconstruction terminée: ${dossiersReconstruits} dossiers recréés`);
}

function creerDossierInterfaceSecurisee(nom, ruches) {
    try {
        // Vérifier si le dossier existe déjà
        if (document.getElementById(nom)) {
            console.log('⚠️ Dossier existe déjà:', nom);
            return true;
        }

        const sidebar = document.getElementById('sidebarRuches');
        if (!sidebar) {
            console.error('❌ Sidebar non disponible pour:', nom);
            return false;
        }

        // 1. Créer le titre
        const divTitle = document.createElement("div");
        divTitle.className = "menu-item dossier-title";
        divTitle.setAttribute("data-dossier", nom);
        divTitle.innerHTML = `<i class="fas fa-folder"></i> ${nom}`;
        divTitle.onclick = () => toggleDossier(nom);

        // 2. Créer le submenu
        const divSubmenu = document.createElement("div");
        divSubmenu.className = "submenu";
        divSubmenu.id = nom;
        divSubmenu.style.display = "none";
        divSubmenu.style.marginLeft = "15px";
        divSubmenu.setAttribute("data-dossier", nom);
        divSubmenu.ondragover = allowDrop;
        divSubmenu.ondrop = (ev) => dropESP(ev, nom);

        // 3. Ajouter les ruches
        if (ruches && ruches.length > 0) {
            ruches.forEach(rucheId => {
                const rucheElem = document.getElementById(rucheId + '-title');
                if (rucheElem) {
                    const clone = rucheElem.cloneNode(true);
                    divSubmenu.appendChild(clone);
                }
            });
        }

        // 4. Ajouter à la sidebar (À LA FIN)
        sidebar.appendChild(divTitle);
        sidebar.appendChild(divSubmenu);

        console.log('✅ Dossier recréé:', nom);
        return true;

    } catch (error) {
        console.error('❌ Erreur création dossier:', nom, error);
        return false;
    }
}
// Fonction pour créer un dossier et son submenu dans la sidebar
// 🔹 Fonction pour créer un dossier et son submenu dans la sidebar
function creerDossierInterface(nom, ruches = []) {
    const sidebar = document.getElementById("sidebarRuches");
    if (!sidebar) return;

    if (document.getElementById(nom + "-submenu")) return;

    const divTitle = document.createElement("div");
    divTitle.className = "menu-item dossier-title";
    divTitle.textContent = nom;
    divTitle.onclick = () => toggleDossier(nom + "-submenu");
    sidebar.appendChild(divTitle);

    const divSubmenu = document.createElement("div");
    divSubmenu.className = "submenu";
    divSubmenu.id = nom + "-submenu";
    divSubmenu.style.display = "none";
    divSubmenu.style.marginLeft = "15px";
    divSubmenu.ondragover = e => e.preventDefault();
    divSubmenu.ondrop = e => dropESP(e, nom);
    sidebar.appendChild(divSubmenu);

    ruches.forEach(espId => {
        const espDiv = document.createElement("div");
        espDiv.className = "menu-item";
        espDiv.id = espId + "-title";
        espDiv.draggable = true;
        espDiv.ondragstart = e => startDrag(e, espId);
        espDiv.textContent = espId;
        divSubmenu.appendChild(espDiv);
    });
}




// 🔹 Charger les dossiers depuis localStorage et synchroniser ceux du serveur
function loadDossiersLocal() {
    const sidebar = document.getElementById("sidebarRuches");
    if (!sidebar) return;

    sidebar.innerHTML = ""; // vider l'ancien contenu

    // --- Récupérer ou initialiser localStorage ---
    let dossiersRaw;
    try {
        dossiersRaw = JSON.parse(localStorage.getItem("dossiers_utilisateur")) || [];
        if (!Array.isArray(dossiersRaw)) dossiersRaw = [];
    } catch (e) {
        dossiersRaw = [];
    }

    // --- Synchroniser les dossiers déjà dans le DOM (côté serveur) ---
    if (dossiersRaw.length === 0) {
        document.querySelectorAll("#sidebarRuches .dossier-title").forEach(div => {
            const nom = div.getAttribute("data-dossier");
            if (nom && !dossiersRaw.includes(nom)) dossiersRaw.push(nom);
        });
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiersRaw));
    }

    // --- Créer un objet pour compatibilité ---
    const dossiers = {};
    dossiersRaw.forEach(d => { dossiers[d] = []; });

    // --- Créer chaque dossier dans la sidebar ---
    for (const dossierName in dossiers) {
        creerDossierInterface(dossierName, dossiers[dossierName]);
    }
}

// 🔹 Ajouter un dossier
function ajouterDossier() {
    const nomDossier = prompt("Entrez le nom du dossier :");
    if (!nomDossier || nomDossier.trim() === "") {
        alert("Nom de dossier invalide !");
        return;
    }

    // Mettre à jour le localStorage
    let dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    if (!dossiers.includes(nomDossier)) {
        dossiers.push(nomDossier);
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiers));
    }

    // Créer le dossier dans la sidebar
    creerDossierInterface(nomDossier, []); // passer un tableau vide si pas d’ESP
}





// 🔹 Supprimer un dossier

// 🔹 Charger les dossiers au démarrage
window.addEventListener("DOMContentLoaded", () => {
    loadDossiersLocal();
});


// Fonction pour charger tous les dossiers depuis le localStorage


// Charger les dossiers au démarrage
window.addEventListener("DOMContentLoaded", () => {
    loadDossiersLocal();
});

function reconstruireDossiers() {
    console.log('🔧 Début reconstruction des dossiers...');
    
    const dossiersData = chargerDossiers();
    console.log('📂 Données à reconstruire:', dossiersData);
    
    // Si aucun dossier utilisateur sauvegardé, on sort
    if (Object.keys(dossiersData).length === 0) {
        console.log('ℹ️ Aucun dossier utilisateur à reconstruire');
        return;
    }
    
    const sidebar = document.getElementById('sidebarRuches');
    if (!sidebar) {
        console.error('❌ Sidebar non trouvée');
        setTimeout(reconstruireDossiers, 500);
        return;
    }
    
    // ✅ CORRECTION : Ne supprimer que si on peut les recréer
    Object.keys(dossiersData).forEach(dossierNom => {
        if (dossierNom && dossierNom.trim() !== '') {
            console.log('🔄 Traitement du dossier:', dossierNom);
            
            // Supprimer l'ancienne version si elle existe
            const ancienDossier = document.querySelector(`[data-dossier="${dossierNom}"]`);
            if (ancienDossier) {
                console.log('🗑️ Suppression ancien dossier:', dossierNom);
                ancienDossier.remove();
                const ancienSubmenu = document.getElementById(dossierNom);
                if (ancienSubmenu) ancienSubmenu.remove();
            }
            
            // Recréer le dossier
            creerDossierInterface(dossierNom, dossiersData[dossierNom]);
        }
    });
    
    console.log('✅ Reconstruction des dossiers terminée');
}
// Fonction utilitaire pour identifier les dossiers utilisateur
function isDossierUtilisateur(nomDossier) {
    // Les dossiers utilisateur ne viennent pas du backend
    return !nomDossier.startsWith('dossier_') && nomDossier !== 'rucher1' && nomDossier !== 'rucher2';
}
// Sauvegarder avant de quitter la page
window.addEventListener('beforeunload', function() {
    console.log('💾 Sauvegarde avant déchargement de la page...');
    sauvegarderDossiers();
});

// Gérer le cas où l'utilisateur recharge avec Ctrl+R
window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'r') {
        console.log('🔁 Ctrl+R détecté - sauvegarde immédiate');
        sauvegarderDossiers();
    }
});


// Créer l'interface d'un dossier
// === MODIFICATION de creerDossierInterface ===
// Créer l'interface d'un dossier
function creerDossier() {
    const nom = prompt("Nom du dossier :");
    if (!nom) return;
    
    // Vérifier si le dossier existe déjà
    if (document.querySelector(`[data-dossier='${nom}']`)) {
        alert("Ce dossier existe déjà !");
        return;
    }
    
    console.log('➕ Création nouveau dossier:', nom);
    
    // Créer le dossier vide
    creerDossierInterface(nom, []);
    
    // SAUVEGARDER IMMÉDIATEMENT
    sauvegarderDossiers();
    
    // Mettre à jour l'affichage si la gestion est ouverte
    if (document.getElementById("gestion-dossiers-container").style.display !== "none") {
        afficherGestionDossiers();
    }
    
    console.log('✅ Dossier créé et sauvegardé');
}




// Modifier la fonction supprimerDossier pour sauvegarder
// === MODIFICATION de supprimerDossier ===
// Modifier la fonction supprimerDossier
function supprimerDossier(nom) {
    const divTitle = document.querySelector(`.dossier-title[data-dossier="${nom}"]`);
    const divSubmenu = document.getElementById(nom + "-submenu");
    if (divTitle) divTitle.remove();
    if (divSubmenu) divSubmenu.remove();

    let dossiers = JSON.parse(localStorage.getItem("dossiers")) || [];
    dossiers = dossiers.filter(d => d !== nom);
    localStorage.setItem("dossiers", JSON.stringify(dossiers));
    localStorage.removeItem(`dossier_${nom}`);
}




function afficherGestionDossiers() {
    const gestionContainer = document.getElementById("gestion-dossiers-container");
    gestionContainer.innerHTML = ""; // vider l’ancien contenu
    gestionContainer.style.display = "block"; // afficher le conteneur

    let dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    if (!Array.isArray(dossiers)) dossiers = [];

    // Créer un bouton pour ajouter un nouveau dossier
    const btnAjouter = document.createElement("button");
    btnAjouter.textContent = "➕ Ajouter un dossier";
    btnAjouter.style.marginBottom = "10px";
    btnAjouter.onclick = () => ajouterDossier();
    gestionContainer.appendChild(btnAjouter);

    // Lister tous les dossiers existants avec bouton supprimer
    dossiers.forEach(dossier => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.marginBottom = "5px";
        
        const span = document.createElement("span");
        span.textContent = dossier;
        div.appendChild(span);

        const btnSupprimer = document.createElement("button");
        btnSupprimer.textContent = "Supprimer";
        btnSupprimer.onclick = () => supprimerDossier(dossier);
        div.appendChild(btnSupprimer);

        gestionContainer.appendChild(div);
    });
}







// Nouvelle fonction pour trouver tous les dossiers
function trouverTousLesDossiers() {
    const dossiers = [];
    const sidebar = document.getElementById('sidebarRuches');
    
    if (!sidebar) return dossiers;
    
    // Méthode 1: Par attribut data-dossier (idéal)
    const parDataAttribut = sidebar.querySelectorAll('[data-dossier]');
    parDataAttribut.forEach(el => {
        const nom = el.getAttribute('data-dossier');
        if (nom) dossiers.push(nom);
    });
    
    // Méthode 2: Par structure (fallback)
    if (dossiers.length === 0) {
        const tousLesDivs = sidebar.querySelectorAll('div');
        tousLesDivs.forEach(div => {
            // Chercher les divs qui ont un sous-menu (structure de dossier)
            if (div.textContent && div.textContent.trim() && 
                div.nextElementSibling && 
                div.nextElementSibling.classList.contains('submenu')) {
                dossiers.push(div.textContent.trim());
            }
        });
    }
    
    console.log("Dossiers trouvés:", dossiers);
    return dossiers;
}
// === INITIALISATION COMPLÈTE ===
function initializeApp() {
    console.log('🚀 Initialisation de l\'application...');
    
    try {
        // 1. Charger le thème
        chargerTheme();
        
        // 2. Charger les noms des ruchers
        chargerNomsRuchers();
        
        // 3. Ajouter le bouton paramètres
        ajouterBoutonParametres();
        
        // 4. ✅ RECONSTRUIRE LES DOSSIERS EN PREMIER
        reconstruireDossiers();
        
        // 5. Afficher le dashboard
        setTimeout(() => {
            afficherDashboard();
        }, 100);
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    }
}

// Écouteurs d'événements pour le chargement
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded');
    initializeApp();
});

window.addEventListener('load', function() {
    console.log('🖼️ Page complètement chargée');
    // Double vérification après le chargement complet
    setTimeout(reconstruireDossiers, 500);
});
// === FONCTIONS DE DEBUG ===
function debugDossiers() {
    console.log("=== DEBUG DOSSIERS ===");
    
    // 1. Vérifier localStorage
    const saved = localStorage.getItem("dossiersUtilisateur");
    console.log("LocalStorage dossiersUtilisateur:", saved);
    
    // 2. Vérifier tous les dossiers dans le DOM
    const allDossiers = document.querySelectorAll('.dossier-title[data-dossier]');
    console.log("Dossiers trouvés dans le DOM:", allDossiers.length);
    
    allDossiers.forEach((dossier, index) => {
        const nom = dossier.getAttribute('data-dossier');
        console.log(`Dossier ${index + 1}:`, nom);
    });
    
    // 3. Vérifier la sidebar
    const sidebar = document.getElementById('sidebarRuches');
    console.log("Sidebar trouvée:", !!sidebar);
    console.log("Contenu sidebar:", sidebar.innerHTML);
}
// Assurer que les dossiers sont reconstruits APRÈS le chargement du backend
function waitForBackendThenReconstruct() {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
        attempts++;
        const sidebar = document.getElementById('sidebarRuches');
        const dossiersBackend = sidebar ? sidebar.querySelectorAll('.dossier-title[data-dossier]') : [];
        
        if (dossiersBackend.length > 0 || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log('✅ Backend chargé, reconstruction des dossiers...');
            reconstruireDossiers();
        }
    }, 200);
}
function debugReconstruction() {
    console.log("=== DEBUG RECONSTRUCTION ===");
    
    const dossiersSauvegardes = chargerDossiers();
    console.log("📦 Dossiers sauvegardés:", dossiersSauvegardes);
    
    const dossiersDOM = document.querySelectorAll('.dossier-title[data-dossier]');
    console.log("🏷️ Dossiers dans le DOM:", dossiersDOM.length);
    
    dossiersDOM.forEach((dossier, index) => {
        const nom = dossier.getAttribute('data-dossier');
        console.log(`  ${index + 1}. ${nom}`);
    });
    
    console.log("=== FIN DEBUG ===");
}
function verifierSauvegarde() {
    console.log("=== VÉRIFICATION SAUVEGARDE ===");
    
    // 1. Vérifier ce qui est sauvegardé
    const sauvegarde = localStorage.getItem("dossiersUtilisateur");
    console.log("Sauvegarde brute:", sauvegarde);
    
    if (sauvegarde) {
        try {
            const parsed = JSON.parse(sauvegarde);
            console.log("Sauvegarde parsée:", parsed);
            console.log("Nombre de dossiers sauvegardés:", Object.keys(parsed).length);
        } catch (e) {
            console.error("Erreur parsing sauvegarde:", e);
        }
    }
    
    // 2. Vérifier la fonction chargerDossiers()
    const dossiersCharges = chargerDossiers();
    console.log("Dossiers chargés:", dossiersCharges);
}
function debugStructureDossiers() {
    console.log("=== DEBUG STRUCTURE DOSSIERS ===");
    
    const sidebar = document.getElementById('sidebarRuches');
    if (!sidebar) {
        console.error("❌ Sidebar non trouvée");
        return;
    }
    
    console.log("Contenu HTML de la sidebar:");
    console.log(sidebar.innerHTML);
    
    console.log("--- Tous les éléments dans sidebarRuches ---");
    const tousLesElements = sidebar.querySelectorAll('*');
    tousLesElements.forEach((element, index) => {
        if (element.className || element.id) {
            console.log(`${index}. Tag: ${element.tagName}, Class: "${element.className}", ID: "${element.id}", Text: "${element.textContent?.trim()}"`);
        }
    });
    
    console.log("--- Recherche spécifique des dossiers ---");
    
    // Méthode 1: Par classe
    const parClasse = sidebar.querySelectorAll('.dossier-title');
    console.log("Par classe '.dossier-title':", parClasse.length);
    
    // Méthode 2: Par attribut data-dossier
    const parDataAttribut = sidebar.querySelectorAll('[data-dossier]');
    console.log("Par attribut '[data-dossier]':", parDataAttribut.length);
    
    // Méthode 3: Par contenu texte
    const tousLesDivs = sidebar.querySelectorAll('div');
    const dossiersParTexte = Array.from(tousLesDivs).filter(div => 
        div.textContent && div.textContent.includes('zd') // Remplacez 'zd' par le nom de votre dossier
    );
    console.log("Divs contenant 'zd':", dossiersParTexte.length);
    
    dossiersParTexte.forEach((div, index) => {
        console.log(`Dossier ${index}:`, {
            classe: div.className,
            id: div.id,
            texte: div.textContent,
            parent: div.parentNode?.className
        });
    });
}
// ✅ Fonction de debug globale
function ajouterDossierInteractif(listeESP) {
    // Demander le nom du dossier
    const nomDossier = prompt("Entrez le nom du dossier :");

    if (!nomDossier) {
        alert("Nom de dossier invalide !");
        return;
    }

    // Récupération de la liste des dossiers existants
    let dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");

    // Ajouter le dossier si ce n'est pas déjà présent
    if (!dossiers.includes(nomDossier)) {
        dossiers.push(nomDossier);
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiers));
    }

    // Récupérer les ESP existants dans ce dossier
    let espExistants = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");

    // Ajouter les nouveaux ESP sans écraser les anciens
    const espMisesAJour = Array.from(new Set([...espExistants, ...listeESP]));

    // Sauvegarder la liste mise à jour
    localStorage.setItem("dossier_" + nomDossier, JSON.stringify(espMisesAJour));

    alert(`Dossier "${nomDossier}" créé avec ${listeESP.length} ESP`);
}
function creerNouveauDossier() {
    // Demander le nom du dossier
    const nomDossier = prompt("Entrez le nom du dossier :");

    if (!nomDossier || nomDossier.trim() === "") {
        alert("Nom de dossier invalide !");
        return;
    }

    // Récupérer la liste des dossiers existants
    let dossiersUtilisateur = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");

    // Ajouter le nouveau dossier si pas déjà présent
    if (!dossiersUtilisateur.includes(nomDossier)) {
        dossiersUtilisateur.push(nomDossier);
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiersUtilisateur));
    }

    // Créer la liste vide pour ce nouveau dossier
    let espExistants = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
    localStorage.setItem("dossier_" + nomDossier, JSON.stringify(espExistants));

    creerDossierInterface(nomDossier, espExistants);
    dev(`Dossier "${nomDossier}" créé`);
}
function afficherTousLesDossiers() {
    const sidebar = document.getElementById("sidebarRuches");
    if (!sidebar) return;
    sidebar.innerHTML = ""; // vider l’ancien contenu

    const dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    dossiers.forEach(nomDossier => {
        const ruches = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
        creerDossierInterface(nomDossier, ruches);
    });
}



// 🔹 Synchroniser les ESP : s'assure que chaque ESP du JSON est présent dans au moins un dossier

// ✅ Vérification que la page est bien prête

// Exécutez cette fonction et partagez-moi le résultat
// Appelez cette fonction après un rechargement pour voir ce qui se passe
// Dans initializeApp(), remplacez reconstruireDossiers() par :
waitForBackendThenReconstruct();
// Appel au chargement de la page
document.addEventListener('DOMContentLoaded', remplirSelectCartes);
document.addEventListener("DOMContentLoaded", renderDossiers);

// Initialisation
renderHives();
