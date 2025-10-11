from flask import Flask, request, session, redirect, url_for, render_template, jsonify
import json, os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "votre_cle_secrete"

ESP_FILE = "static/esp32.json"
HISTO_FILE = "historique/historique.json"

# --- Création des dossiers ---
os.makedirs("historique", exist_ok=True)
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# --- Gestion utilisateurs ---
def load_users():
    FICHIER_USERS = "users.json"
    if not os.path.exists(FICHIER_USERS):
        default_data = {"users": [{"username": "admin", "password": "admin"}]}
        with open(FICHIER_USERS, "w") as f:
            json.dump(default_data, f, indent=4)
    with open(FICHIER_USERS, "r") as f:
        data = json.load(f)
    return data["users"]

def check_credentials(username, password):
    for user in load_users():
        if user["username"] == username and user["password"] == password:
            return True
    return False

# --- Page de connexion ---
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if check_credentials(username, password):
            session["user"] = username
            return redirect(url_for("index"))
        else:
            return render_template("login.html", error="Identifiants incorrects")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

# --- Réception des données depuis l’ESP32 ---
@app.route("/send_data", methods=["POST"])
def receive_data():
    data = request.get_json()
    esp_id = data.get("id")
    esp_key = data.get("key")
    temperature = data.get("temperature")
    humidite = data.get("humidite")
    poids = data.get("poids")

    # Charger les clés ESP
    if os.path.exists(ESP_FILE):
        with open(ESP_FILE, "r") as f:
            esp_dict = json.load(f)
    else:
        esp_dict = {}

    # Vérifier clé
    if esp_id not in esp_dict or esp_dict[esp_id] != esp_key:
        return jsonify({"success": False, "error": "Clé invalide"}), 401

    # Enregistrer dans l’historique
    if os.path.exists(HISTO_FILE):
        with open(HISTO_FILE, "r") as f:
            historique = json.load(f)
    else:
        historique = []

    entree = {
        "esp_id": esp_id,
        "temperature": temperature,
        "humidite": humidite,
        "poids": poids,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    historique.append(entree)

    with open(HISTO_FILE, "w") as f:
        json.dump(historique, f, indent=4)

    return jsonify({"success": True})

# --- Page principale ---
@app.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("login"))

    if os.path.exists(HISTO_FILE):
        with open(HISTO_FILE, "r") as f:
            data = json.load(f)
        dernieres_donnees = data[-10:]  # dernières 10 lignes
    else:
        dernieres_donnees = []

    return render_template("index.html", donnees=dernieres_donnees)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=62801, debug=True)
