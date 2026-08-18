#!/bin/bash
# Levanta cloudflared para el backend y actualiza el .env automaticamente
# Ejecutar desde la carpeta raiz del proyecto (StartUp 6I) o desde Frontend/
# Uso: ./scripts/start-backend-tunnel.sh

set -e

# Detectar la carpeta Frontend relativa a donde se ejecuta el script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Verificar que exista el .env en Frontend
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo "ERROR: No se encontro Frontend/.env"
    echo "Creando uno por defecto..."
    echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1" > "$FRONTEND_DIR/.env"
fi

CLOUDFLARED="cloudflared"
LOG_FILE="/tmp/cloudflared-backend.log"

# Verificar que cloudflared este instalado
if ! command -v $CLOUDFLARED &> /dev/null; then
    echo "ERROR: cloudflared no esta instalado."
    echo "Instalarlo con:"
    echo "  curl -L --output /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    echo "  chmod +x /tmp/cloudflared"
    echo "  sudo mv /tmp/cloudflared /usr/local/bin/cloudflared"
    exit 1
fi

# Matar cloudflared anterior si existe
kill $(pgrep -f "cloudflared tunnel") 2>/dev/null || true
sleep 1

echo "=== Iniciando tunnel cloudflared para el backend (puerto 3000) ==="

# Levantar cloudflared en background, logueando a archivo
nohup $CLOUDFLARED tunnel --url http://localhost:3000 > "$LOG_FILE" 2>&1 &
CF_PID=$!
echo "cloudflared PID: $CF_PID"

# Esperar a que aparezca la URL en el log (max 30 segundos)
echo "Esperando URL del tunnel..."
for i in $(seq 1 30); do
    if grep -q "trycloudflare.com" "$LOG_FILE" 2>/dev/null; then
        BACKEND_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
        if [ -n "$BACKEND_URL" ]; then
            echo ""
            echo "=== Tunnel listo ==="
            echo "URL del backend: $BACKEND_URL"
            echo ""
            echo "EXPO_PUBLIC_API_URL=${BACKEND_URL}/api/v1" > "$FRONTEND_DIR/.env"
            echo "Frontend/.env actualizado con: ${BACKEND_URL}/api/v1"
            echo ""
            echo "=== Ahora levanta el Frontend en otra terminal: ==="
            echo "cd \"$FRONTEND_DIR\" && npm run start:tunnel"
            echo ""
            exit 0
        fi
    fi
    sleep 1
done

echo "ERROR: No se pudo obtener la URL en 30 segundos. Revisa el log:"
cat "$LOG_FILE"
exit 1
