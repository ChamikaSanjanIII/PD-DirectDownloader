# ⚡ Pixeldrain Direct Streamer & Custom Subdomain Downloader

High-performance, **Zero-Dependency** direct streaming proxy for Pixeldrain files. 
Data streams byte-by-byte through your VPS straight to the user without server disk caching limits.

---

## 📁 VPS එකට Upload කළ යුතු Files (Files to Upload)

මෙම project එක **Pure Native Node.js (Zero External Dependencies)** මගින් සකසා ඇති නිසා VPS එක තුළ `npm install` කිරීමට අවශ්‍ය නොවේ!

**VPS එකට Upload කළ යුත්තේ පහත Files/Folders පමණි:**
- 📄 `server.js`
- 📁 `public/` (index.html, preview.html, style.css, app.js ඇතුළත් folder එක)

---

## 🚀 Step-by-Step VPS Deployment Guide

### 1. VPS එක තුළ App එක Setup කිරීම

`/var/www` folder එක තුළ `Permission denied` error එක පැමිණේ නම්, **`sudo` permission ලබා දෙන්න** හෝ **Owner එක වෙනස් කරන්න**:

```bash
# 1. /var/www folder එකට ඔබේ User (ubuntu) ට Write Permission ලබා දීම:
sudo chown -R $USER:$USER /var/www

# 2. /var/www වෙත ගොස් Git Repository එක Clone කිරීම:
cd /var/www
git clone https://github.com/ChamikaSanjanIII/PD-DirectDownloader.git
cd PD-DirectDownloader
```

*(නැතහොත් Home directory එකේ clone කිරීමට: `cd ~ && git clone https://github.com/ChamikaSanjanIII/PD-DirectDownloader.git`)*

---

### 2. PM2 24/7 Background Service එක මගින් `server.js` Start කිරීම

Project folder එක තුළ සිට පහත පරිදි `server.js` start කරන්න:

```bash
# PM2 globally install කිරීම (VPS එකේ නොමැති නම් පමණක්)
sudo npm install -g pm2

# server.js 24/7 background process එකක් ලෙස start කිරීම:
pm2 start server.js --name "cmoviez-streamer"

# VPS Reboot/Restart වුවද ඉබේම server.js start වීමට setup කිරීම:
pm2 startup
pm2 save
```

*(නැතහොත් PM2 නොමැතිව direct run කිරීමට: `node server.js`)*

---

### 2. Cloudflare / DNS Settings

ඔබේ Domain Registrar (Cloudflare, Namecheap, etc.) තුළ A Records 2ක් එකතු කරන්න:

| Type | Name | IPv4 Address (Target) | Proxy Status |
| :--- | :--- | :--- | :--- |
| **A** | `cloud` | `YOUR_VPS_IP` | Proxied (Orange) or DNS Only |
| **A** | `stream` | `YOUR_VPS_IP` | Proxied (Orange) or DNS Only |

---

### 3. Nginx Reverse Proxy & SSL (HTTPS) Setup

#### Step 3.1: Direct Download Subdomain Setup (`cloud.cmoviez.com`)

1. VPS Terminal එකේ File එක සාදන්න:
   ```bash
   sudo nano /etc/nginx/sites-available/cloud.cmoviez.com
   ```

2. පහත Config එක එකතු කර Save කරන්න (`Ctrl + O` -> `Enter` -> `Ctrl + X`):
   ```nginx
   server {
       listen 80;
       server_name cloud.cmoviez.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;

           # Disable response buffering for instant streaming
           proxy_buffering off;
           proxy_read_timeout 86400s;
       }
   }
   ```

---

#### Step 3.2: Live Stream / Preview Subdomain Setup (`stream.cmoviez.com`)

1. VPS Terminal එකේ දෙවන File එක සාදන්න:
   ```bash
   sudo nano /etc/nginx/sites-available/stream.cmoviez.com
   ```

2. පහත Config එක එකතු කර Save කරන්න (`Ctrl + O` -> `Enter` -> `Ctrl + X`):
   ```nginx
   server {
       listen 80;
       server_name stream.cmoviez.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;

           # Disable response buffering for instant video streaming
           proxy_buffering off;
           proxy_read_timeout 86400s;
       }
   }
   ```

---

#### Step 3.3: Enable Nginx Files & Reload

```bash
# Nginx site configurations Link කිරීම
sudo ln -s /etc/nginx/sites-available/cloud.cmoviez.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/stream.cmoviez.com /etc/nginx/sites-enabled/

# Nginx Syntax පරික්ෂාව සහ Reload කිරීම
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 3.4: Free SSL (Certbot HTTPS) සක්‍රීය කිරීම
```bash
sudo certbot --nginx -d cloud.cmoviez.com -d stream.cmoviez.com
```

---

## 🔗 URL Formats (භාවිත වන ආකාරය)

### 📥 Direct File Download (`cloud.cmoviez.com`):
```text
https://cloud.cmoviez.com/download/FILE_ID
```
*(උදා: `https://cloud.cmoviez.com/download/rn6utFzW`)*
- Direct Attachment Save: බ්‍රවුසර් එකෙන් හෝ Phone එකෙන් Click කළ සැනින්ම File එක Save වේ.

### 👁️ Live Media Preview & Stream (`stream.cmoviez.com`):
```text
https://stream.cmoviez.com/stream/FILE_ID
```
*(උදා: `https://stream.cmoviez.com/stream/rn6utFzW`)*
- Mobile/Browser එක තුළ වීඩියෝව හෝ ඕඩියෝව Direct Play කර නරඹයි.

---

## 🛠️ Local Testing (PC එකේදී)

```bash
node server.js
```
- Direct Download Test: `http://localhost:3000/download/FILE_ID`
- Direct Stream Test: `http://localhost:3000/stream/FILE_ID`
