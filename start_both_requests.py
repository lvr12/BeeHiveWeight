import subprocess
import sys
import os

def start_both_requests():
    """Lance les deux programmes request en parallèle"""
    
    # Chemin vers les scripts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    request1_path = os.path.join(script_dir, "request.py")
    request2_path = os.path.join(script_dir, "request_2.py")
    
    print("🚀 Démarrage des deux programmes request...")
    print("📊 Rucher 1 : request.py → /add")
    print("📊 Rucher 2 : request_2.py → /add/rucher2")
    print("=" * 50)
    
    try:
        # Lancer request.py pour rucher 1
        process1 = subprocess.Popen([sys.executable, request1_path])
        print(f"✅ Rucher 1 démarré (PID: {process1.pid})")
        
        # Lancer request_2.py pour rucher 2
        process2 = subprocess.Popen([sys.executable, request2_path])
        print(f"✅ Rucher 2 démarré (PID: {process2.pid})")
        
        print("\n🔄 Les deux programmes sont en cours d'exécution...")
        print("💡 Appuyez sur Ctrl+C pour arrêter les deux programmes")
        
        # Attendre que les processus se terminent
        process1.wait()
        process2.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Arrêt des programmes...")
        try:
            process1.terminate()
            process2.terminate()
            print("✅ Programmes arrêtés avec succès")
        except:
            print("⚠️ Erreur lors de l'arrêt des programmes")
    except Exception as e:
        print(f"❌ Erreur : {e}")

if __name__ == "__main__":
    start_both_requests()