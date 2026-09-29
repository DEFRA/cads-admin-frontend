# cads-admin-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_cads-admin-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_cads-admin-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_cads-admin-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_cads-admin-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_cads-admin-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_cads-admin-frontend)

CADS ADMIN MONITORING Node.js frontend service for the CADS platform.

This service now runs as part of the unified CADS local platform, alongside the backend and shared infrastructure provided by the **cads-tools** repository.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd cads-admin-frontend
nvm use
```

## Server-side Caching

The service uses Catbox for server-side caching.

- In production → CatboxRedis
- In local development → CatboxMemory (default)

You can override this using:

```
SESSION_CACHE_ENGINE=redis
SESSION_CACHE_ENGINE=memory
```

Note: memory is not suitable for production.

## Redis

Redis is provided by the **cads-tools** shared infrastructure.

During local development:

- Redis runs in Docker (via cads-tools)
- It is exposed on localhost:6379
- The UI connects to it automatically when SESSION_CACHE_ENGINE=redis

You do **not** need to run Redis inside this repo.

## Proxy

The service uses a forward proxy by default.
HTTP clients using `undici` automatically pick up the proxy dispatcher.
If you use a custom HTTP client, you may need to pass the dispatcher manually:

```
import { ProxyAgent } from 'undici'

await fetch(url, {
  dispatcher: new ProxyAgent(proxyUrl)
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm ci
```

### Environment variables

During local development, you will need to create an `.env` file in the root of your project. Variables found in this file will be loaded in first for local development. You can see the template required with the `.env.example` file which is included in source control.

```
# Environment configuration
NODE_ENV=development
APP_BASE_URL=http://localhost:3010

# OIDC authentication
OIDC_CLIENT_ID=local-cads-admin-frontend
OIDC_CLIENT_SECRET=local-mock-secret
OIDC_ENABLE_DEBUG_ENDPOINTS=true

OIDC_REDIRECT_PATH=/auth/callback
OIDC_POST_LOGOUT_REDIRECT_PATH=/auth/signed-out
# Comma-separated internal + external origins used to register redirect URIs with the IdP
OIDC_ALLOWED_REDIRECT_ORIGINS=http://localhost:3010
OIDC_POST_LOGIN_REDIRECT_URI=/dashboard

## Internal endpoints (server OIDC mock)
OIDC_WELL_KNOWN_URL=http://localhost:5557/.well-known/openid-configuration

## External endpoint (browser OIDC mock)
OIDC_AUTHORIZATION_ENDPOINT=http://localhost:5557/connect/authorize
OIDC_END_SESSION_ENDPOINT=http://localhost:5557/connect/endsession

## Resource: CADS CDS
AZURE_CLIENT_CADS_CDS_ID=local-cads-cds
USE_SIMPLE_SCOPES=true

# Session configuration
SESSION_CACHE_ENGINE=redis
SESSION_COOKIE_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REDIS_KEY_PREFIX=local-cads-admin-frontend
USE_SINGLE_INSTANCE_CACHE=true
REDIS_TLS=false

# CADS CDS: Backend
CADS_BACKEND_URL=http://localhost:5555
```

**Note.** The Redis password must be complex and a minimum of 32 chars.

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag cads-admin-frontend`

Build:

```bash
docker build --target development --no-cache --tag cads-admin-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 cads-admin-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag cads-admin-frontend .
```

Run:

```bash
docker run -p 3000:3000 cads-admin-frontend
```

### Docker Compose

Redis, the CADS CDS backend and the mock OIDC service is provided by the **cads-tools** shared infrastructure.

- You do not need to run this service within docker

During local development, you should run this service using:

```
npm run dev
```
## Auth configuration: Resources, roles and permissions

### OAuth resources

**CADS CDS: Azure AD**

- `admin.db.execute`
- `admin.s3.manager`
- `admin.queue.manager`

### Roles

**CADS ADMIN MONITORING: Roles**

- `cads-admin-superuser`

## Azure AD Configuration

### DEV
**CADS ADMIN MONITORING**
- Name: O365-CADS-ADMIN-DEV
- ClientId: XXXX
- Secret: XYZ
- Expiry: XX/XX/XXXX
- Redirect URL: https://cads-admin-frontend.dev.cdp-int.defra.cloud/auth/callback
- Logout URL: https://cads-admin-frontend.dev.cdp-int.defra.cloud/auth/sign-out
- Implicit grant: access tokens and ID tokens
- Roles: cads-admin-superuser
- Refresh: offline access
- API permissions to `O365-CADS-ADMIN-DEV` (`XXXX`) as an authorised client app to `O365-CADS-CDS-DEV` (`e5acc07b-a696-4998-9bb6-93573ec237b3`)
  - With scope: `api://e5acc07b-a696-4998-9bb6-93573ec237b3/admin.db.execute"`
  - With scope: `api://e5acc07b-a696-4998-9bb6-93573ec237b3/admin.s3.manager"`
  - With scope: `api://e5acc07b-a696-4998-9bb6-93573ec237b3/admin.queue.manager"`
- API permissions to `O365-CADS-ADMIN-DEV` (`XXXX`) as an authorised client app to `O365-CADS-BRIDGE-DEV` (`XXXX`)
  - With scope: `api://e5acc07b-a696-4998-9bb6-93573ec237b3/admin.s3.manager"`
  - With scope: `api://e5acc07b-a696-4998-9bb6-93573ec237b3/admin.queue.manager"`

**CADS CDS**

- Name: O365-CADS-CDS-DEV
- ClientId: e5acc07b-a696-4998-9bb6-93573ec237b3
- Scope: admin.db.execute, admin.s3.manager, admin.queue.manager

**CADS BRIDGE**

- Name: O365-CADS-BRIDGE-DEV
- ClientId: XXXX
- Scope: admin.s3.manager, admin.queue.manager

**AAD**

- Well-known: https://6f504113-6b64-43f2-ade9-242e05780007/.well-known/openid-configuration

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
