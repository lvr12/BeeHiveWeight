import requests
import time
import random

#SERVER_URL = "http://127.0.0.1:62801"
SERVER_URL = "https://bee.kernfam.synology.me"
LOGIN_URL = f"{SERVER_URL}/login"
ADD_URL = f"{SERVER_URL}/add"

username = "admin"
password = "admin"

while True:
    # Demande un nouveau token à chaque itération
    print(f"Tentative de connexion à {LOGIN_URL} avec {username}/{password}")
    login_data = {
        "username": username,
        "password": password
    }
    response = requests.post(LOGIN_URL, json=login_data)
    print("Réponse login status:", response.status_code)
    print("Réponse login body:", response.text)

    if response.status_code != 200 or "access_token" not in response.json():
        print("Erreur de connexion ou token non reçu !")
        time.sleep(5)
        continue

    access_token = response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    # Génération des valeurs aléatoires
    faux_poids = round(random.uniform(50, 51), 2)
    temperature = round(random.uniform(15, 35), 2)  # Température entre 15°C et 35°C
    humidite = round(random.uniform(30, 80), 2)     # Humidité entre 30% et 80%
    
    print(f"Envoi des données :")
    print(f"  - Poids : {faux_poids} kg")
    print(f"  - Température : {temperature} °C")
    print(f"  - Humidité : {humidite} %")
    
    try:
        # Envoi des données au serveur (main.py se charge du JSON)
        data = {
            "poids": faux_poids,
            "temperature": temperature,
            "humidite": humidite
        }
        r = requests.post(ADD_URL, json=data, headers=headers)
        print("Réponse /add status:", r.status_code)
        print("Réponse /add body:", r.text)
    except Exception as e:
        print("Erreur lors de l'envoi :", e)
    time.sleep(5)