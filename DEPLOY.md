# Guía de despliegue en VPS

La web corre completa con Docker Compose: Postgres + backend (Node/Prisma) +
frontend (nginx). El nginx del frontend sirve la web y hace proxy de `/api/` y
`/uploads/` al backend por la red interna de Docker, así que **el único puerto
que se expone a internet es el del frontend** (8080 en este VPS, ver sección 0).

> ⚠️ **Actualización (08/10/2026): la web se migró al VPS nuevo `82.25.74.242`.**
> Allá los puertos 80/443 los atiende un **Caddy compartido en Docker** (no el nginx del
> sistema), el proyecto vive en `/srv/inmobiliaria-manhattan` y el frontend escucha en el
> 8081. Todo eso está en la **sección 8**. Las secciones 0 a 7 describen el VPS viejo
> (`177.7.59.16`) y se dejan como historial: siguen sirviendo para entender por qué la
> configuración es como es (límites de subida, CORS, `FRONTEND_BIND`, Cloudflare), pero
> sus rutas, puertos y pasos de nginx/certbot **no aplican** al VPS nuevo.

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

> **Actualización (17/08/2026):** ya hay dominio propio (`.com.ar` de NIC.ar).
> El 8080 sigue siendo el puerto donde escucha el contenedor, pero pasa a estar
> atado a `127.0.0.1` y el acceso público entra por el nginx del sistema en
> 80/443 con HTTPS. Ver **paso 6**.

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

## 6. Conectar el dominio (.com.ar de NIC.ar) + HTTPS

> Dominio de este sitio: **manhattannegociosinmobiliarios.com.ar** (comprado en
> NIC.ar el 17/08/2026). Los comandos de abajo ya lo tienen puesto, se copian
> y pegan tal cual.
> No hace falta tocar nada de IGWT ni rebuildear el frontend: la web usa rutas
> relativas (`/api`, `/uploads`), así que no tiene el dominio "quemado" en el build.

### 6.1 Apuntar el DNS a la IP del VPS

El panel de NIC.ar (nic.ar → ingresá con Clave Fiscal de AFIP → **Mis dominios**)
trabaja por **delegación**: le decís qué servidores DNS mandan sobre tu dominio.
Hay dos caminos:

**Opción A — DNS de Cloudflare (recomendado, gratis).** Es el camino más usado
para `.com.ar` porque el editor de zona es cómodo y la propagación es rápida:

1. Creá una cuenta en cloudflare.com → *Add a site* → escribí `manhattannegociosinmobiliarios.com.ar`
   → plan **Free**.
2. Cloudflare te da dos nameservers, del estilo:
   `xxx.ns.cloudflare.com` y `yyy.ns.cloudflare.com`.
3. En NIC.ar: tu dominio → **Delegaciones / DNS** → cargá esos dos nameservers
   (borrá los que estuvieran) → guardar.
4. De vuelta en Cloudflare, en **DNS → Records**, cargá:

   | Tipo | Nombre | Contenido     | Proxy         |
   |------|--------|---------------|---------------|
   | A    | `@`    | `177.7.59.16` | **DNS only**  |
   | A    | `www`  | `177.7.59.16` | **DNS only**  |

   > Poné la nube **gris (DNS only)**, no naranja. Con el proxy activado,
   > certbot no puede validar el dominio y el certificado falla. Una vez que
   > el HTTPS esté andando podés activar el proxy, pero configurando el modo
   > SSL en **Full (strict)** — si lo dejás en "Flexible" se arma un bucle de
   > redirecciones.

> ~~**Opción B — DNS del propio NIC.ar.**~~ **Descartada (verificado el
> 17/08/2026 en el panel real):** en *Mis dominios*, las únicas acciones que
> ofrece NIC.ar son **TRANSFERIR** y **DELEGAR**, más una columna *Delegado:
> NO*. No hay editor de zona, así que no se pueden cargar registros A ahí: la
> delegación a un DNS externo (Cloudflare) es el único camino.

**El orden importa:** primero creá el sitio en Cloudflare para que te dé los
nameservers, y recién después apretá **DELEGAR** en NIC.ar. Si delegás antes,
no vas a tener qué escribir en el formulario.

La delegación en NIC.ar puede tardar **entre unos minutos y algunas horas**.
Verificá desde el VPS antes de seguir:

```bash
dig +short manhattannegociosinmobiliarios.com.ar
dig +short www.manhattannegociosinmobiliarios.com.ar
```

Ambos tienen que devolver `177.7.59.16`. **No sigas al paso 6.3 hasta que
devuelvan eso**: certbot valida el dominio por HTTP y falla si el DNS todavía
no resolvió.

### 6.2 Agregar el server block al nginx del sistema

Se crea un archivo **nuevo**; los de IGWT no se tocan:

```bash
sudo nano /etc/nginx/sites-available/manhattan
```

```nginx
server {
    listen 80;
    server_name manhattannegociosinmobiliarios.com.ar www.manhattannegociosinmobiliarios.com.ar;

    # Los CVs y las fotos pueden pesar; el default de nginx (1MB) los rechaza.
    # client_max_body_size 20M;
    # ↑ Comentado (03/09/2026): este 20M se eligió cuando la web solo subía fotos y CVs,
    #   ANTES de que existieran los videos de propiedad. Era la causa del error
    #   intermitente "no se pudo guardar" que reportaba el cliente al subir un mp4:
    #   este server block es el proxy de AFUERA, así que su límite es el que manda —
    #   el `client_max_body_size 110M` del nginx del contenedor (frontend/nginx.conf)
    #   nunca llegaba a aplicarse. Todo video de más de 20 MB moría acá con un 413.
    #   Se sube a 110M para que coincida con el nginx interno (10 MB de aire sobre el
    #   límite de 100 MB por archivo que aplica multer).
    # client_max_body_size 110M;
    # ↑ Comentado (10/09/2026): el backend ahora comprime los videos con ffmpeg antes de
    #   mandarlos a Cloudinary, así que tiene que poder ENTRAR un video de celular sin
    #   comprimir (un minuto en 4K son 300-400 MB). 520M = 500 MB por archivo de multer
    #   + 20 MB de aire. Mismo valor que frontend/nginx.conf.
    client_max_body_size 520M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts (03/09/2026): la segunda causa del mismo bug. Sin estas líneas nginx
        # usa su default de 60s, y subir un video a Cloudinary tarda más: el backend
        # tiene que mandarlo Y esperar a que Cloudinary lo TRANSCODIFIQUE (es sincrónico),
        # todo dentro de la misma request. A los 60s nginx cortaba con 504.
        # El nginx del contenedor ya tenía 300s; faltaba replicarlo acá, que es el que
        # ve la conexión del cliente primero.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;

        # Sin buffering de request: nginx reenvía el body al contenedor a medida que
        # llega, en vez de escribir 100 MB a disco primero y recién después mandarlos.
        # Baja la latencia y evita llenar /var/lib/nginx con archivos temporales.
        proxy_request_buffering off;
    }
}
```

> **Ojo con certbot:** si ya corriste el paso 6.3, certbot creó un bloque `listen 443`
> en este mismo archivo. Los cambios de arriba hay que aplicarlos en **el bloque 443**
> (o en los dos), porque el tráfico real entra por HTTPS. Verificá con:
> `grep -n "client_max_body_size\|proxy_read_timeout\|listen" /etc/nginx/sites-available/manhattan`

> `X-Forwarded-For` y `X-Forwarded-Proto` no son opcionales: el backend tiene
> `trust proxy` activado para que el rate limit del login cuente por IP real.
> Sin esos headers, todos los visitantes cuentan como uno solo.

```bash
sudo ln -s /etc/nginx/sites-available/manhattan /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Probá `http://manhattannegociosinmobiliarios.com.ar` — ya debería verse la web (todavía sin candado).

### 6.3 Certificado HTTPS con certbot

```bash
sudo certbot --nginx -d manhattannegociosinmobiliarios.com.ar -d www.manhattannegociosinmobiliarios.com.ar
```

Cuando pregunte por la redirección HTTP → HTTPS, elegí **redirigir**. Certbot
edita el archivo `manhattan` que creaste (agrega el bloque 443 y el redirect) y
renueva solo por systemd timer. Verificá la renovación automática:

```bash
sudo certbot renew --dry-run
```

> Si certbot no está instalado: `sudo apt install certbot python3-certbot-nginx`.
> Ojo: IGWT ya usa certbot en este mismo VPS, así que lo más probable es que ya esté.

### 6.4 Atar la web al dominio y cerrar el 8080

Con el dominio andando, el puerto 8080 ya no tiene por qué ser alcanzable desde
internet, y el backend ya no necesita aceptar pedidos de cualquier origen. En el
VPS, editá el `.env` de la raíz:

```bash
cd /opt/inmobiliaria-manhattan
nano .env
```

```dotenv
FRONTEND_BIND=127.0.0.1
CORS_ORIGIN=https://manhattannegociosinmobiliarios.com.ar,https://www.manhattannegociosinmobiliarios.com.ar
```

```bash
docker compose up -d
```

Comprobaciones finales:

```bash
curl -I https://manhattannegociosinmobiliarios.com.ar                 # 200, y http:// debe dar 301
sudo ss -tlnp | grep ':8080 '                    # ahora debe decir 127.0.0.1:8080, no 0.0.0.0
curl -I http://177.7.59.16:8080                  # desde AFUERA del VPS: ya no debe responder
```

> **Por qué `FRONTEND_BIND` y no una regla de firewall:** Docker publica los
> puertos escribiendo sus propias reglas de iptables en la cadena `DOCKER`, que
> se evalúa **antes** que las de UFW. Un `ufw deny 8080` no cierra un puerto
> publicado por Docker: el tráfico lo esquiva. Atar el puerto a `127.0.0.1` es
> la forma correcta — así ni siquiera se abre hacia afuera.

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

> ⚠️ **Corrección (17/08/2026):** la línea de arriba se dejó por historial pero
> es incorrecta. `ufw delete allow 8080/tcp` **no** cierra el 8080 mientras
> Docker lo esté publicando: Docker inserta sus reglas en la cadena `DOCKER` de
> iptables, que se evalúa antes que las de UFW, y el tráfico esquiva el
> firewall. La forma real de cerrarlo es `FRONTEND_BIND=127.0.0.1` en el `.env`
> (ver paso 6.4). Sacar la regla de UFW igual está bien —queda más prolijo—,
> pero por sí sola no protege nada.

Postgres (5434) y el backend (4000) quedan ligados a 127.0.0.1 en el
docker-compose, así que no están expuestos a internet aunque el firewall
estuviera abierto.

---

## Actualizar la web más adelante

Cada vez que hagas cambios y los pushees:

```bash
# ssh usuario@IP_DEL_VPS
# cd /opt/inmobiliaria-manhattan
# ↑ Comentadas (08/10/2026): eran el usuario/IP genéricos y la ruta del VPS viejo
#   (177.7.59.16). Desde la migración el proyecto vive en el VPS nuevo, en /srv (ver sección 8).
ssh shelo@82.25.74.242
cd /srv/inmobiliaria-manhattan
git pull
docker compose up -d --build
```

> En el VPS nuevo `docker compose` toma solo el `docker-compose.override.yml` que está en esa
> carpeta (no está en git, ver 8.2): es el que une el frontend a la red de Caddy. No hace
> falta pasarlo con `-f`.

### Actualización del 10/09/2026 (compresión de videos con ffmpeg)

Además del `git pull` + `docker compose up -d --build` de siempre (el build tarda unos
minutos más la primera vez porque instala ffmpeg en la imagen del backend), hay que
subir el límite de subida en el nginx del sistema, que es el que manda:

```bash
sudo sed -i 's/client_max_body_size 110M;/client_max_body_size 520M;/' /etc/nginx/sites-available/manhattan
grep -n "client_max_body_size" /etc/nginx/sites-available/manhattan   # tiene que decir 520M (línea sin #)
sudo nginx -t && sudo systemctl reload nginx
```

> **VPS nuevo (08/10/2026):** este `sed` ya no aplica — allá no hay nginx del sistema. El
> límite equivalente vive en el archivo de Caddy (`request_body { max_size 520MB }`, ver 8.3)
> y ya quedó en 520MB desde la migración.

Para confirmar que el backend nuevo tiene ffmpeg:

```bash
docker exec manhattan_backend ffmpeg -version | head -1
```

Y al subir un video desde el panel, en los logs se ve la compresión:

```bash
docker logs manhattan_backend --tail 50 | grep "\[video\]"
```

## Backup de la base de datos

```bash
docker exec manhattan_db pg_dump -U manhattan manhattan_db > backup_$(date +%F).sql
```

Y para las imágenes basta con copiar la carpeta `backend/uploads/`.

> **Backup automático (VPS nuevo, desde 08/10/2026):** no hace falta correrlo a mano. Todas
> las noches a las 3:30 (UTC) el cron del usuario `shelo` corre `~/scripts/backup-manhattan.sh`,
> que guarda un `.sql.gz` en `~/backups/` (se quedan los últimos 7 días) y lo sube a Backblaze
> B2 con rclone. Cómo verificarlo y cómo restaurar uno: sección **8.5**.
> Ojo: `backend/uploads/` (los CVs de las postulaciones) **no** entra en ese backup, solo la base.

## Cuando tengas dominio (HTTPS)

Apuntá un registro DNS tipo A del dominio a la IP del VPS y avisame: el camino
más simple es poner Caddy (o certbot + nginx) adelante, que gestiona el
certificado SSL de Let's Encrypt automáticamente.

> **Actualización (17/08/2026):** el dominio ya se compró en NIC.ar y esta
> sección quedó reemplazada por el **paso 6**, que tiene el procedimiento
> completo y concreto (delegación en NIC.ar, server block de nginx, certbot y
> cierre del 8080). Se eligió certbot + nginx en vez de Caddy porque el nginx
> del sistema ya está instalado y sirviendo IGWT: meter Caddy implicaría
> disputarle los puertos 80/443 a un sitio que ya está en producción.

---

## 8. VPS nuevo (82.25.74.242) — migración del 07–08/10/2026

La web se mudó del VPS viejo (`177.7.59.16`, `srv1745446`) al VPS nuevo de Hostinger
(`82.25.74.242`, `srv1959386`: Ubuntu 24.04, 4 vCPU, 15 GB RAM, 193 GB disco), donde ya
corrían otros proyectos en Docker. El corte fue el **08/10/2026 a las 00:34 UTC** (07/10
21:34 hora argentina), sin pérdida de datos: las 14 tablas quedaron con conteos idénticos
y la web estuvo unos 3 minutos sin poder guardar cambios.

### 8.1 Cómo está armado el VPS nuevo

A diferencia del viejo, **no hay nginx del sistema** (está instalado pero inactivo). Los
puertos 80/443 los atiende un **Caddy compartido en Docker**:

- Contenedor `proxy`, compose en `/srv/proxy/docker-compose.yml`.
- Un archivo por app en `/srv/proxy/sites/*.caddy` (el `Caddyfile` los importa todos).
- Cada app se une a la red Docker externa **`edge`** y Caddy le habla por nombre de contenedor.
- Caddy saca y renueva solo los certificados de Let's Encrypt (no hay certbot).
- Cada app tiene además un nombre de prueba `<app>.82-25-74-242.sslip.io`, que resuelve
  solo a la IP del VPS y tiene certificado real sin depender del DNS. El de esta web es
  **https://manhattan.82-25-74-242.sslip.io**.

> Ese Caddy sirve **todos** los sitios del VPS (shiraf, shuk, cartelera, ohel-moed,
> provincias, bazar…). Antes de recargarlo, validar siempre (ver 8.3): una config rota
> tira abajo a todos, no solo a Manhattan.

El proyecto vive en **`/srv/inmobiliaria-manhattan`**, como los demás de `/srv` (no en `~`).
Mismo `docker-compose.yml` del repo y mismos nombres de contenedor (`manhattan_db`,
`manhattan_backend`, `manhattan_frontend`). Diferencias de puertos contra el viejo (todos
atados a `127.0.0.1`, solo sirven para debug desde el propio VPS):

| Servicio | VPS viejo        | VPS nuevo        | Por qué                                         |
|----------|------------------|------------------|-------------------------------------------------|
| frontend | `127.0.0.1:8080` | `127.0.0.1:8081` | el 8080 ya lo usa `shiraf-evolution`            |
| backend  | `127.0.0.1:4001` | `127.0.0.1:4001` | igual                                           |
| db       | `127.0.0.1:5434` | `127.0.0.1:5434` | igual                                           |

El `.env` de la raíz es **copia exacta del viejo** (mismo `POSTGRES_PASSWORD`, `JWT_SECRET`,
Cloudinary y `CORS_ORIGIN`), salvo `FRONTEND_PORT=8081`. Mantener los mismos secretos fue a
propósito: la contraseña tiene que coincidir con la de la base restaurada (ver el gotcha de
`POSTGRES_PASSWORD` en la memoria del proyecto) y con el mismo `JWT_SECRET` las sesiones del
panel siguieron valiendo.

### 8.2 `docker-compose.override.yml` (solo en el VPS, no está en git)

Vive en `/srv/inmobiliaria-manhattan/docker-compose.override.yml`. Compose lo aplica solo.
**No commitearlo al repo**: en desarrollo local la red `edge` no existe y `docker compose up`
fallaría.

```yaml
services:
  frontend:
    networks: [default, edge]
networks:
  edge:
    external: true
```

Solo el frontend se une a `edge`. El backend y la base siguen únicamente en la red interna
del proyecto; el nginx del frontend les hace proxy como siempre (`manhattan_backend:4000`).

### 8.3 Archivo de Caddy: `/srv/proxy/sites/manhattan.caddy`

Hay una copia de trabajo en `~/manhattan.caddy` (la carpeta `/srv/proxy/sites` es del usuario
`jony`, por eso se copia con `sudo`). Contenido, sin los comentarios:

```caddy
(manhattan) {
	encode gzip
	request_body {
		max_size 520MB
	}
	reverse_proxy manhattan_frontend:80 {
		header_up X-Real-IP {remote_host}
	}
}

manhattan.82-25-74-242.sslip.io {
	import manhattan
}

manhattannegociosinmobiliarios.com.ar {
	tls {
		on_demand
	}
	import manhattan
}

www.manhattannegociosinmobiliarios.com.ar {
	tls {
		on_demand
	}
	redir https://manhattannegociosinmobiliarios.com.ar{uri} permanent
}
```

- `max_size 520MB`: el mismo límite que tenía el nginx del sistema en el VPS viejo (videos de
  hasta 500 MB por archivo en multer). El proxy de afuera es el que manda: si este límite
  queda más bajo que el del nginx del contenedor, los videos grandes mueren con 413 (el bug
  del 03/09/2026).
- No hace falta `proxy_read_timeout`: Caddy no corta por tiempo de respuesta por defecto
  (el nginx viejo sí, a los 60s, y por eso necesitaba los 300s).
- `on_demand`: Caddy saca el certificado del dominio real con la primera visita que llega
  por ese nombre. Así quedó declarado antes del corte sin que reintentara contra el VPS viejo.
- **El `www` ahora redirige** al dominio sin www (en el viejo servía el sitio duplicado). El
  sitemap y las URLs canónicas usan el dominio sin www (`SITE_URL` en `seo.routes.js`).

Para cambiarlo:

```bash
nano ~/manhattan.caddy
sudo cp ~/manhattan.caddy /srv/proxy/sites/manhattan.caddy
docker exec proxy caddy validate --config /etc/caddy/Caddyfile   # tiene que decir "Valid configuration"
docker exec proxy caddy reload   --config /etc/caddy/Caddyfile
```

Certificados al 08/10/2026: Let's Encrypt, vencen el **05/01/2027** y Caddy los renueva solo.

### 8.4 Cómo se hizo la migración (por si hay que repetirla)

La regla era **cero pérdida de datos**, así que se hizo en dos tiempos:

1. **Ensayo, sin tocar el viejo.** `pg_dump -Fc` en el viejo (es solo lectura), copia al
   nuevo verificando el `sha256sum` en cada salto, clonado del **mismo commit** que corría el
   viejo, `.env` copiado, `docker compose up -d db` **solo la base**, `pg_restore`, y recién
   después `docker compose up -d --build`. Se comparan los conteos exactos de todas las
   tablas contra el viejo y se prueba por el nombre sslip.io.
   - Restaurar **antes** de que arranque el backend: el `CMD` del backend corre
     `prisma migrate deploy` + seed. Con la base ya restaurada, las migraciones no tienen nada
     pendiente y el seed no toca nada (solo crea el admin si no hay ninguno y usa `upsert`
     con `update: {}`).
   - Ojo con el primer arranque de Postgres: `pg_isready` responde antes de que exista la
     base (el entrypoint levanta un server temporal para inicializar). Esperar a ver
     `PostgreSQL init process complete` en `docker logs manhattan_db`.
2. **Corte.**
   1. Congelar el viejo: `docker compose stop backend`. Desde ahí no se puede escribir nada.
   2. Dump final + `tar` de `backend/uploads`, conteos exactos, copia a la PC
      (`inmobiliaria_manhattan/backups-migracion-2026-10-07/`, fuera del repo) y al nuevo.
   3. En el nuevo: `DROP DATABASE` + `CREATE DATABASE` (la del ensayo), `pg_restore
      --single-transaction --exit-on-error`, extraer uploads, comparar conteos con `diff`
      contra los del viejo, arrancar el backend y volver a comparar después del seed.
   4. En el viejo, el frontend se reemplazó por un **reenviador** (ver 8.6) para que quien
      siguiera llegando por DNS cacheado escribiera en el nuevo y no en la base vieja.
   5. DNS en Cloudflare: los A de `@` y `www` a `82.25.74.242`, **nube gris** (DNS only).
      El TXT de `google-site-verification` no se toca nunca (Search Console). Verificar con
      `dig +short @1.1.1.1 manhattannegociosinmobiliarios.com.ar`.

### 8.5 Backup nocturno

Copiado del VPS viejo sin cambios (el contenedor, la base y el remoto se llaman igual):

- Script: `~/scripts/backup-manhattan.sh` (usuario `shelo`). Hace `pg_dump | gzip` a
  `~/backups/manhattan_db_<fecha>.sql.gz`, verifica el gzip, lo sube con rclone a
  `backblaze:igwtstore-backups` y borra los locales de más de 7 días.
- Cron: `30 3 * * *` (UTC) en el crontab de `shelo`. Log en `~/backups/cron.log`.
- rclone: instalado por apt (v1.60.1), config en `~/.config/rclone/rclone.conf` (copiada del
  viejo; es la misma cuenta B2 que usa IGWT).

Verificar que esté corriendo:

```bash
tail -5 ~/backups/cron.log
rclone ls backblaze:igwtstore-backups | grep manhattan | tail -3
```

Restaurar un backup (pisa la base actual: hacer antes un dump de lo que haya):

```bash
cd /srv/inmobiliaria-manhattan
docker compose stop backend
docker exec manhattan_db psql -U manhattan -d postgres -c "DROP DATABASE manhattan_db" -c "CREATE DATABASE manhattan_db OWNER manhattan"
gunzip -c ~/backups/manhattan_db_FECHA.sql.gz | docker exec -i manhattan_db psql -U manhattan -d manhattan_db -v ON_ERROR_STOP=1
docker compose start backend
```

> Este backup es **solo de la base**. `backend/uploads/` (los CVs de las postulaciones, que
> se guardan en disco y no en Cloudinary) no está incluido. Al 08/10/2026 no había ningún CV,
> pero a medida que lleguen postulaciones conviene sumarlos al backup.

### 8.6 Qué quedó en el VPS viejo (hasta darlo de baja)

- `manhattan_backend` y `manhattan_frontend`: **detenidos**, no borrados.
- `manhattan_db`: corriendo, con la base **congelada** al momento del corte (respaldo extra).
- `manhattan_reenvio` (nginx:alpine, `--restart unless-stopped`) en `127.0.0.1:8080`, donde
  apunta el nginx del sistema. Reenvía todo a `https://manhattan.82-25-74-242.sslip.io`
  verificando el certificado. Config en `~/manhattan-reenvio/default.conf`. Sirve para los
  visitantes que todavía tengan el DNS viejo cacheado.
- La línea de cron del backup de Manhattan quedó **comentada** (copia del crontab anterior en
  `~/crontab_antes_migracion_manhattan.bak`). La del backup de IGWT sigue igual.
- El server block `/etc/nginx/sites-available/manhattan` y el certificado de certbot siguen
  ahí. Certbot va a intentar renovarlo antes del 16/11/2026 y va a fallar (el dominio ya no
  apunta a ese VPS): es solo un aviso en los logs, no afecta a IGWT.

> ⚠️ **No borrar ese certificado** (`certbot delete`) sin antes sacar el server block de
> `sites-enabled`: el bloque apunta a los archivos del certificado, `nginx -t` fallaría,
> el próximo reload del nginx —que también sirve IGWT— no se aplicaría y un reinicio
> directamente no levantaría. Lo más simple es
> no tocar nada y que todo se vaya con el VPS viejo cuando se dé de baja.
