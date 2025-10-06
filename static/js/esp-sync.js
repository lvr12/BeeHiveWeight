// ==========================
// esp-sync.js - Gestion Dossiers & ESP
// ==========================

// Crée un dossier dans la sidebar
function ajouterDossierAvecESP(nomDossier, listeESP = []) {
    if (!nomDossier || nomDossier.trim() === "") return;

    // Mettre à jour la liste de tous les dossiers
    let dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    if (!dossiers.includes(nomDossier)) {
        dossiers.push(nomDossier);
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiers));
    }

    // Mettre à jour la liste des ESP
    let espExistants = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
    const espMisesAJour = Array.from(new Set([...espExistants, ...listeESP]));
    localStorage.setItem("dossier_" + nomDossier, JSON.stringify(espMisesAJour));

    // Mettre à jour l'affichage via la fonction déjà présente dans app.js
    creerDossierInterface(nomDossier, espMisesAJour);
}
// Toggle affichage du sous-menu
function toggleDossier(submenuId) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    submenu.style.display = submenu.style.display === "none" ? "block" : "none";
}

// Afficher tous les dossiers depuis localStorage
function afficherTousLesDossiers() {
    const sidebar = document.getElementById("sidebarRuches");
    if (!sidebar) return;
    sidebar.innerHTML = "";

    const dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    dossiers.forEach(nomDossier => {
        const ruches = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
        creerDossierInterface(nomDossier, ruches);
    });
}

// Créer un nouveau dossier via prompt
function ajouterDossier() {
    const nomDossier = prompt("Entrez le nom du dossier :");
    if (!nomDossier || nomDossier.trim() === "") {
        alert("Nom de dossier invalide !");
        return;
    }

    ajouterDossierAvecESP(nomDossier, []); // Pas d'ESP au départ
}

// Ajouter un dossier avec ESP (préserve les anciens ESP)
function ajouterDossierAvecESP(nomDossier, listeESP = []) {
    if (!nomDossier || nomDossier.trim() === "") return;

    // 1️⃣ Mettre à jour la liste de tous les dossiers
    let dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
    if (!dossiers.includes(nomDossier)) {
        dossiers.push(nomDossier);
        localStorage.setItem("dossiers_utilisateur", JSON.stringify(dossiers));
    }

    // 2️⃣ Mettre à jour la liste des ESP du dossier
    let espExistants = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
    const espMisesAJour = Array.from(new Set([...espExistants, ...listeESP]));
    localStorage.setItem("dossier_" + nomDossier, JSON.stringify(espMisesAJour));

    // 3️⃣ Mettre à jour l'affichage
    afficherTousLesDossiers();
}

// Synchroniser les ESP depuis le JSON et créer le dossier "ESP manquants"
async function synchroniserESP() {
    try {
        const res = await fetch("/static/esp32.json");
        if (!res.ok) throw new Error("Erreur fetch esp32.json");
        const data = await res.json();
        const espIds = Object.keys(data);

        // Identifier tous les ESP déjà classés
        const dossiers = JSON.parse(localStorage.getItem("dossiers_utilisateur") || "[]");
        const dejaClasses = new Set();
        dossiers.forEach(nomDossier => {
            const espListe = JSON.parse(localStorage.getItem("dossier_" + nomDossier) || "[]");
            espListe.forEach(id => dejaClasses.add(id));
        });

        // ESP manquants
        const manquants = espIds.filter(id => !dejaClasses.has(id));
        if (manquants.length > 0) {
            ajouterDossierAvecESP("ESP manquants", manquants);
        }

    } catch (err) {
        console.error("[ERREUR] synchroniserESP :", err);
    }
}

// ==========================
// Drag & Drop
// ==========================
function startDrag(e, espId) {
    e.dataTransfer.setData("text/plain", espId);
}

function dropESP(e, nomDossier) {
    e.preventDefault();
    const espId = e.dataTransfer.getData("text/plain");
    ajouterDossierAvecESP(nomDossier, [espId]);
}

// ==========================
// Initialisation au chargement
// ==========================
window.addEventListener("DOMContentLoaded", () => {
    afficherTousLesDossiers();
    synchroniserESP();
});
