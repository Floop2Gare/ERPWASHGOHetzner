# Restart Backend (texte)

- PM2 start (premier démarrage):
  - `pm2 start /srv/erp/BACK-END-ERP/venv/bin/uvicorn --name erp-back -- app.main:app --host 127.0.0.1 --port 8000 --workers 2`
  - `pm2 save`
- PM2 restart (mise à jour):
  - `pm2 restart erp-back`
  - `pm2 save`
