import { connectionString, databaseHost, isNeonHost, shouldUseSsl } from './pool';

export function errorText(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof AggregateError !== 'undefined' && error instanceof AggregateError) {
    const nested = error.errors.map(errorText).filter((text) => text && !text.includes('비어 있습니다'));
    if (nested.length) return nested.join(' · ');
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; detail?: unknown };
    const parts = [record.message, record.code, record.detail]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  return 'DB 오류 메시지가 비어 있습니다. DATABASE_URL과 Neon 상태를 확인하세요.';
}

export function databaseChecks() {
  const host = databaseHost();
  const neon = isNeonHost(host);
  const local = host === 'localhost' || host === '127.0.0.1';
  const set = Boolean(connectionString);
  const hints: string[] = [];

  if (!set) {
    hints.push('backend/.env에 DATABASE_URL이 없습니다. git pull은 .env를 갱신하지 않습니다.');
  } else if (local) {
    hints.push('현재 DATABASE_URL은 로컬 Postgres입니다. Neon 콘솔의 연결 문자열로 바꿔야 원격 DB에 붙습니다.');
    hints.push('이 서버 기본 포트는 4000입니다. curl은 http://localhost:4000/api/db-test 를 사용하세요.');
  } else if (!neon) {
    hints.push(`호스트 ${host} 는 neon.tech가 아닙니다. Neon 콘솔 Endpoint가 Active인지, 복사한 URL이 맞는지 확인하세요.`);
  } else {
    hints.push('Neon 콘솔에서 프로젝트가 Active인지, 비밀번호·브랜치 엔드포인트가 맞는지 확인하세요.');
  }

  return {
    databaseUrlSet: set,
    host: host || '(empty)',
    looksNeon: neon,
    looksLocalhost: local,
    sslEnabled: shouldUseSsl(),
    listenPort: process.env.PORT || '4000',
    hints,
  };
}
