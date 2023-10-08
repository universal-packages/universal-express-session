# Express Session

[![npm version](https://badge.fury.io/js/@universal-packages%2Fexpress-session.svg)](https://www.npmjs.com/package/@universal-packages/express-session)
[![Testing](https://github.com/universal-packages/universal-express-session/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-express-session/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-express-session/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-express-session)

Express session manager.

## Install

```shell
npm install @universal-packages/express-session

npm install express
```

## Middleware

#### **`session([options])`**

Initialize a Session object

```js
import { session } from '@universal-packages/express-session'
import { RedisEngine } from '@universal-packages/universal-token-registry-redis'
import express from 'express'

const engine = new RedisEngine({ host: 'localhost' })
await engine.connect()

const app = express()

app.use(session({ engine }))
```

#### Options

`Session` takes the same options as [Token Registry](https://github.com/universal-packages/universal-token-registry#options)

Additionally:

- **`cookieName`** `String` `default: "session"`
  Name of the cookie to fetch for the session token.

- **`registryId`** `String`
  String to use to add randomness to the token generation.

- **`trackSessionAccess`** `Boolean`
  Update registry every time a request is made to track ip and last access changes.

#### **`authenticateRequest`**

Use this for a simple request rejection if the session was not authenticated.If not authenticated the middleware ends the response with unauthorized status.

```js
import { authenticateRequest } from '@universal-packages/express-session'

app.get('/private', authenticateRequest, async (request, response) => {
  response.end()
})
```

### Create your own

Authenticating request is very simple you can even add your own logic like setting a current user to use later.

```js
export async function authenticateRequest(request, response, next) {
  if (request.session.authenticated) {
    request.currentUser = await User.find(request.session.authenticatableID)

    next()
  } else {
    response.status(401).end()
  }
}
```

### Request authentication

You can either set the header `Authorization` in the format `bearer <token>` or configure express to parse cookies and set a `session` cookie with the token value, more about how to get a token below.

## Session

When the middleware is in use a `Session` object will be available in the request object.

```js
app.get('/', async (request, response) => {
  const currentUser = await User.find(request.session.authenticatableID)

  response.end()
})
```

### Properties

#### authenticated `Boolean`

True whe a request was authenticated with a token.

#### id `String`

A unique id for the session aside from the token.

#### authenticatableId `String`

The same id used to create the session at log in.

#### token `String`

The token that came with the request.

#### firstAccessed `Date`

Date in which the session was created at log in.

#### lastAccessed `Date`

Date of the current moment using the session token.

#### firstIp `String`

Request ip when the session was created at log in.

#### lastIp `String`

Request ip of the current moment using the session token.

#### userAgent `String`

User agent in which the session was created at log in.

### Instance methods

#### **`logIn(authenticatableID: String)`** `Async`

Creates a new session using the authenticatable id and sets the cookie `session` as well as the `Authorization` response header to return to the user when ending the response.

#### **`logOut(token? string)`** `Async`

Disposes the current session from the registry so the token is no longer valid, or if a token is provided it will dispose that session instead.

#### **`activeSessions()`** `Async`

Returns all the active sessions for the current session authenticatable.

### Static methods

#### **`activeSessions(authenticatableId: String, [options: Object])`** `Async`

Returns all the active sessions for the authenticatable id.

- **`authenticatableId`** `String`
  The id of the authenticatable to get the active sessions from.
- **`options`** `Object`
  Same options as [Token Registry](https://github.com/universal-packages/universal-token-registry#options)

## Global methods

#### **`injectSession(request: Request, response: Response, options?: ExpressSessionOptions)`**

To only inject the session object into the request and don't behave as middle ware use this method. In case you are doing some custom middleware.

```js
import { injectSession } from '@universal-packages/express-session'
import express from 'express'

const app = express()

app.use(async (request, response, next) => {
  await injectSession(request, response, options)

  next()
})
```

## Typescript

In order for typescript to see the session prop in the `request` type you need to reference the types somewhere in your project, normally `./src/globals.ts`.

```ts
/// <reference types="@universal-packages/express-session" />
```

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
