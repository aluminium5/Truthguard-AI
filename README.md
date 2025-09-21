# TruthGuard AI — Misinformation Detection and Education

Local full-stack scaffold (Node.js + Express backend, static frontend with Tailwind CSS).

Quick start

1. Install dependencies

```powershell
cd "c:\Users\Atharv\Desktop\Truthguard AI"
npm install
```

2. Create `.env` with your Google API key (optional, used for better analysis):

```
GOOGLE_API_KEY=YOUR_KEY_HERE
```

3. Start the server

```powershell
npm run dev
```

Open http://localhost:8080 in your browser.

Notes
- The `/api/verify` endpoint will call Google Generative Language if `GOOGLE_API_KEY` is present. Otherwise it uses a heuristic fallback.
- This scaffold is for demonstration and education; do not use as-is in production without adding authentication, rate limits, and secure secrets handling.

Testing the API

Use curl to test the verify endpoint (heuristic if no API key):

```powershell
curl -X POST -H "Content-Type: application/json" -d '{"text":"COVID-19 vaccine cures disease"}' http://localhost:8080/api/verify
```

Report an item:

```powershell
curl -X POST -H "Content-Type: application/json" -d '{"text":"This is suspicious", "reporter":"test"}' http://localhost:8080/api/report
```

Deploying to Google Cloud
- Recommend packaging as a container and deploying to Cloud Run. Provide your service account with `generativelanguage.models.generate` permission or use an API key.

Google Generative API notes
- The scaffold calls the `text-bison-001` model using the REST endpoint illustrated in `server/server.js` when `GOOGLE_API_KEY` is present. For production, prefer using a service account and the official Google Cloud client libraries with proper IAM.

Next steps
- Add authentication and rate limiting.
- Add robust logging and monitoring.
- Add image verification (reverse image search) and metadata extraction for links.

Deployment (Docker + Google Cloud Run)

1) Build and run locally with Docker (optional):

```powershell
cd "c:\Users\Atharv\Desktop\Truthguard AI"
docker build -t truthguard-ai .
docker run -p 8080:8080 --env GOOGLE_API_KEY=your_key_here truthguard-ai
```

2) Deploy with Cloud Build to Cloud Run (requires `gcloud` authenticated and project set):

```powershell
# Set project and enable APIs
gcloud config set project YOUR_PROJECT_ID
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

# Trigger a build using local cloudbuild.yaml
gcloud builds submit --config=cloudbuild.yaml .
```

After deployment, Cloud Run will provide a URL where your site is hosted.

If you want, I can attempt to build and deploy from this machine — I need your confirmation that you want me to run `docker` and `gcloud` here and that you have authenticated `gcloud` locally. If not available, I will provide exact commands to run on your machine.

CI-based deployment using GitHub Actions (no Docker/gcloud locally)

1) Create a Google Cloud service account with `Cloud Run Admin`, `Storage Admin` (for Container Registry), and `Cloud Build Editor` roles. Create and download a JSON key for the service account.

2) In your GitHub repo, add these repository Secrets (Settings → Secrets and variables → Actions):
- `GCP_PROJECT` — your GCP project id
- `GCP_SERVICE_ACCOUNT_KEY` — the full JSON contents of the service account key (paste contents)
- `GCP_REGION` — example: `us-central1`

3) Push your code to the `main` (or `master`) branch. The workflow in `.github/workflows/deploy-cloud-run.yml` will run and deploy to Cloud Run.

If you want, I can prepare the repository and push it to GitHub for you — provide the repo URL or approve the use of `gh` (GitHub CLI) if installed and authenticated here. Otherwise follow the earlier steps to publish via GitHub Desktop and then configure the Actions secrets.

