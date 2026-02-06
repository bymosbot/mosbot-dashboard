# Cloudflare Access Setup for MosBot

This document describes the Cloudflare Access configuration required for the MosBot dashboard and API to work correctly with authentication.

## Overview

The MosBot system consists of:

- **Dashboard**: `mosbot.bymos.dev` (frontend)
- **API**: `api-mosbot.bymos.dev` (backend)

Both are protected by Cloudflare Access, which requires proper CORS and cookie configuration for cross-origin requests to work.

## Cloudflare Access Configuration

### 1. Cookie Settings

Configure these settings in **both** Cloudflare Access applications (dashboard and API):

```yaml
Cookie Domain: .bymos.dev
Same Site Attribute: Lax
HTTP Only: Enabled
Enable Binding Cookie: Enabled
Secure: Enabled (default)
```

**Why these settings?**

- **Cookie Domain**: `.bymos.dev` (with leading dot) allows the cookie to be shared across subdomains
- **SameSite: Lax**: Both domains share the same parent domain (`bymos.dev`), so they're considered same-site. `Lax` provides CSRF protection while allowing same-site requests
- **HTTP Only**: Prevents JavaScript access to the cookie (security best practice)
- **Binding Cookie**: Adds extra security by binding the token to the browser
- **Secure**: Ensures cookies are only sent over HTTPS

### 2. CORS Settings

Configure these settings in the **API** Cloudflare Access application (`api-mosbot.bymos.dev`):

```yaml
Allowed Origins: https://mosbot.bymos.dev
Allowed Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Allowed Headers: Content-Type, Authorization, X-Requested-With, Accept
Allow Credentials: true
Max Age: 86400
```

**Why these settings?**

- **Allowed Origins**: Explicitly allow requests from the dashboard domain
- **Allowed Methods**: Include all HTTP methods your API uses
- **Allowed Headers**: Include all headers your API client sends
- **Allow Credentials**: Required to send cookies with cross-origin requests
- **Max Age**: Cache preflight responses for 24 hours to reduce overhead

### 3. Session Duration

Configure session duration based on your security requirements:

```yaml
Session Duration: 24 hours (recommended)
```

## Dashboard Configuration

The dashboard's API client has been configured with `withCredentials: true` to send cookies with all requests:

```javascript
// src/api/client.js
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Required to send Cloudflare Access auth cookie
});
```

## API Configuration

The API has CORS configured to accept requests from the dashboard:

```javascript
// src/index.js
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);
```

The `CORS_ORIGIN` environment variable is set in the Kubernetes ConfigMap:

```yaml
# apps/homelab/mosbot/overlays/homelab/configmap.yaml
CORS_ORIGIN: "https://mosbot.bymos.dev"
```

## Authentication Flow

1. User visits `mosbot.bymos.dev`
2. Cloudflare Access redirects to authentication (Google)
3. After authentication, Cloudflare sets a cookie with domain `.bymos.dev`
4. Dashboard makes API requests to `api-mosbot.bymos.dev` with `withCredentials: true`
5. Browser automatically includes the Cloudflare Access cookie
6. Cloudflare Access validates the cookie and allows the request
7. API processes the request and returns response

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. **Check Cloudflare Access CORS settings**: Ensure the API application has CORS configured
2. **Check cookie settings**: Ensure `SameSite` is set to `Lax` (not `None`)
3. **Check dashboard API client**: Ensure `withCredentials: true` is set
4. **Check API CORS middleware**: Ensure `credentials: true` is set

### Authentication Errors

If users can't authenticate:

1. **Check cookie domain**: Ensure it's set to `.bymos.dev` (with leading dot)
2. **Check session duration**: Ensure it's not too short
3. **Check Access policies**: Ensure both applications use the same Access Group

### Cookie Not Being Sent

If the browser isn't sending the cookie:

1. **Check SameSite attribute**: Should be `Lax` for same-site requests
2. **Check Secure attribute**: Should be enabled for HTTPS
3. **Check cookie domain**: Should be `.bymos.dev` to work across subdomains
4. **Check withCredentials**: Should be `true` in the API client

## Alternative: Service Token Authentication

If you want the dashboard to access the API without user authentication, you can use Cloudflare Access Service Tokens:

1. Create a Service Token in Cloudflare Zero Trust
2. Add the token to your dashboard's API client headers:

   ```javascript
   headers: {
     'CF-Access-Client-Id': 'your-client-id',
     'CF-Access-Client-Secret': 'your-client-secret',
   }
   ```

3. Create a Service Auth policy in the API's Access application

This approach is useful for machine-to-machine authentication but requires managing secrets.

## References

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Axios withCredentials](https://axios-http.com/docs/req_config)
