import { EngineInterface } from '@universal-packages/token-registry'

export interface ExpressSessionOptions {
  cookieName?: string
  engine?: EngineInterface
  registryId?: string
  trackSessionAccess?: boolean
}

export interface SessionRegistrySubject {
  authenticatableId: string
  firstAccessed: number
  lastAccessed: number
  firstIp: string
  lastIp: string
  userAgent: string
}

declare global {
  namespace Express {
    interface Request {
      session: import('./Session').default
    }
  }
}
