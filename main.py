from flask import Flask, request, session, redirect, url_for, render_template, jsonify, send_from_directory
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "votre_cle_secrete"

# --- Répertoires ---
HISTORIQUE_DIRS = os.path.join(os.getcwd(), "historique")
HISTO_DIR = "historique"
ESP_FILE = "static/esp32.json"
if not os.path.exists(HISTO_DIR):
    os.makedirs(HISTO_DIR)

# --- Auth simple ---
def load_users():
    FICHIER_USERS = "users.json"
    if not os.path.exists(FICHIER_USERS):
        default_data = {"users": [{"username": "admin", "password": "admin"}]}
        with open(FICHIER_USERS, "w") as f:
            json.dump(default_data, f, indent=4)
        return default_data["users"]
    with open(FICHIER_USERS, "r") as f:
        data = json.load(f)
        return data.get("users", [])

def check_credentials(username, password):
    users = load_users()
    for user in users:
        if user["username"] == username and user["password"] == password:
            return True
    return False

@app.route("/login", methods=["GET", "POST"])
def login():
    from flask import flash, render_template
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if check_credentials(username, password):
            session["user"] = username
            return redirect(url_for("index"))
        else:
            flash("Identifiants incorrects.", "error")
            return render_template("login.html", error="Identifiants incorrects")
    return render_template("login.html")
@app.route("/add/<esp_id>", methods=["POST"])
def add_esp(esp_id):
    # Charger les ESP autorisés depuis static/esp32.json
    ESP_PATH = os.path.join("static", "esp32.json")
    if not os.path.exists(ESP_PATH):
        return "Fichier esp32.json manquant", 500

    with open(ESP_PATH, "r") as f:
        esp_tokens = json.load(f)

    # Vérifier si l'ESP est autorisé
    if esp_id not in esp_tokens:
        return "ESP non autorisé", 401

    # Récupérer les données envoyées par l'ESP
    data = request.get_json()
    token = data.get("token")
    if token != esp_tokens[esp_id]:
        return "Token invalide", 401

    poids = data.get("poids")
    temperature = data.get("temperature")
    humidite = data.get("humidite")

    # Définir le fichier historique spécifique à cet ESP
    filename = os.path.join("historique", f"historique_{esp_id}.json")

    # Charger ou créer l'historique
    if os.path.exists(filename):
        with open(filename, "r") as f:
            historique = json.load(f)
    else:
        historique = []

    # Ajouter la nouvelle entrée
    historique.append({
        "poids": poids,
        "temperature": temperature,
        "humidite": humidite,
        "heure": datetime.now().isoformat()
    })

    # Sauvegarder l'historique
    with open(filename, "w") as f:
        json.dump(historique, f, indent=4)

    return jsonify({"message": "Données ajoutées avec succès"}), 200
@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

# --- Page principale ---
@app.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("login"))

    # --- Charger ESP depuis le fichier ---
    if os.path.exists(ESP_FILE):
        with open(ESP_FILE, "r") as f:
            esp_tokens = json.load(f)
    else:
        esp_tokens = {}

    # --- Créer un dossier "Mes ESP" pour la sidebar ---
    dossiers_dict = {"Mes ESP": list(esp_tokens.keys())}

    # --- Charger historiques ---
    dernieres_valeurs_dict = {}
    for esp_id in esp_tokens.keys():
        filename = os.path.join(HISTO_DIR, f"historique_{esp_id}.json")
        if not os.path.exists(filename):
            with open(filename, "w") as f:
                json.dump([], f, indent=4)
        with open(filename, "r") as f:
            historique = json.load(f)
        dernieres_valeurs_dict[esp_id] = historique[-10:]

    return render_template(
        "index.html",
        dernieres_valeurs_dict=dernieres_valeurs_dict,
        dossiers_dict=dossiers_dict,
        esp_tokens=esp_tokens
    )
@app.route("/historique/<filename>")
def historique(filename):
    return send_from_directory(HISTORIQUE_DIRS, filename)
# --- Ajouter un ESP ---
@app.route("/add_esp32", methods=["POST"])
def add_esp32_json():
    if "user" not in session:
        return jsonify({"success": False, "error": "Non autorisé"}), 401

    data = request.get_json()
    esp_id = data.get("id")
    esp_key = data.get("key")

    if not esp_id or not esp_key:
        return jsonify({"success": False, "error": "Champs manquants"}), 400

    # Charger ESP existants
    if os.path.exists(ESP_FILE):
        with open(ESP_FILE, "r") as f:
            esp_dict = json.load(f)
    else:
        esp_dict = {}

    # Ajouter ou mettre à jour l'ESP
    esp_dict[esp_id] = esp_key

    # Sauvegarder
    with open(ESP_FILE, "w") as f:
        json.dump(esp_dict, f, indent=4)

    return jsonify({"success": True})
@app.route("/delete_esp32", methods=["POST"])
def delete_esp32():
    if "user" not in session:
        return jsonify({"success": False, "error": "Non autorisé"}), 401

    data = request.get_json()
    esp_id = data.get("id")
    if not esp_id:
        return jsonify({"success": False, "error": "ID manquant"}), 400

    # Charger ESP existants
    if os.path.exists(ESP_FILE):
        with open(ESP_FILE, "r") as f:
            esp_dict = json.load(f)
    else:
        esp_dict = {}

    # Supprimer ESP
    if esp_id in esp_dict:
        del esp_dict[esp_id]
        with open(ESP_FILE, "w") as f:
            json.dump(esp_dict, f, indent=4)
        return jsonify({"success": True})

    return jsonify({"success": False, "error": "ESP introuvable"}), 404
@app.route("/delete_dossier", methods=["POST"])
def delete_dossier():
    if "user" not in session:
        return jsonify({"success": False, "error": "Non autorisé"}), 401

    data = request.get_json()
    dossier = data.get("dossier")

    if not dossier:
        return jsonify({"success": False, "error": "Nom manquant"}), 400

    # --- Ici tu modifies ta logique de stockage ---
    # Ex : si tu utilises un fichier dossiers.json
    FICHIER = "dossiers.json"
    if os.path.exists(FICHIER):
        with open(FICHIER, "r") as f:
            data_json = json.load(f)
    else:
        data_json = {}

    if dossier in data_json:
        del data_json[dossier]
        with open(FICHIER, "w") as f:
            json.dump(data_json, f, indent=4)
        return jsonify({"success": True})

    return jsonify({"success": False, "error": "Dossier introuvable"}), 404

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=62801, debug=True)
