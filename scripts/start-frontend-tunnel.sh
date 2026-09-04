#!/bin/bash
# Levanta Metro + tunel cloudflared para el Frontend (expo) y muestra la URL
# para Expo Go. Alternativa a `start:tunnel` (ngrok), que esta bloqueado.
# Ejecutar desde Frontend/ o desde un subdirectorio
# Uso: ./scripts/start-frontend-tunnel.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

CLOUDFLARED="cloudflared"
LOG_FILE="/tmp/cloudflared-frontend.log"
PORT=8081

if ! command -v $CLOUDFLARED &> /dev/null; then
    echo "ERROR: cloudflared no esta instalado. Ver scripts/start-backend-tunnel.sh"
    exit 1
fi

# Libera el puerto de Metro si quedo un proceso viejo
kill $(pgrep -f "expo start.*8081") 2>/dev/null || true
pkill -f "cloudflared tunnel.*8081" 2>/dev/null || true
sleep 1

echo "=== Iniciando tunel cloudflared para el frontend (puerto $PORT) ==="

nohup $CLOUDFLARED tunnel --url http://localhost:$PORT > "$LOG_FILE" 2>&1 &
CF_PID=$!
echo "cloudflared PID: $CF_PID"

FRONTEND_URL=""
echo "Esperando URL del tunnel..."
for i in $(seq 1 30); do
    if grep -q "trycloudflare.com" "$LOG_FILE" 2>/dev/null; then
        FRONTEND_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
        if [ -n "$FRONTEND_URL" ]; then
            echo ""
            echo "=== Tunnel listo ==="
            echo "URL publica: $FRONTEND_URL"
            break
        fi
    fi
    sleep 1
done

if [ -z "$FRONTEND_URL" ]; then
    echo "ERROR: No se pudo obtener la URL en 30 segundos. Revisa el log:"
    cat "$LOG_FILE"
    exit 1
fi

echo ""
echo "=== Levantando Metro (Metro Bundler) con EXPO_PACKAGER_PROXY_URL=$FRONTEND_URL ==="
echo ""

EXPO_NO_DOCTOR=1 EXPO_PACKAGER_PROXY_URL="$FRONTEND_URL" npx expo start --host localhost --port $PORT

# Limpieza al salir
kill $CF_PID 2>/dev/null || true
