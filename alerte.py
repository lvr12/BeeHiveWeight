import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ⚙️ Configuration email
EMAIL_SENDER = "alerte.ruche@gmail.com"
EMAIL_PASSWORD = "akcb fcgo ojns vqak"  # ⚠️ utiliser un mot de passe d'application si Gmail
EMAIL_RECEIVER = "quentin.kern57@gmail.com"



def envoyer_alerte(ancien_poids, nouveau_poids):
    variation = nouveau_poids - ancien_poids
    sujet = "🚨 Alerte poids ruche"
    message = f"""
    Alerte : le poids de la ruche a changé de {variation:.2f} kg
    Ancien poids : {ancien_poids:.2f} kg
    Nouveau poids : {nouveau_poids:.2f} kg
    """

    try:
        # Création de l’email
        msg = MIMEMultipart()
        msg["From"] = EMAIL_SENDER
        msg["To"] = EMAIL_RECEIVER
        msg["Subject"] = sujet
        msg.attach(MIMEText(message, "plain"))

        # Connexion au serveur SMTP Gmail
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)

        # Envoi du mail
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        server.quit()

        print("✅ Alerte envoyée avec succès par email !")

    except Exception as e:
        print("❌ Erreur lors de l’envoi du mail :", e)