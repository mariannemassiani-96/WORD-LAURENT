#!/bin/bash
set -e

echo "=== Déploiement CASAPERTURA sur serveur OVH ==="
echo ""

# 1. Mise à jour système
echo "[1/7] Mise à jour du système..."
apt update && apt upgrade -y

# 2. Installer Node.js 22 LTS
echo "[2/7] Installation de Node.js 22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi
echo "  Node.js $(node --version)"
echo "  npm $(npm --version)"

# 3. Installer Nginx
echo "[3/7] Installation de Nginx..."
apt install -y nginx
systemctl enable nginx

# 4. Installer les outils nécessaires
echo "[4/7] Installation de git et build-essential..."
apt install -y git build-essential python3

# 5. Cloner ou mettre à jour le repo
APP_DIR="/opt/casapertura"
echo "[5/7] Clonage du repo dans $APP_DIR..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone https://github.com/mariannemassiani-96/word-laurent.git "$APP_DIR"
    cd "$APP_DIR"
    git checkout main
fi

# Créer le dossier data pour SQLite
mkdir -p "$APP_DIR/data"

# 6. Installer les dépendances et builder
echo "[6/7] Installation des dépendances et build..."
cd "$APP_DIR"
npm ci
npm run build

# 7. Configurer le service systemd
echo "[7/7] Configuration du service..."
cat > /etc/systemd/system/casapertura.service << 'SERVICEEOF'
[Unit]
Description=CASAPERTURA - Générateur de devis
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/casapertura
ExecStart=/usr/bin/node /opt/casapertura/.next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Copier les fichiers statiques dans standalone
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
# Lien symbolique pour data (SQLite)
ln -sf /opt/casapertura/data /opt/casapertura/.next/standalone/data 2>/dev/null || true

systemctl daemon-reload
systemctl enable casapertura
systemctl restart casapertura

# Configurer Nginx
cat > /etc/nginx/sites-available/casapertura << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Activer le site
ln -sf /etc/nginx/sites-available/casapertura /etc/nginx/sites-enabled/casapertura
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

echo ""
echo "=== Déploiement terminé ! ==="
echo ""
echo "L'application est accessible sur : http://37.187.250.4"
echo ""
echo "Commandes utiles :"
echo "  systemctl status casapertura    # Voir le statut"
echo "  systemctl restart casapertura   # Redémarrer l'app"
echo "  journalctl -u casapertura -f    # Voir les logs"
echo ""
