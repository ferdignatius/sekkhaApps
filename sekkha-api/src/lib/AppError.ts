export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message)
    this.name = "AppError"
  }

  get statusCode(): number {
    return this.status
  }
}
