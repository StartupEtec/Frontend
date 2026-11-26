# Imagen base estable y compatible con módulos nativos de Expo / React Native.
# node:22-slim da menos problemas a futuro que alpine (evita incompatibilidades
# con compilación de dependencias nativas).
FROM node:22-slim

WORKDIR /app

# Herramientas del sistema necesarias para Expo / React Native.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# cloudflared para el túnel público del frontend (modo tunnel).
RUN curl -L --output /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && \
    chmod +x /usr/local/bin/cloudflared

# Capa de caché de dependencias: solo se reconstruye si cambian package.json / lock.
COPY package.json package-lock.json ./

RUN npm ci

# Código de la aplicación. El .env NO se copia aquí: las credenciales viajan
# fuera de la imagen y se inyectan en runtime vía docker-compose (env_file).
# Nunca se empaquetan credenciales dentro de la imagen.
COPY . .

# Puerto del Metro bundler de Expo.
EXPOSE 8081

# Entry point que levanta el túnel cloudflared y luego Metro en modo tunnel.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
