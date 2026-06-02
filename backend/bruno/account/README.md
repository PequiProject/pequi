# Account API notes

`GET /v1/account/export` returns stored `image_url` and `image_key` values for body map records as data-access references. These values can be expired, unavailable, or already removed from object storage after account deletion. Clients must treat them as best-effort references, not guaranteed downloadable URLs.
