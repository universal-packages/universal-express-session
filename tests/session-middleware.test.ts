import cookieParser from 'cookie-parser'
import express, { Express, Request, Response } from 'express'
import { Server } from 'http'
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

    await fGet()

    expect(lastSession.authenticated).toBeFalsy()
    expect(fResponse).toHaveReturnedWithStatus('OK')

    await fGet('/private')

    expect(fResponse).toHaveReturnedWithStatus('UNAUTHORIZED')

    await fPost('/login')

    const token = lastSession.token

    expect(lastSession.authenticated).toBeTruthy()
    expect(lastSession.authenticatableId).toEqual('8')
    expect(fResponse).toHaveReturnedWithStatus('OK')
    expect(fResponse.headers.get('authorization')).toEqual(`bearer ${token}`)
    expect(fResponse.headers.get('set-cookie')).toEqual(`session=${escape(token)}; Path=/`)

    fAuthorization(`bearer ${token}`)
    await fGet('/private')
    expect(fResponse).toHaveReturnedWithStatus('OK')

    fHeaders({ cookie: `session=${token}` })
    await fGet('/private')
    expect(fResponse).toHaveReturnedWithStatus('OK')

    fAuthorization(`bearer ${token}`)
    await fPost('/logout')
    expect(lastSession.authenticated).toBeFalsy()
    expect(fResponse).toHaveReturnedWithStatus('OK')

    fAuthorization(undefined)
    await fGet()
    expect(lastSession.authenticated).toBeFalsy()
    expect(fResponse).toHaveReturnedWithStatus('OK')

    fAuthorization(`bearer ${token}`)
    await fGet('/private')
    expect(lastSession.authenticated).toBeFalsy()
    expect(fResponse).toHaveReturnedWithStatus('UNAUTHORIZED')
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

    await fPost('/login')
    await fPost('/login')

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

    await fPost('/login-b')

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
