import { NextFunction, Request, Response } from 'express'

export async function authenticateRequest(request: Request, response: Response, next: NextFunction): Promise<void> {
  if (!request.session.authenticated) {
    response.status(401).end()
  } else {
    next()
  }
}
