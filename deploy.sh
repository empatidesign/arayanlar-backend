#!/bin/bash

# Arayanvar Backend Deployment Script
# AlmaLinux 9 için hazırlanmıştır

set -e  # Hata durumunda script'i durdur

echo "🚀 Arayanvar Backend Deployment Başlıyor..."

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Değişkenler
APP_NAME="arayanvar-backend"
APP_DIR="/var/www/arayanvar"
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

# Sistem güncellemesi
print_status "Sistem güncelleniyor..."
dnf update -y

# Node.js ve npm kurulumu
print_status "Node.js kurulumu kontrol ediliyor..."
if ! command -v node &> /dev/null; then
    print_status "Node.js kuruluyor..."
    dnf module install -y nodejs:18/common
    dnf install -y npm
else
    print_success "Node.js zaten kurulu: $(node --version)"
fi

# PostgreSQL kurulumu
print_status "PostgreSQL kurulumu kontrol ediliyor..."
if ! command -v psql &> /dev/null; then
    print_status "PostgreSQL kuruluyor..."
    dnf install -y postgresql postgresql-server postgresql-contrib
    postgresql-setup --initdb
    systemctl enable postgresql
    systemctl start postgresql
else
    print_success "PostgreSQL zaten kurulu"
fi

# Nginx kurulumu
print_status "Nginx kurulumu kontrol ediliyor..."
if ! command -v nginx &> /dev/null; then
    print_status "Nginx kuruluyor..."
    dnf install -y nginx
    systemctl enable nginx
else
    print_success "Nginx zaten kurulu"
fi

# PM2 kurulumu
print_status "PM2 kurulumu kontrol ediliyor..."
if ! command -v pm2 &> /dev/null; then
    print_status "PM2 kuruluyor..."
    npm install -g pm2
    pm2 startup
else
    print_success "PM2 zaten kurulu"
fi

# Certbot kurulumu (SSL için)
print_status "Certbot kurulumu kontrol ediliyor..."
if ! command -v certbot &> /dev/null; then
    print_status "Certbot kuruluyor..."
    dnf install -y certbot python3-certbot-nginx
else
    print_success "Certbot zaten kurulu"
fi

# Uygulama dizini oluşturma
print_status "Uygulama dizini oluşturuluyor..."
mkdir -p $APP_DIR
mkdir -p $LOG_DIR
mkdir -p $BACKUP_DIR
mkdir -p $APP_DIR/uploads

# Log dizini izinleri
chown -R nginx:nginx $LOG_DIR
chmod 755 $LOG_DIR

# Uploads dizini izinleri
chown -R nginx:nginx $APP_DIR/uploads
chmod 755 $APP_DIR/uploads

# Git repository klonlama (eğer yoksa)
if [ ! -d "$APP_DIR/.git" ]; then
    print_status "Git repository klonlanıyor..."
    read -p "Git repository URL'sini girin: " REPO_URL
    git clone $REPO_URL $APP_DIR
else
    print_status "Mevcut kod güncelleniyor..."
    cd $APP_DIR
    git pull origin main
fi

cd $APP_DIR

# Dependencies kurulumu
print_status "Dependencies kuruluyor..."
npm install --production

# Environment dosyası kopyalama
if [ ! -f ".env" ]; then
    print_status "Environment dosyası oluşturuluyor..."
    cp .env.production .env
    print_warning "Lütfen .env dosyasındaki değerleri güncelleyin!"
fi

# Database oluşturma
print_status "Database kurulumu..."
sudo -u postgres psql -c "CREATE DATABASE arayanvar_prod;" 2>/dev/null || print_warning "Database zaten mevcut"
sudo -u postgres psql -c "CREATE USER arayanvar_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || print_warning "User zaten mevcut"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE arayanvar_prod TO arayanvar_user;" 2>/dev/null

# Migration çalıştırma (eğer varsa)
if [ -f "run-migration.js" ]; then
    print_status "Database migration çalıştırılıyor..."
    node run-migration.js
fi

# Nginx konfigürasyonu
print_status "Nginx konfigürasyonu ayarlanıyor..."
cp nginx.conf $NGINX_SITE

# Sites-enabled dizini oluşturma (eğer yoksa)
mkdir -p /etc/nginx/sites-enabled

# Symlink oluşturma
ln -sf $NGINX_SITE $NGINX_ENABLED

# Nginx test
nginx -t
if [ $? -eq 0 ]; then
    print_success "Nginx konfigürasyonu geçerli"
else
    print_error "Nginx konfigürasyonu hatalı!"
    exit 1
fi

# PM2 ile uygulamayı başlatma
print_status "Uygulama PM2 ile başlatılıyor..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# Firewall ayarları
print_status "Firewall ayarları yapılıyor..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# Servisleri başlatma
print_status "Servisler başlatılıyor..."
systemctl restart nginx
systemctl restart postgresql

# SSL sertifikası kurulumu
print_warning "SSL sertifikası için aşağıdaki komutu çalıştırın:"
echo "certbot --nginx -d yourdomain.com -d www.yourdomain.com"

# Logrotate konfigürasyonu
print_status "Log rotation ayarlanıyor..."
cat > /etc/logrotate.d/arayanvar << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Cron job için PM2 resurrect
print_status "PM2 auto-start ayarlanıyor..."
(crontab -l 2>/dev/null; echo "@reboot pm2 resurrect") | crontab -

print_success "🎉 Deployment tamamlandı!"
echo ""
echo "📋 Yapılacaklar:"
echo "1. .env dosyasındaki değerleri güncelleyin"
echo "2. PostgreSQL şifresini değiştirin"
echo "3. Domain adınızı nginx.conf'ta güncelleyin"
echo "4. SSL sertifikası kurun: certbot --nginx -d yourdomain.com"
echo "5. PM2 durumunu kontrol edin: pm2 status"
echo "6. Nginx durumunu kontrol edin: systemctl status nginx"
echo ""
echo "🔗 Faydalı komutlar:"
echo "- PM2 logs: pm2 logs"
echo "- PM2 restart: pm2 restart $APP_NAME"
echo "- Nginx reload: systemctl reload nginx"
echo "- Nginx logs: tail -f /var/log/nginx/arayanvar_error.log"