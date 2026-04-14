#!/bin/bash
set -e

echo "=== Mise à jour CASAPERTURA ==="
cd /opt/casapertura

echo "[1/4] Pull des dernières modifications..."
git pull origin main

echo "[2/4] Installation des dépendances..."
npm ci

echo "[3/4] Build..."
npm run build

echo "[4/4] Copie des fichiers statiques et redémarrage..."
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
ln -sf /opt/casapertura/data /opt/casapertura/.next/standalone/data 2>/dev/null || true

systemctl restart casapertura

echo ""
echo "=== Mise à jour terminée ! ==="
echo "Vérification : systemctl status casapertura"
systemctl status casapertura --no-pager | head -5
