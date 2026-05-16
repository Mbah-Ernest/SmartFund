# Deploying SmartFund to DigitalOcean

Recommended plan: a single **Basic Droplet (4 GB RAM / 2 vCPU / 80 GB SSD)** at **$24/mo** (+$4.80/mo for weekly backups). Everything runs via Docker Compose on the one Droplet: the .NET 10 API, SQL Server 2022 Express (free, ≤10 GB DB), and an nginx container that serves the Vite SPA and reverse-proxies `/api` → API.

> Why not App Platform? App Platform doesn't offer Managed SQL Server, and its components are stateless so you can't host SQL Server inside them. See `.do/app.yaml` for the alternative spec if/when you migrate the EF provider to PostgreSQL.

---

## Prerequisites

- A DigitalOcean account.
- A GitHub repo containing this codebase (or copy the source up via `scp`).
- `doctl` installed locally (optional, but it makes step 1 a one-liner).
- A domain name (optional, but required for HTTPS).

---

## 1. Create the Droplet

**Via the dashboard:**

1. Create → Droplets.
2. **Image:** Ubuntu 24.04 LTS.
3. **Plan:** Basic → Regular SSD → **4 GB / 2 vCPU / 80 GB ($24/mo)**.
4. **Datacenter:** pick the region closest to your users (e.g. Frankfurt for Nigerian users — `fra1`).
5. **Authentication:** SSH key (paste your public key).
6. **Backups:** enable (+$4.80/mo). Strongly recommended — the SQL DB lives on this Droplet.
7. **Hostname:** `smartfund-prod`.
8. Click Create.

**Or via `doctl`:**

```bash
doctl compute droplet create smartfund-prod \
  --region fra1 \
  --size s-2vcpu-4gb \
  --image ubuntu-24-04-x64 \
  --enable-backups \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1)
```

Note the public IP that DO assigns — call it `$DROPLET_IP`.

---

## 2. Lock down the Droplet

SSH in as root:

```bash
ssh root@$DROPLET_IP
```

```bash
# Updates + a non-root deploy user.
apt update && apt upgrade -y
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Firewall — only SSH + HTTP/HTTPS exposed.
ufw allow OpenSSH
ufw allow http
ufw allow https
ufw --force enable
```

Log out and back in as `deploy`:

```bash
ssh deploy@$DROPLET_IP
```

---

## 3. Install Docker

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
exec sudo -i -u deploy   # re-enter the shell so group membership applies
```

Verify: `docker ps` should run without sudo.

---

## 4. Pull the source

```bash
cd ~
git clone https://github.com/YOUR_GH_USERNAME/SmartFund.git
cd SmartFund
```

(Or `scp -r` the repo from your laptop — but make sure `bin/`, `obj/`, `node_modules/`, and `.tmp-build-api/` are excluded. The provided `.dockerignore` covers builds, but a clean checkout is faster.)

---

## 5. Configure secrets

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Fill in every variable. Generate strong values:

```bash
# Strong SQL SA password (SQL Server complexity rules — upper, lower, digit, symbol, ≥8 chars):
openssl rand -base64 24 | tr -d '/+=' | head -c 24 ; echo '_A1!'

# JWT signing key (64 bytes, base64-encoded):
openssl rand -base64 64

# Operator admin password:
openssl rand -base64 24
```

**Never commit `.env` to git.** It is the only place these secrets live; rotate by editing and `docker compose up -d` again.

---

## 6. Bring the stack up

```bash
docker compose up -d --build
```

First boot takes a few minutes (SDK download, SQL Server image is ~1.5 GB). Watch progress:

```bash
docker compose logs -f api
```

What happens on first boot:

1. `db` (SQL Server) starts and creates the empty `master` schema.
2. `api` waits for `db` healthcheck to pass.
3. The startup hook in `Program.cs` (now production-enabled) runs `db.Database.Migrate()` — applies all 57 EF migrations to create `SmartFundDb`.
4. `web` (nginx) starts and proxies `/api` to `api:8080`.

---

## 7. Verify the deployment

From the Droplet:

```bash
docker compose ps                                 # all three should be "Up"
curl -fsS http://localhost/                       # should return the SPA index.html
curl -fsS http://localhost/swagger/index.html     # should return Swagger UI HTML
```

From your laptop:

```bash
curl -fsS http://$DROPLET_IP/                     # SPA HTML
curl -fsS http://$DROPLET_IP/api/...              # any API endpoint
```

Open `http://$DROPLET_IP/` in a browser. Log in with the operator username/password you set in `.env` (`AUTH_USERNAME` / `AUTH_PASSWORD`).

---

## 8. Add a domain + HTTPS (optional but recommended)

1. Point an A record for your domain (e.g. `app.smartfund.example`) at `$DROPLET_IP`.
2. Once DNS resolves, add a Caddy or Certbot terminator in front of nginx. Simplest path — swap the `web` service in `docker-compose.yml` for a Caddy container:

   ```yaml
   web:
     image: caddy:2-alpine
     restart: unless-stopped
     ports: ["80:80", "443:443"]
     volumes:
       - ./Caddyfile:/etc/caddy/Caddyfile
       - caddy-data:/data
       - caddy-config:/config
     depends_on: [api]
   ```

   With a `Caddyfile`:

   ```
   app.smartfund.example {
     root * /srv
     try_files {path} /index.html
     file_server
     handle /api/* { reverse_proxy api:8080 }
   }
   ```

   (You'll need to either bake the SPA build into the Caddy image or mount it from a volume populated by a build step.)

3. For the simpler path, keep the nginx container and put **DigitalOcean's free [Load Balancer with managed cert](https://docs.digitalocean.com/products/networking/load-balancers/)** in front — but that adds ~$12/mo, which defeats the cost goal. Caddy on the same Droplet is free.

---

## 9. Day-2 operations

| Task | Command |
|---|---|
| Tail logs | `docker compose logs -f api` |
| Restart API only | `docker compose restart api` |
| Deploy a new build | `git pull && docker compose up -d --build api web` |
| Backup the DB | `docker exec smartfund-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -Q "BACKUP DATABASE SmartFundDb TO DISK = '/var/opt/mssql/data/SmartFundDb.bak' WITH INIT"` then `docker cp smartfund-db:/var/opt/mssql/data/SmartFundDb.bak ./backup.bak` |
| Restore from backup | reverse of above + `RESTORE DATABASE ...` |
| Open a SQL shell | `docker exec -it smartfund-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C` |

DigitalOcean weekly backups of the Droplet capture the SQL volume too, so the per-DB backup above is only needed for point-in-time restores.

---

## 10. When to scale up

- **>5 GB DB size, or CPU consistently >70%:** upgrade to `s-2vcpu-8gb` ($48/mo). Droplets resize in place — `doctl compute droplet-action resize ...` with `--size s-2vcpu-8gb`.
- **DB approaches 10 GB Express limit:** split SQL Server onto its own Droplet, or migrate to PostgreSQL + DO Managed Database (then `.do/app.yaml` becomes viable).
- **Add a second region or HA:** at that point the App Platform + Postgres path is preferable.

---

## Cost summary

| Item | Monthly |
|---|---|
| Droplet `s-2vcpu-4gb` | $24.00 |
| Backups (20%) | $4.80 |
| Spaces / Managed DB | $0 |
| **Total** | **$28.80** (or $24.00 without backups) |
