import cron from 'node-cron';
import { syncNationwideFestivals } from '../services/festivalSyncService';

let started = false;

export function startFestivalCron() {
  if (started || process.env.VERCEL) return;
  started = true;
  cron.schedule('0 3 * * *', async () => {
    console.log('[festival-cron] 03:00 전국 권역 축제 동기화 시작');
    const result = await syncNationwideFestivals();
    console.log('[festival-cron]', result.message, result);
  }, { timezone: 'Asia/Seoul' });

  void syncNationwideFestivals()
    .then((result) => console.log('[festival-cron] 기동 시 동기화', result.message))
    .catch((err) => console.error('[festival-cron] 기동 시 동기화 실패', err));
}
