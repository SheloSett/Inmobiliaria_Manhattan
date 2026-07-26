# Guía de despliegue en VPS

La web corre completa con Docker Compose: Postgres + backend (Node/Prisma) +
frontend (nginx). El nginx del frontend sirve la web y hace proxy de `/api/` y
`/uploads/` al backend por la red interna de Docker, así que **el único puerto
que se expone a internet es el del frontend** (8080 en este VPS, ver sección 0).

---

## 0. Estado de este VPS en particular (ya verificado)

Este VPS (Hostinger, Ubuntu 24.04, 2 vCPU, 8GB RAM, 96GB disco) ya sirve otro
sitio (IGWT) de forma **nativa**: PM2 + nginx del sistema + Postgres del
sistema, escuchando en los puertos 80/443. Docker **no está instalado**.

Esto no es un problema: Docker corre aislado en su propia red y en sus
propios contenedores, así que convive sin tocar nada de lo que ya funciona.
Como esta web todavía no tiene dominio propio, la vamos a exponer en un
**puerto propio** (8080) accesible directo por IP — así ni siquiera hace
falta tocar la config del nginx existente.

### 0.1 Instalar Docker (no está instalado)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Cerrá la sesión SSH y volvé a entrar para que el usuario quede en el grupo
`docker` (si no, hay que anteponer `sudo` a los comandos `docker`).
Verificá:

```bash
docker --version
docker compose version
git --version
```

### 0.2 Verificar que el puerto elegido (8080) esté libre

```bash
sudo ss -tlnp | grep ':8080 '
```

- **Si no devuelve nada**: libre, seguí normal con `FRONTEND_PORT=8080`.
- **Si ya está usado**: elegí otro (ej. 8081) y usá ese valor en el `.env`
  del paso 3.

> El 80/443 quedan intactos para IGWT — no los tocamos en ningún paso.
> El Postgres de esta web corre dentro de Docker, mapeado a
> `127.0.0.1:5434`, separado del Postgres nativo que usa el 5432. No hay
> conflicto entre ambos.

---

## 1. Commitear y pushear el código (en tu máquina)

```bash
git add -A
git commit -m "feat: preparar despliegue a VPS"
git push origin main
```

> `backend/uploads/` y los `.env` están en `.gitignore`: no viajan con el repo.
> Eso es correcto — los `.env` se crean a mano en el VPS (paso 3) y las
> imágenes se copian aparte si hace falta (paso 5).

## 2. Clonar el repo en el VPS

```bash
ssh usuario@IP_DEL_VPS
cd /opt   # o el directorio que prefieras
git clone URL_DE_TU_REPO inmobiliaria-manhattan
cd inmobiliaria-manhattan
```

## 3. Crear los archivos .env en el VPS

### 3.1 `.env` raíz (secretos de producción)

```bash
cp .env.example .env
nano .env
```

Completá:

```dotenv
POSTGRES_PASSWORD=<salida de: openssl rand -hex 24>
JWT_SECRET=<salida de: openssl rand -hex 32>
FRONTEND_PORT=8080
CLOUDINARY_CLOUD_NAME=<de tu dashboard de Cloudinary>
CLOUDINARY_API_KEY=<de tu dashboard de Cloudinary>
CLOUDINARY_API_SECRET=<de tu dashboard de Cloudinary>
```

> Las fotos de propiedades y del contenido del sitio se suben directo a
> Cloudinary (no al disco del VPS). Sin estas tres variables el backend
> arranca igual, pero cualquier subida de imagen va a fallar.

### 3.2 `frontend/.env` (teléfonos de contacto, opcional)

```bash
cp frontend/.env.example frontend/.env
nano frontend/.env
```

Si lo dejás vacío se usan los números default que ya están en el código.
Estas variables se incrustan en el build: si las cambiás después, hay que
rebuildear el frontend (`docker compose up -d --build frontend`).

## 4. Levantar todo

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos (descarga imágenes y compila el frontend).
El backend aplica las migraciones de Prisma y corre el seed automáticamente
al arrancar.

Verificar:

```bash
docker compose ps                                  # los 3 servicios "running"
docker compose logs backend --tail 30              # debe decir "Backend corriendo en puerto 4000"
curl http://localhost:8080/api/health              # debe responder {"status":"ok"}
```

Después abrí en tu navegador: `http://177.7.59.16:8080`

## 5. (Opcional) Copiar imágenes viejas subidas antes de usar Cloudinary

Las fotos nuevas (propiedades y contenido del sitio) se suben directo a
Cloudinary, no al disco del VPS. Este paso solo aplica si en tu máquina ya
habías cargado propiedades con fotos **antes** de este cambio: esas imágenes
viejas quedaron en `backend/uploads/` y NO viajan por git. Copialas desde tu
máquina (PowerShell o Git Bash) para que sigan viéndose:

```bash
scp -r backend/uploads/* usuario@IP_DEL_VPS:/opt/inmobiliaria-manhattan/backend/uploads/
```

No hace falta reiniciar nada: la carpeta está montada como volumen.

## 6. (Más adelante, cuando tengas un dominio para esta web)

No hace falta tocar la config de IGWT. Simplemente agregás un **nuevo**
archivo de config al nginx del sistema (sin modificar los existentes):

```bash
sudo nano /etc/nginx/sites-available/manhattan
```

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;   # el dominio nuevo, apuntado por DNS a esta IP

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/manhattan /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Con el DNS apuntando, `tudominio.com` sirve esta web y `igwtstore.com.ar`
sigue andando exactamente igual que antes. Después se puede agregar HTTPS
con `certbot --nginx -d tudominio.com`.

## 7. Firewall (recomendado)

Si usás UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable
sudo ufw status
```

> Si más adelante agregás el dominio con nginx (paso 6), el 8080 puede volver
> a cerrarse (`sudo ufw delete allow 8080/tcp`) ya que el acceso pasaría por
> el 80/443 que ya está abierto para IGWT.

Postgres (5434) y el backend (4000) quedan ligados a 127.0.0.1 en el
docker-compose, así que no están expuestos a internet aunque el firewall
estuviera abierto.

---

## Actualizar la web más adelante

Cada vez que hagas cambios y los pushees:

```bash
ssh usuario@IP_DEL_VPS
cd /opt/inmobiliaria-manhattan
git pull
docker compose up -d --build
```

## Backup de la base de datos

```bash
docker exec manhattan_db pg_dump -U manhattan manhattan_db > backup_$(date +%F).sql
```

Y para las imágenes basta con copiar la carpeta `backend/uploads/`.

## Cuando tengas dominio (HTTPS)

Apuntá un registro DNS tipo A del dominio a la IP del VPS y avisame: el camino
más simple es poner Caddy (o certbot + nginx) adelante, que gestiona el
certificado SSL de Let's Encrypt automáticamente.
