import cookieParser from 'cookie-parser'
import express, { Express, Request, Response } from 'express'
import { Server } from 'http'
import fetch from 'node-fetch'
import { escape } from 'querystring'

import { session } from '../src'
import Session from '../src/Session'
import { authenticateRequest } from '../src/authenticate-middleware'

const port = 4000 + Number(process.env['JEST_WORKER_ID'])
let server: Server

async function startServer(app: Express): Promise<void> {
  await new Promise<void>((resolve) => {
    server = app.listen(port, resolve)
  })
}

afterEach(async (): Promise<void> => {
  await new Promise((resolve) => server.close(resolve))
})

describe('session-middleware', (): void => {
  it('works so request are enhanced with the session object to authenticate them', async (): Promise<void> => {
    const app = express()
    app.use(cookieParser())
    app.use(session({ trackSessionAccess: true }))

    let lastSession: Session

    app.get('/', (request: Request, response: Response): void => {
      lastSession = request.session
      response.end()
    })

    app.get('/private', authenticateRequest, async (request: Request, response: Response): Promise<void> => {
      lastSession = request.session

      response.end()
    })

    app.post('/login', async (request: Request, response: Response): Promise<void> => {
      lastSession = request.session

      await lastSession.logIn(8)

      response.end()
    })

    app.post('/logout', async (request: Request, response: Response): Promise<void> => {
      lastSession = request.session

      await lastSession.logOut()

      response.end()
    })

    await startServer(app)

    let response = await fetch(`http://localhost:${port}/`)

    expect(lastSession.authenticated).toBeFalsy()
    expect(response.status).toEqual(200)

    response = await fetch(`http://localhost:${port}/private`)

    expect(response.status).toEqual(401)

    response = await fetch(`http://localhost:${port}/login`, { method: 'post' })
    const token = lastSession.token

    expect(lastSession.authenticated).toBeTruthy()
    expect(lastSession.authenticatableId).toEqual('8')
    expect(response.status).toEqual(200)
    expect(response.headers.get('authorization')).toEqual(`bearer ${token}`)
    expect(response.headers.get('set-cookie')).toEqual(`session=${escape(token)}; Path=/`)

    response = await fetch(`http://localhost:${port}/private`, { headers: { AUTHORIZATION: `bearer ${token}` } })

    expect(response.status).toEqual(200)

    response = await fetch(`http://localhost:${port}/private`, { headers: { cookie: `session=${token}` } })

    expect(response.status).toEqual(200)

    response = await fetch(`http://localhost:${port}/logout`, { method: 'post', headers: { AUTHORIZATION: `bearer ${token}` } })

    expect(lastSession.authenticated).toBeFalsy()
    expect(response.status).toEqual(200)

    response = await fetch(`http://localhost:${port}/`)

    expect(lastSession.authenticated).toBeFalsy()
    expect(response.status).toEqual(200)

    response = await fetch(`http://localhost:${port}/private`, { headers: { AUTHORIZATION: `bearer ${token}` } })

    expect(lastSession.authenticated).toBeFalsy()
    expect(response.status).toEqual(401)
  })

  it('keeps track of all active sessions and the device id', async (): Promise<void> => {
    const app = express()
    app.use(cookieParser())
    app.use(session())

    let lastSession: Session

    app.get('/', (request: Request, response: Response): void => {
      lastSession = request.session
      response.end()
    })

    app.post('/login', async (request: Request, response: Response): Promise<void> => {
      lastSession = request.session

      await lastSession.logIn(8)

      response.end()
    })

    app.post('/login-b', async (request: Request, response: Response): Promise<void> => {
      lastSession = request.session

      await lastSession.logIn(2)

      response.end()
    })

    await startServer(app)

    await fetch(`http://localhost:${port}/login`, { method: 'post' })
    await fetch(`http://localhost:${port}/login`, { method: 'post' })

    expect(Object.values(await lastSession.activeSessions())).toEqual([
      {
        authenticatableId: '8',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        id: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      },
      {
        authenticatableId: '8',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        id: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      }
    ])

    expect(Object.values(await Session.activeSessions(8))).toEqual([
      {
        authenticatableId: '8',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        id: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      },
      {
        authenticatableId: '8',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        id: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      }
    ])

    await fetch(`http://localhost:${port}/login-b`, { method: 'post' })

    expect(Object.values(await lastSession.activeSessions())).toEqual([
      {
        id: expect.any(String),
        authenticatableId: '2',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      }
    ])

    expect(Object.values(await Session.activeSessions(2))).toEqual([
      {
        id: expect.any(String),
        authenticatableId: '2',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: null
      }
    ])

    lastSession.updateDeviceId('test-device-id')

    expect(Object.values(await lastSession.activeSessions())).toEqual([
      {
        id: expect.any(String),
        authenticatableId: '2',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: 'test-device-id'
      }
    ])

    expect(Object.values(await Session.activeSessions(2))).toEqual([
      {
        id: expect.any(String),
        authenticatableId: '2',
        firstAccessed: expect.any(Number),
        firstIp: expect.any(String),
        lastAccessed: expect.any(Number),
        lastIp: expect.any(String),
        userAgent: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        deviceId: 'test-device-id'
      }
    ])
  })
})
