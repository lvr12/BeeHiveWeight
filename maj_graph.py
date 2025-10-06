import json
import os

def maj_graph():
    # Chemins des fichiers
    historique_file = "historique.json"
    derniere_valeurs_file = "static/dernieres_valeurs.json"

    # Créer le dossier static s'il n'existe pas
    os.makedirs(os.path.dirname(derniere_valeurs_file), exist_ok=True)

    # Lire l'historique complet
    if os.path.exists(historique_file):
        with open(historique_file, "r") as f:
            historique = json.load(f)
    else:
        historique = []

    # Garder les 10 dernières valeurs
    dernieres_valeurs = historique[-10:]

    # Écrire dans le fichier qui sera utilisé pour le graphique
    with open(derniere_valeurs_file, "w") as f:
        json.dump(dernieres_valeurs, f, indent=4)
