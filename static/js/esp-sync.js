

// ---------------------------
// Fonction debug
// ---------------------------
function dev(msg, data = null) {
    if (data !== null) console.log("[DEV]", msg, data);
    else console.log("[DEV]", msg);
}

// ---------------------------
// Toggle dossier
// ---------------------------
function toggleDossier(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    submenu.style.display = submenu.style.display === "none" ? "block" : "none";
}

// ---------------------------
// Créer un dossier dans la sidebar
// ---------------------------
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

    // === ici ===
    (ruches || []).forEach(espId => {
        const espDiv = document.createElement("div");
        espDiv.className = "menu-item";
        espDiv.id = espId + "-title";
        espDiv.draggable = true;
        espDiv.ondragstart = e => startDrag(e, espId);
        espDiv.textContent = espId;
        divSubmenu.appendChild(espDiv);
    });
}

// ---------------------------
// Synchroniser ESP manquants
// ---------------------------
async function synchroniserESP() {
    dev("synchroniserESP démarrée");

    try {
        // Récupération des ESP depuis le JSON
        const res = await fetch("/static/esp32.json");
        if (!res.ok) throw new Error("Erreur fetch esp32.json");
        const data = await res.json();
        const espIds = Object.keys(data);

        // Récupération de la liste des dossiers (liste de noms)
        let dossiersUtilisateur = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");

        // Récupération des ESP déjà classés
        let dejaClasses = new Set();
        dossiersUtilisateur.forEach(nomDossier => {
            const espListe = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
            espListe.forEach(id => dejaClasses.add(id));
        });

        // ESP manquants
        const manquants = espIds.filter(id => !dejaClasses.has(id));
        dev("ESP manquants :", manquants);

        if (manquants.length > 0) {
            // Ajouter le dossier "ESP manquants" si ce n'est pas déjà présent
            if (!dossiersUtilisateur.includes("ESP manquants")) {
                dossiersUtilisateur.push("ESP manquants");
                localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiersUtilisateur));
            }

            // Stocker les ESP manquants dans leur propre liste
            localStorage.setItem("dossier_espmanquants", JSON.stringify(manquants));

            creerDossierInterface("ESP manquants", manquants);
            dev("Dossier 'ESP manquants' créé et stocké dans dossier_espmanquants");
        }

    } catch (err) {
        console.error("[ERREUR] synchroniserESP :", err);
    }
}




// ---------------------------
// Lancement automatique
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
    synchroniserESP();
});
