import { RegistryOptions } from '@universal-packages/token-registry'

export interface ExpressSessionOptions extends RegistryOptions {
  cookieName?: string
  registryId?: string
  trackSessionAccess?: boolean
}

export interface SessionRegistrySubject {
  id: string
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
