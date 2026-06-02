# API Reference

Tested against Help Scout Mailbox API v2.0 as of 2026-05-27.

This document lists every Help Scout API endpoint used by hscli, including request/response details, the CLI command that calls it, and known quirks.

Base URL: `https://api.helpscout.net`

---

## Authentication

### POST /v2/oauth2/token

Exchange credentials for an access token.

| Detail       | Value                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Content-Type | `application/x-www-form-urlencoded`                                                              |
| Response     | `200 OK` -- JSON                                                                                 |
| CLI commands | `hscli auth login`, `hscli auth setup`, `hscli auth refresh`                                     |
| Docs         | [OAuth 2.0 Authentication](https://developer.helpscout.com/mailbox-api/overview/authentication/) |

**Request body (form-urlencoded):**

```
grant_type=authorization_code|client_credentials|refresh_token
client_id=<app_id>
client_secret=<app_secret>
code=<auth_code>              # authorization_code only
redirect_uri=<redirect_uri>   # authorization_code only
refresh_token=<refresh_token> # refresh_token only
```

**Response:**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 172800
}
```

**Quirks:**

- The token endpoint requires `application/x-www-form-urlencoded`, **not** `application/json`. Sending JSON will return a 400 error. This differs from many modern OAuth implementations.
- `expires_in` is 172800 seconds (48 hours) for both grant types.
- The `refresh_token` field is only present in Authorization Code responses, not Client Credentials responses.

---

## Conversations

### GET /v2/conversations

List conversations with optional filters.

| Detail       | Value                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                              |
| Response     | `200 OK` -- JSON (paginated)                                                                    |
| CLI command  | `hscli conv list`                                                                               |
| Docs         | [List Conversations](https://developer.helpscout.com/mailbox-api/endpoints/conversations/list/) |

**Query parameters:**

| Param           | Type    | Notes                                        |
| --------------- | ------- | -------------------------------------------- |
| `status`        | string  | `active`, `pending`, `closed`, `spam`, `all` |
| `mailbox`       | integer | Mailbox ID                                   |
| `tag`           | string  | Filter by tag name                           |
| `assigned_to`   | integer | User ID                                      |
| `query`         | string  | Search query                                 |
| `modifiedSince` | string  | ISO 8601 datetime                            |
| `page`          | integer | Page number (1-indexed)                      |

**Response:**

```json
{
  "_embedded": {
    "conversations": [...]
  },
  "page": {
    "size": 50,
    "totalElements": 123,
    "totalPages": 3,
    "number": 1
  }
}
```

**Quirks:**

- Pagination is **1-indexed** (first page is `page=1`, not `page=0`).
- `modifiedSince` rejects timestamps with milliseconds. The CLI strips `.NNNz` to produce `YYYY-MM-DDTHH:mm:ssZ`.

---

### GET /v2/conversations/:id

Get a single conversation by ID, including thread details.

| Detail       | Value                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                           |
| Response     | `200 OK` -- JSON                                                                             |
| CLI command  | `hscli conv get <id>`                                                                        |
| Docs         | [Get Conversation](https://developer.helpscout.com/mailbox-api/endpoints/conversations/get/) |

**Response:** Full conversation object with `_embedded` threads.

---

### POST /v2/conversations

Create a new conversation.

| Detail       | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                                 |
| Response     | `201 Created` -- JSON                                                                              |
| CLI command  | `hscli conv create`                                                                                |
| Docs         | [Create Conversation](https://developer.helpscout.com/mailbox-api/endpoints/conversations/create/) |

**Request body:**

```json
{
  "subject": "Help needed",
  "type": "email",
  "mailboxId": 123,
  "customer": { "email": "user@example.com" },
  "threads": [{ "type": "customer", "text": "Message body" }],
  "status": "active",
  "tags": ["billing"],
  "assignTo": 456
}
```

**Notes:**

- `type` can be `email`, `chat`, or `phone`.
- `tags` is an array of tag name strings.
- `assignTo` is optional; set to a user ID to assign on creation.

---

### POST /v2/conversations/:id/reply

Add a customer-facing reply to a conversation.

| Detail       | Value                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                                   |
| Response     | `201 Created`                                                                                        |
| CLI command  | `hscli conv reply <id>`                                                                              |
| Docs         | [Create Thread](https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/create/) |

**Request body:**

```json
{
  "type": "reply",
  "text": "Thanks for reaching out",
  "draft": false,
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

**Notes:**

- Set `draft: true` to save without sending.
- `cc` and `bcc` are optional arrays of email strings.

---

### POST /v2/conversations/:id/notes

Add an internal note (not visible to the customer).

| Detail       | Value                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                                   |
| Response     | `201 Created`                                                                                        |
| CLI command  | `hscli conv note <id>`                                                                               |
| Docs         | [Create Thread](https://developer.helpscout.com/mailbox-api/endpoints/conversations/threads/create/) |

**Request body:**

```json
{
  "type": "note",
  "text": "Internal note content"
}
```

---

### PATCH /v2/conversations/:id

Update conversation fields using JSON Patch (RFC 6902).

| Detail       | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Content-Type | `application/json-patch+json`                                                                      |
| Response     | `204 No Content`                                                                                   |
| CLI commands | `hscli conv status`, `hscli conv assign`, `hscli conv move`                                        |
| Docs         | [Update Conversation](https://developer.helpscout.com/mailbox-api/endpoints/conversations/update/) |

**Request body (status change):**

```json
[{ "op": "replace", "path": "/status", "value": "closed" }]
```

**Request body (assign):**

```json
[{ "op": "replace", "path": "/assignTo", "value": 456 }]
```

**Request body (move to another mailbox):**

```json
[{ "op": "replace", "path": "/mailboxId", "value": 789 }]
```

**Notes:**

- Uses `application/json-patch+json` content type, not regular `application/json`.
- Multiple operations can be sent in a single request.

---

### PUT /v2/conversations/:id/tags

Replace all tags on a conversation.

| Detail       | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                       |
| Response     | `204 No Content`                                                                         |
| CLI command  | `hscli conv tag <id>`                                                                    |
| Docs         | [Update Tags](https://developer.helpscout.com/mailbox-api/endpoints/conversations/tags/) |

**Request body:**

```json
{
  "tags": ["billing", "urgent"]
}
```

**Notes:**

- This is a **full replacement** -- it sets the complete tag list. The CLI handles add/remove by first fetching current tags (via GET), merging the changes, then sending the full list.

---

### DELETE /v2/conversations/:id

Delete a conversation.

| Detail       | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                                 |
| Response     | `204 No Content`                                                                                   |
| CLI command  | `hscli conv delete <id>`                                                                           |
| Docs         | [Delete Conversation](https://developer.helpscout.com/mailbox-api/endpoints/conversations/delete/) |

**Notes:**

- The CLI prompts for confirmation before deleting. Use `--yes` to skip the prompt.

---

## Mailboxes

### GET /v2/mailboxes

List all mailboxes.

| Detail       | Value                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                      |
| Response     | `200 OK` -- JSON (paginated)                                                            |
| CLI command  | `hscli mailbox list`                                                                    |
| Docs         | [List Mailboxes](https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/list/) |

**Response:**

```json
{
  "_embedded": {
    "mailboxes": [...]
  },
  "page": { ... }
}
```

---

### GET /v2/mailboxes/:id

Get a single mailbox by ID.

| Detail       | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                  |
| Response     | `200 OK` -- JSON                                                                    |
| CLI command  | `hscli mailbox get <id>`                                                            |
| Docs         | [Get Mailbox](https://developer.helpscout.com/mailbox-api/endpoints/mailboxes/get/) |

---

## Users

### GET /v2/users/me

Get the currently authenticated user.

| Detail       | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| Content-Type | `application/json`                                                                  |
| Response     | `200 OK` -- JSON                                                                    |
| CLI commands | `hscli user me`, `hscli auth status`, `hscli conv assign <id> --user me`            |
| Docs         | [Get Current User](https://developer.helpscout.com/mailbox-api/endpoints/users/me/) |

**Response:**

```json
{
  "id": 123,
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "role": "owner",
  "timezone": "America/New_York"
}
```

---

## Customers

### POST /v2/customers

Create a new customer.

| Detail       | Value                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Content-Type | `application/json`                                                                         |
| Response     | `201 Created` -- JSON                                                                      |
| CLI command  | `hscli customer create`                                                                    |
| Docs         | [Create Customer](https://developer.helpscout.com/mailbox-api/endpoints/customers/create/) |

**Request body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "emails": [{ "value": "jane@example.com" }],
  "phones": [{ "value": "555-1234" }],
  "organization": "Acme",
  "jobTitle": "Support Lead"
}
```

**Notes:**

- `emails` and `phones` are arrays of objects with a `value` field, not plain strings.

---

### PATCH /v2/customers/:id

Update a customer using JSON Patch.

| Detail       | Value                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------ |
| Content-Type | `application/json-patch+json`                                                              |
| Response     | `204 No Content`                                                                           |
| CLI command  | `hscli customer update <id>`                                                               |
| Docs         | [Update Customer](https://developer.helpscout.com/mailbox-api/endpoints/customers/update/) |

**Request body:**

```json
[
  { "op": "replace", "path": "/firstName", "value": "Janet" },
  {
    "op": "replace",
    "path": "/emails",
    "value": [{ "value": "new@example.com" }]
  }
]
```

**Notes:**

- Uses `application/json-patch+json` content type.
- Supported paths: `/firstName`, `/lastName`, `/organization`, `/jobTitle`, `/emails`, `/phones`.

---

## Common Patterns

### Pagination

All list endpoints use page-based pagination:

- Pages are **1-indexed** (`page=1` is the first page).
- Response includes a `page` object with `totalElements`, `totalPages`, `size`, and `number`.
- Resources are nested under `_embedded.<resourceKey>` (e.g. `_embedded.conversations`).

### Error Responses

Non-2xx responses return:

```json
{
  "message": "Description of the error",
  "status": 422
}
```

### Rate Limiting

- Rate-limited requests return `429 Too Many Requests`.
- The `x-ratelimit-retry-after` header indicates how many seconds to wait.
- The CLI automatically retries with the indicated delay (up to 3 attempts). Use `--no-retry` to disable.

### Authentication Header

All API requests (except `/v2/oauth2/token`) require:

```
Authorization: Bearer <access_token>
```

---

## Known Limitations

Operations **not available** in the public Mailbox API v2:

- **Delete thread/note**: Only via Help Scout web UI (internal `/api/v1/` with session auth). The public API returns `400` on `DELETE /v2/conversations/:id/threads/:threadId` — only `PATCH` is supported on threads.
- **OAuth apps are account-scoped**: No public/shared app model. Each user must create their own OAuth app in Help Scout.
- **PATCH format**: Conversation patches use a single JSON Patch object `{op, path, value}`, not an array `[{...}]`. Customer patches use the array format.
- **Reply requires customer**: `POST /v2/conversations/:id/reply` requires a `customer: {id}` field in the body. The CLI fetches the conversation first to resolve this automatically.
