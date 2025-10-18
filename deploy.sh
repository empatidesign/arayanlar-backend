#!/bin/bash

# Arayanvar Deployment Script
# Backend ve Web ayrı ayrı deploy edilebilir

set -e  # Hata durumunda script'i durdur

echo "🚀 Arayanvar Deployment Başlıyor..."

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Değişkenler
APP_NAME="arayanvar"
BASE_DIR="/var/www/arayanvar"
BACKEND_DIR="$BASE_DIR/arayanvar-backend"
WEB_DIR="$BASE_DIR/arayanvar-web"
NGINX_SITE="/etc/nginx/sites-available/arayanvar"
NGINX_ENABLED="/etc/nginx/sites-enabled/arayanvar"
LOG_DIR="/var/log/arayanvar"
BACKUP_DIR="/var/backups/arayanvar"

# Fonksiyonlar
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Root kontrolü
if [[ $EUID -ne 0 ]]; then
   print_error "Bu script root olarak çalıştırılmalıdır"
   exit 1
fi

# Parametreler
DEPLOY_TYPE=${1:-"all"}  # all, backend, web

case $DEPLOY_TYPE in
    "backend")
        print_status "Sadece Backend deploy ediliyor..."
        deploy_backend
        ;;
    "web")
        print_status "Sadece Web deploy ediliyor..."
        deploy_web
        ;;
    "all")
        print_status "Backend ve Web deploy ediliyor..."
        deploy_backend
        deploy_web
        ;;
    *)
        print_error "Geçersiz parametre. Kullanım: ./deploy.sh [backend|web|all]"
        exit 1
        ;;
esac

# Backend deployment fonksiyonu
deploy_backend() {
    print_status "Backend deployment başlıyor..."
    
    # Backend dizinine git
    cd $BACKEND_DIR
    
    # Git pull
    print_status "Backend kodu güncelleniyor..."
    git pull origin main
    
    # Dependencies yükle
    print_status "Backend dependencies yükleniyor..."
    npm install --production
    
    # Database migration (eğer varsa)
    if [ -f "run-migration.js" ]; then
        print_status "Database migration çalıştırılıyor..."
        node run-migration.js
    fi
    
    # PM2 restart
    print_status "Backend servisi yeniden başlatılıyor..."
    pm2 restart arayanvar-backend || pm2 start ecosystem.config.js --env production
    
    print_success "Backend deployment tamamlandı!"
}

# Web deployment fonksiyonu
deploy_web() {
    print_status "Web deployment başlıyor..."
    
    # Web dizinine git
    cd $WEB_DIR
    
    # Git pull
    print_status "Web kodu güncelleniyor..."
    git pull origin main
    
    # Dependencies yükle
    print_status "Web dependencies yükleniyor..."
    npm install
    
    # Build
    print_status "Web projesi build ediliyor..."
    npm run build
    
    # Build dosyalarının izinlerini ayarla
    chown -R www-data:www-data build/
    chmod -R 755 build/
    
    print_success "Web deployment tamamlandı!"
}

# Nginx reload
print_status "Nginx yeniden yükleniyor..."
nginx -t && systemctl reload nginx

print_success "🎉 Deployment başarıyla tamamlandı!"
print_status "Backend: http://yourdomain.com/api/"
print_status "Web: http://yourdomain.com/"