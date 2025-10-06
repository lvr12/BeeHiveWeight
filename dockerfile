# Étape 1 : Utiliser une image de base Python
FROM python:3.11-slim

# Étape 2 : Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Étape 3 : Copier les fichiers nécessaires dans le conteneur
COPY . .

# Étape 4 : Mettre à jour pip et installer les dépendances
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Étape 5 : Exposer le port utilisé par l'application
EXPOSE 62801
# Étape 6 : Définir la commande par défaut pour exécuter l'application
CMD ["python", "main.py"]
