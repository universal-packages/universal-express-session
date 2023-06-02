import { generateToken } from '@universal-packages/crypto-utils'
import { MemoryEngine, Registry } from '@universal-packages/token-registry'
import { Request, Response } from 'express'

import { ExpressSessionOptions, SessionRegistrySubject } from './types'

// All sessions share this memory engine
const MEMORY_ENGINE = new MemoryEngine()

export default class Session {
  public id: string = null
  public authenticated: boolean = false
  public authenticatableId: string = null
  public token: string = null
  public firstAccessed: Date = null
  public lastAccessed: Date = null
  public firstIp: string = null
  public lastIp: string = null
  public userAgent: string = null
  public deviceId: string = null

  private readonly registry: Registry<SessionRegistrySubject>
  private readonly request: Request
  private readonly response: Response
  private readonly options: ExpressSessionOptions

  public constructor(request: Request, response: Response, options?: ExpressSessionOptions) {
    this.options = { engine: MEMORY_ENGINE, cookieName: 'session', ...options }
    const engine = this.options.engine === 'memory' ? MEMORY_ENGINE : this.options.engine

    this.registry = new Registry({ engine: engine, engineOptions: this.options.engineOptions, seed: this.options.registryId || this.options.seed })
    this.request = request
    this.response = response
  }

  public async initialize(): Promise<void> {
    await this.registry.initialize()

    const token = this.getTokenFromHeader() || this.getTokenFromCookies()

    if (token) {
      const subject = await this.registry.retrieve(token)

      if (subject) {
        this.id = subject.id
        this.token = token
        this.authenticated = true
        this.authenticatableId = subject.authenticatableId
        this.firstAccessed = new Date(subject.firstAccessed)
        this.lastAccessed = new Date()
        this.firstIp = subject.firstIp
        this.lastIp = this.request.ip
        this.userAgent = subject.userAgent
        this.deviceId = subject.deviceId

        if (this.options.trackSessionAccess) {
          const category = `auth-${subject.authenticatableId}`

          await this.registry.register(
            token,
            {
              ...subject,
              lastAccessed: this.lastAccessed.getTime(),
              lastIp: this.lastIp
            },
            category
          )
        }
      }
    }
  }

  public async logIn(authenticatableId: string | number | bigint): Promise<void> {
    this.id = generateToken({ seed: String(authenticatableId) })
    this.authenticated = true
    this.authenticatableId = String(authenticatableId)
    this.firstAccessed = new Date()
    this.lastAccessed = new Date()
    this.firstIp = this.request.ip
    this.lastIp = this.request.ip
    this.userAgent = this.request.headers['user-agent']

    const category = `auth-${authenticatableId}`

    this.token = await this.registry.register(
      {
        id: this.id,
        authenticatableId: this.authenticatableId,
        firstAccessed: this.firstAccessed.getTime(),
        lastAccessed: this.lastAccessed.getTime(),
        firstIp: this.firstIp,
        lastIp: this.lastIp,
        userAgent: this.userAgent,
        deviceId: this.deviceId
      },
      category
    )

    this.response.header('authorization', `bearer ${this.token}`)
    this.response.cookie(this.options.cookieName, this.token)
  }

  public async logOut(token?: string): Promise<void> {
    if (this.authenticated) {
      if (token) {
        await this.registry.dispose(token)
      } else {
        await this.registry.dispose(this.token)

        this.id = null
        this.authenticated = false
        this.token = null
        this.authenticatableId = null
        this.firstAccessed = null
        this.lastAccessed = null
        this.firstIp = null
        this.lastIp = null
        this.userAgent = null
      }
    }
  }

  public async activeSessions(): Promise<Record<string, SessionRegistrySubject>> {
    if (this.authenticated) {
      const category = `auth-${this.authenticatableId}`

      return await this.registry.retrieveAll(category)
    }
  }

  public async updateDeviceId(deviceId: string): Promise<void> {
    if (this.authenticated) {
      this.deviceId = deviceId

      const category = `auth-${this.authenticatableId}`

      await this.registry.register(
        this.token,
        {
          id: this.id,
          authenticatableId: this.authenticatableId,
          firstAccessed: this.firstAccessed.getTime(),
          lastAccessed: this.lastAccessed.getTime(),
          firstIp: this.firstIp,
          lastIp: this.lastIp,
          userAgent: this.userAgent,
          deviceId: this.deviceId
        },
        category
      )
    }
  }

  private getTokenFromHeader(): string {
    const header = this.request.headers.authorization

    if (header) {
      const token = header.split(' ')[1]

      return token
    }
  }

  private getTokenFromCookies(): string {
    const cookies = this.request.cookies

    if (cookies) {
      return cookies[this.options.cookieName]
    }
  }
}
