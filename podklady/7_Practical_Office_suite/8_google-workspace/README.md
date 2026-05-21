
# Human Steps

Ideal for most cases, using a browser login. Viz https://www.youtube.com/watch?v=CB_2uB10iQk&t=535s


```
gws auth setup 
gws auth login
```


# Service Account Steps

Ideal for fully automated / containerized environments — no browser login needed.

## 1. Create or select a GCP project

Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or select an existing one).

Note your **Project ID** — you'll need it in the following steps.

## 2. Enable Google Workspace APIs

Go to **APIs & Services → Library** in your project:
`https://console.cloud.google.com/apis/library?project=<PROJECT_ID>`

Enable the APIs you need. Common ones:

- Gmail API
- Google Drive API
- Google Calendar API
- Google Sheets API
- Google Docs API
- Google Slides API
- Google Tasks API
- People API
- Admin SDK API

## 3. Create a Service Account

1. Go to **IAM & Admin → Service Accounts**:
   `https://console.cloud.google.com/iam-admin/serviceaccounts?project=<PROJECT_ID>`
2. Click **Create Service Account**
3. Give it a name (e.g. `gws-agent`) and description
4. Click **Create and Continue**
5. (Optional) Grant roles — not needed for Workspace access via delegation
6. Click **Done**

## 4. Create and download the JSON key

1. Click on the newly created service account
2. Go to the **Keys** tab
3. Click **Add Key → Create new key**
4. Select **JSON** and click **Create**
5. Save the downloaded file (e.g. `service-account.json`) somewhere safe

## 5. Enable Domain-Wide Delegation on the Service Account

1. In the service account detail page, click **Show advanced settings** (or find the **Domain-wide delegation** section)
2. Check **Enable Google Workspace Domain-wide Delegation**
3. Note the **Client ID** (numeric) — you'll need it in the next step

## 6. Configure Domain-Wide Delegation in Google Admin Console

This step authorizes the service account to access Workspace data.

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security → Access and data control → API controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Enter the **Client ID** from Step 5
6. Add the required **OAuth scopes** (comma-separated), for example:

```
https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/documents,https://www.googleapis.com/auth/presentations,https://www.googleapis.com/auth/tasks,https://www.googleapis.com/auth/contacts
```

7. Click **Authorize**

## 7. Configure gws-cli

Point `gws-cli` to your service account key file:

```bash
export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/path/to/service-account.json
```

For Docker / containers, mount the key file and set the env var in your `docker-compose.yml` or Kubernetes manifest.

## 8. Test

```bash
gws drive files list
gws gmail users messages list --params '{"userId": "me"}'
```

If everything is set up correctly, you should see results without any browser login prompt.