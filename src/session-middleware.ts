import { NextFunction, Request, RequestHandler, Response } from 'express'
import Session from './Session'
import { ExpressSessionOptions } from './types'

export function session(options?: ExpressSessionOptions): RequestHandler {
  return async function session(request: Request, response: Response, next: NextFunction): Promise<void> {
    await injectSession(request, response, options)

    next()
  }
}

export async function injectSession(request: Request, response: Response, options?: ExpressSessionOptions): Promise<void> {
  request.session = new Session(request, response, options)

  await request.session.initialize()
}
