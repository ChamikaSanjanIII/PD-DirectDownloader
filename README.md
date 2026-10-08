# 🚀 PixelDrain Direct Downloader (Nginx 302 Redirect - Ultra Lightweight!)

Node.js හෝ Python **කිසිවක්ම අවශ්‍ය නැත!** Nginx හි 302 Direct Redirect භාවිතයෙන්:
- **User ගේ IP එකෙන්ම PixelDrain වෙතින් Download වේ.** (ඔබේ VPS IP එකට Speed limit/Block වැටෙන්නේ නැත).
- **0% VPS Bandwidth Usage & ~5MB RAM Usage.**
- 1GB RAM VPS එකක සාර්ථකව 100,000+ users ලා handle කළ හැක!

---

## How It Works

```
User Click Link (cloud.cmoviez.com/download/FILE_ID)
       ↓
Nginx Instant 302 Redirect
       ↓
User Browser downloads directly from PixelDrain (User's IP)
```

---

## STEP 1 - Cloudflare DNS Setup

1. Cloudflare Dashboard → **cmoviez.com** → **DNS** → **Add Record**:

| Type | Name | IPv4 Address | Proxy Status | TTL |
|---|---|---|---|---|
| `A` | `cloud` | `YOUR_VPS_IP` | **DNS Only (Grey Cloud)** | Auto |

---

## STEP 2 - Connect to VPS via SSH

```bash
ssh -i ssh-key-2026-08-24.key ubuntu@YOUR_VPS_IP
```

---

## STEP 3 - Install Nginx & Certbot (`sudo` use කරන්න)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Nginx & Certbot (Free SSL)
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## STEP 4 - Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/cloud.cmoviez.com
```

පහත Nginx Configuration එක සම්පූර්ණයෙන් Paste කරන්න (`Ctrl+Shift+V`):

```nginx
server {
    listen 80;
    server_name cloud.cmoviez.com;

    # Direct 302 Redirect to PixelDrain (Request goes from User's IP)
    location ~ ^/download/([a-zA-Z0-9]+)$ {
        return 302 https://pixeldrain.com/api/file/$1?download;
    }

    # Health check
    location = / {
        return 200 "PixelDrain Direct Redirector Running!";
        add_header Content-Type text/plain;
    }

    # Block all other paths
    location / {
        return 404;
    }
}
```

Save කර ඉවත් වන්න: `Ctrl + O` → `Enter` → `Ctrl + X`

### Site එක Enable කර Nginx Reload කරන්න:

```bash
# Link config to active sites
sudo ln -s /etc/nginx/sites-available/cloud.cmoviez.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## STEP 5 - Setup Free SSL (HTTPS)

```bash
sudo certbot --nginx -d cloud.cmoviez.com
```
- Email එකක් ලබා දෙන්න.
- Terms සඳහා `Y` ගසන්න.
- Redirect HTTP to HTTPS සදහා `2` තෝරන්න (හෝ Automatic handle වෙයි).

---

## How to Use

- PixelDrain Link එක: `https://pixeldrain.com/u/abc12345`
- ඔබේ Custom Link එක: `https://cloud.cmoviez.com/download/abc12345`

ලින්ක් එක Click කළ වහාම **User ගේ IP එකෙන් Direct Download එක Start වේ!**

