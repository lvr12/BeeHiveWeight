import requests
import time
import random

SERVER_URL = "http://127.0.0.1:62801"
#SERVER_URL = "https://bee.kernfam.synology.me"
LOGIN_URL = f"{SERVER_URL}/login"
ADD_URL = f"{SERVER_URL}/add/rucher2"  # Route spécifique pour rucher 2

username = "admin"
password = "admin"

while True:
    # Demande un nouveau token à chaque itération
    print(f"[RUCHER 2] Tentative de connexion à {LOGIN_URL} avec {username}/{password}")
    login_data = {
        "username": username,
        "password": password
    }
    response = requests.post(LOGIN_URL, json=login_data)
    print("[RUCHER 2] Réponse login status:", response.status_code)
    print("[RUCHER 2] Réponse login body:", response.text)

    if response.status_code != 200 or "access_token" not in response.json():
        print("[RUCHER 2] Erreur de connexion ou token non reçu !")
        time.sleep(5)
        continue

    access_token = response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Génération des valeurs aléatoires pour rucher 2 (plages différentes)
    faux_poids = round(random.uniform(45, 47), 2)      # Poids différent du rucher 1
    temperature = round(random.uniform(18, 28), 2)     # Température entre 18°C et 28°C
    humidite = round(random.uniform(40, 70), 2)        # Humidité entre 40% et 70%
    
    print(f"[RUCHER 2] Envoi des données :")
    print(f"  - Poids : {faux_poids} kg")
    print(f"  - Température : {temperature} °C")
    print(f"  - Humidité : {humidite} %")
    
    try:
        # Envoi des données au serveur rucher 2
        data = {
            "poids": faux_poids,
            "temperature": temperature,
            "humidite": humidite
        }
        r = requests.post(ADD_URL, json=data, headers=headers)
        print("[RUCHER 2] Réponse /add/rucher2 status:", r.status_code)
        print("[RUCHER 2] Réponse /add/rucher2 body:", r.text)
    except Exception as e:
        print("[RUCHER 2] Erreur lors de l'envoi :", e)
    time.sleep(7)  # Intervalle différent (7 secondes au lieu de 5)