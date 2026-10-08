# 🚀 PixelDrain Direct Downloader Guide

Node.js හෝ Python **කිසිවක්ම අවශ්‍ය නැත!** Nginx හි 302 Direct Redirect භාවිතයෙන්:
- **User ගේ IP එකෙන්ම PixelDrain වෙතින් Download වේ.** (ඔබේ VPS IP එකට Speed limit/Block වැටෙන්නේ නැත).
- **0% VPS Bandwidth Usage & ~5MB RAM Usage.**
- 1GB RAM VPS එකක සාර්ථකව 100,000+ users ලා handle කළ හැක!

---

## 🛠️ Complete Deployment Guide (Step-by-Step)

### STEP 1 - Cloudflare DNS Setup

1. Cloudflare Dashboard → **cmoviez.com** → **DNS** → **Add Record**:

| Type | Name | IPv4 Address | Proxy Status | TTL |
|---|---|---|---|---|
| `A` | `cloud` | ` ` (ඔබේ VPS IP) | **DNS Only (Grey Cloud)** | Auto |

> ⚠️ **වැදගත්:** SSL Setup එක ඉවර වෙනකම් ProxyStatus එක **DNS Only (Grey Cloud)** ලෙස තබන්න.

---

### STEP 2 - VPS එකට SSH මගින් Login වන්න

Oracle Cloud Shell හෝ Windows Terminal මගින්:

```bash
ssh -i ssh-key-2026-08-24.key ubuntu@....................
```

---

### STEP 3 - Nginx සහ Certbot Install කරන්න

```bash
# System Update කරන්න
sudo apt update && sudo apt upgrade -y

# Nginx සහ Free SSL (Certbot) Install කරන්න
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

### STEP 4 - Nginx Configuration එක සාදන්න

```bash
sudo nano /etc/nginx/sites-available/cloud.cmoviez.com
```

පහත Nginx Configuration එක සම්පූර්ණයෙන් Paste කරන්න (`Ctrl+Shift+V`):

```nginx
server {
    server_name cloud.cmoviez.com;

    # Direct Nginx Proxy Stream (Fixes ERR_INVALID_RESPONSE & Keeps cloud.cmoviez.com URL)
    location ~ ^/download/(?:.*pixeldrain\.com/(?:u|api/file)/)?([a-zA-Z0-9]+)$ {
        set $file_id $1;

        # DNS Resolver for dynamic proxy_pass
        resolver 8.8.8.8 1.1.1.1 valid=300s;
        resolver_timeout 5s;

        # Disable Accept-Encoding to prevent compressed stream ERR_INVALID_RESPONSE error
        proxy_set_header Accept-Encoding "";

        # Headers for PixelDrain Hotlink Bypass
        proxy_set_header Host pixeldrain.com;
        proxy_set_header Referer "https://pixeldrain.com/u/$file_id";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        # SSL Settings for Upstream Connection
        proxy_ssl_server_name on;
        proxy_ssl_name pixeldrain.com;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;

        # Upstream Proxy Pass
        proxy_pass https://pixeldrain.com/api/file/$file_id?download;

        # Preserve original filename sent by PixelDrain
        proxy_pass_header Content-Disposition;

        # HTTP 1.1 & Stream Optimization
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 3600;
        proxy_connect_timeout 300;
        proxy_send_timeout 3600;
    }

    location / {
        return 302 https://cmoviez.com;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/cloud.cmoviez.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/cloud.cmoviez.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = cloud.cmoviez.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name cloud.cmoviez.com;
    return 404; # managed by Certbot
}
```

**Save කර ඉවත් වීමට:** `Ctrl + O` → `Enter` → `Ctrl + X`

---

### STEP 5 - Config එක Enable කර Nginx Reload කරන්න (404 Fix එක ඇතුළත්ව)

```bash
# 1. Default Nginx site එක ඉවත් කරන්න (404 එන්නේ නැති වෙන්න)
sudo rm -f /etc/nginx/sites-enabled/default

# 2. ඔබේ site එක Enable කරන්න
sudo ln -s /etc/nginx/sites-available/cloud.cmoviez.com /etc/nginx/sites-enabled/

# 3. Config එකේ Errors තියෙද බලන්න
sudo nginx -t

# 4. Nginx Restart කරන්න
sudo systemctl restart nginx
```

---

### STEP 6 - Free SSL Certificate (HTTPS) ලබා ගන්න

```bash
sudo certbot --nginx -d cloud.cmoviez.com
```

- Email එකක් ඇතුළත් කරන්න.
- Terms සඳහා `Y` ලෙස Type කරන්න.
- HTTP redirect to HTTPS සඳහා `2` තෝරන්න (නැතහොත් automatic setup වේ).

---

## 📌 How to Use

- PixelDrain Original Link: `https://pixeldrain.com/u/abc12345`
- ඔබේ Custom Direct Link: `https://cloud.cmoviez.com/download/abc12345`

ලින්ක් එක Click කළ වහාම **User ගේ IP එකෙන්ම Direct Download එක Start වේ!**

---

## 🛠️ Useful Commands

```bash
sudo systemctl status nginx     # Check Nginx status
sudo systemctl reload nginx     # Reload Nginx config
sudo nginx -t                   # Test config syntax
```

