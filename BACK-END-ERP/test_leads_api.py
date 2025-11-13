"""
Script de test simple pour valider les endpoints Leads
À exécuter avec le serveur backend démarré
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/leads"

def test_create_lead():
    """Test création d'un lead"""
    print("🧪 Test création lead...")
    payload = {
        "name": "Test Lead",
        "email": f"test-{datetime.now().timestamp()}@example.com",
        "phone": "+33612345678",
        "company": "Test Company",
        "source": "Site web",
        "status": "Nouveau",
        "owner": "Adrien",
        "segment": "Pro local",
        "tags": ["test"],
        "activities": []
    }
    response = requests.post(f"{BASE_URL}/", json=payload)
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 201]:
        data = response.json()
        print(f"   ✅ Lead créé: {data.get('data', {}).get('id', 'N/A')}")
        return data.get('data', {}).get('id')
    else:
        print(f"   ❌ Erreur: {response.text}")
        return None

def test_get_leads():
    """Test récupération des leads"""
    print("🧪 Test récupération leads...")
    response = requests.get(f"{BASE_URL}/")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✅ {count} leads récupérés")
        return True
    else:
        print(f"   ❌ Erreur: {response.text}")
        return False

def test_update_lead(lead_id):
    """Test mise à jour d'un lead"""
    if not lead_id:
        print("   ⏭️  Skippé (pas de lead_id)")
        return False
    print(f"🧪 Test mise à jour lead {lead_id}...")
    payload = {
        "status": "En cours",
        "source": "Site web (modifié)"
    }
    response = requests.put(f"{BASE_URL}/{lead_id}", json=payload)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Lead mis à jour")
        return True
    else:
        print(f"   ❌ Erreur: {response.text}")
        return False

def test_delete_lead(lead_id):
    """Test suppression d'un lead"""
    if not lead_id:
        print("   ⏭️  Skippé (pas de lead_id)")
        return False
    print(f"🧪 Test suppression lead {lead_id}...")
    response = requests.delete(f"{BASE_URL}/{lead_id}")
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 204]:
        print(f"   ✅ Lead supprimé")
        return True
    else:
        print(f"   ❌ Erreur: {response.text}")
        return False

def main():
    print("=" * 50)
    print("TEST DES ENDPOINTS LEADS")
    print("=" * 50)
    print()
    
    # Test création
    lead_id = test_create_lead()
    print()
    
    # Test récupération
    test_get_leads()
    print()
    
    # Test mise à jour
    test_update_lead(lead_id)
    print()
    
    # Test suppression
    test_delete_lead(lead_id)
    print()
    
    print("=" * 50)
    print("TESTS TERMINÉS")
    print("=" * 50)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ ERREUR: Impossible de se connecter au serveur backend")
        print("   Assurez-vous que le serveur est démarré sur http://localhost:8000")
        print("   Commande: uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ ERREUR: {e}")










