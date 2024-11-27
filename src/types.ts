import { RegistryOptions } from '@universal-packages/token-registry'

export interface ExpressSessionOptions extends RegistryOptions {
  cookieName?: string
  registryId?: string
  trackSessionAccess?: boolean
}

export interface SessionRegistrySubject {
  id: string
  userId: number | string | bigint
  firstAccessed: number
  lastAccessed: number
  firstIp: string
  lastIp: string
  userAgent: string
  deviceId: string
}

declare global {
  namespace Express {
    interface Request {
      session: import('./Session').default
    }
  }
}
