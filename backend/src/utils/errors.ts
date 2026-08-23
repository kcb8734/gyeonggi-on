export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export function errorStatus(err: unknown, fallback = 500) {
  if (err instanceof AppError) return err.status;
  return fallback;
}

export function errorMessage(err: unknown, fallback = '요청 처리에 실패했습니다.') {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
