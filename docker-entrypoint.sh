#!/bin/bash
# Entry point del contenedor del frontend.
# Levanta un túnel cloudflared público hacia Metro (puerto 8081) y luego
# arranca Expo en modo tunnel, inyectando la URL pública como proxy.
# Ejecutar desde /app (WORKDIR). Requiere cloudflared (instalado en el Dockerfile).
set -e

PORT=8081
LOG_FILE="/tmp/cloudflared-frontend.log"

# Liberar el puerto de Metro si quedó un proceso viejo (previo reinicio).
pkill -f "cloudflared tunnel.*${PORT}" 2>/dev/null || true
pkill -f "expo start.*${PORT}" 2>/dev/null || true
sleep 1

echo "=== Iniciando túnel cloudflared para el frontend (puerto ${PORT}) ==="
cloudflared tunnel --url "http://localhost:${PORT}" > "${LOG_FILE}" 2>&1 &
CF_PID=$!
echo "cloudflared PID: ${CF_PID}"

FRONTEND_URL=""
echo "Esperando URL del túnel..."
for i in $(seq 1 30); do
    if grep -q "trycloudflare.com" "${LOG_FILE}" 2>/dev/null; then
        FRONTEND_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "${LOG_FILE}" | head -1)
        if [ -n "${FRONTEND_URL}" ]; then
            echo ""
            echo "=== Túnel listo ==="
            echo "URL pública: ${FRONTEND_URL}"
            break
        fi
    fi
    sleep 1
done

if [ -z "${FRONTEND_URL}" ]; then
    echo "ERROR: No se pudo obtener la URL del túnel en 30 segundos. Revisá el log:"
    cat "${LOG_FILE}"
    exit 1
fi

echo ""
echo "=== Levantando Metro con EXPO_PACKAGER_PROXY_URL=${FRONTEND_URL} ==="
echo ""

# Variables EXPO_PUBLIC_* (API_URL, WS_URL) llegan vía docker-compose env_file.
# Metro las lee de process.env e las inyecta en el bundle del frontend.
# --host lan hace que Metro escuche en 0.0.0.0 (todas las interfaces), así
# cloudflared (localhost:8081) y el puerto publicado (8081:8081) funcionan.
EXPO_NO_DOCTOR=1 EXPO_PACKAGER_PROXY_URL="${FRONTEND_URL}" \
    npx expo start --host lan --port "${PORT}"

# Limpieza al salir
kill "${CF_PID}" 2>/dev/null || true
