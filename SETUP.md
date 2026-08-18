# Setup del Proyecto - Frontend + Backend

Guia para levantar la app completa (Frontend + Backend) en tu maquina.

## Requisitos previos

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (para el tunel del backend)

## Estructura de repos

```
StartUp 6I/
├── Frontend/          # Este repo (React Native + Expo)
│   ├── scripts/
│   │   └── start-backend-tunnel.sh
│   ├── src/
│   └── ...
└── Backend/           # Repo del backend (Node.js + Docker)
    ├── docker-compose.yml
    └── ...
```

Clonar ambos repos dentro de la misma carpeta:
```bash
mkdir StartUp\ 6I && cd StartUp\ 6I
git clone <url-repo-frontend> Frontend
git clone <url-repo-backend> Backend
```

## Levantar la app (paso a paso)

### Terminal 1 — Backend

```bash
cd Backend
docker compose up -d
docker compose ps api    # esperar a que diga "Up (healthy)"
```

### Terminal 2 — Tunel del backend

Desde la carpeta Frontend:
```bash
cd Frontend
./scripts/start-backend-tunnel.sh
```

Este script:
1. Levanta [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) para exponer el backend (puerto 3000)
2. Obtiene la URL publica automaticamente
3. Actualiza `Frontend/.env` con esa URL

### Terminal 3 — Frontend

```bash
cd Frontend
npm install
npm run start:tunnel
```

Escanear el QR code con Expo Go (Android) o Cámara (iOS).

## Verificar que funcione

```bash
# Backend local
curl http://localhost:3000/api/v1/health

# Tunel cloudflared
curl https://<tu-url>.trycloudflare.com/api/v1/health

# Metro/Expo
curl http://localhost:8081/status
```

## Ver codigo de verificacion (OTP)

```bash
docker logs ondemand_api 2>&1 | grep -i otp | tail -2
```

## Troubleshooting

### Se quedo sin tokens de solicitud ("debes esperar 15 minutos")
```bash
docker compose -f ~/StartUp\ 6I/Backend/docker-compose.yml restart api
```

### El tunel murio
Re-ejecutar `./scripts/start-backend-tunnel.sh` y anotar la nueva URL.

### Expo no conecta al backend
Verificar que `Frontend/.env` tenga la URL correcta del tunel:
```
EXPO_PUBLIC_API_URL=https://<tu-url>.trycloudflare.com/api/v1
```

## Notas para el equipo

- **Frontend team**: Usar `npm run start:tunnel` para desarrollo con Expo Go
- **Backend team**: Solo necesitan `docker compose up -d` en su repo
- El archivo `.env` **nunca** se sube al repositorio (esta en `.gitignore`)
- `cloudflared` es gratuito y no requiere cuenta de Cloudflare
