import { Request, Response } from 'express';
import { getRewardBalance, grantFeedReward } from '../services/rewardService';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';

/** POST /api/feeds — 현장 피드 업로드 시 지자체 1:1 매칭 리워드 지급 */
export const createFeed = async (req: Request, res: Response) => {
  const userId = String(req.body?.user_id ?? req.user?.userId ?? DEV_USER_ID);
  const festivalId = String(req.body?.festival_id ?? '').trim();
  const festivalTitle = String(req.body?.festival_title ?? '').trim();
  const caption = String(req.body?.caption ?? '').trim();
  const imageUrl = String(req.body?.image_url ?? '').trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!festivalId) {
    return res.status(400).json({ success: false, message: '현장 인증을 위해 축제를 선택해주세요.' });
  }
  if (!caption) {
    return res.status(400).json({ success: false, message: '한 줄 소개를 입력해주세요.' });
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ success: false, message: 'GPS 위치 인증이 필요합니다.' });
  }

  try {
    const reward = grantFeedReward({ userId, festivalId, festivalTitle });
    return res.json({
      success: true,
      message: reward.awarded
        ? `지자체 1:1 매칭 ${reward.points.toLocaleString()}P와 지역화폐 쿠폰이 지급되었습니다.`
        : '오늘은 해당 축제 보상을 이미 받았습니다. 피드는 등록됩니다.',
      data: {
        id: `feed-${Date.now()}`,
        user_id: userId,
        festival_id: festivalId,
        festival_title: festivalTitle,
        caption,
        image_url: imageUrl,
        latitude,
        longitude,
        rewarded: reward.awarded,
        points_awarded: reward.points,
        badge: reward.badge,
        reward,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : '피드 등록에 실패했습니다.',
    });
  }
};

/** GET /api/feeds/rewards/:userId */
export const getFeedRewards = async (req: Request, res: Response) => {
  const userId = String(req.params.userId ?? DEV_USER_ID);
  return res.json({ success: true, data: getRewardBalance(userId) });
};
