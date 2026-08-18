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
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

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

> **Actualización (17/08/2026):** el dominio ya se compró en NIC.ar y esta
> sección quedó reemplazada por el **paso 6**, que tiene el procedimiento
> completo y concreto (delegación en NIC.ar, server block de nginx, certbot y
> cierre del 8080). Se eligió certbot + nginx en vez de Caddy porque el nginx
> del sistema ya está instalado y sirviendo IGWT: meter Caddy implicaría
> disputarle los puertos 80/443 a un sitio que ya está en producción.
