FROM node:22-slim
# RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# ↑ Comentado (10/09/2026): se agrega ffmpeg, que usa videoCompress.service.js para
#   comprimir los videos de propiedad antes de mandarlos a Cloudinary. Es el paquete de
#   Debian (bookworm, ffmpeg 5.x): suma unos 300 MB a la imagen, pero es la forma mas
#   confiable de tenerlo (no depende de descargas de GitHub en el build).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
