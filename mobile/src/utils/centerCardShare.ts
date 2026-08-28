import { downloadCenterCardFace, type CenterCardModel } from './centerCardDocument';

export async function shareCenterCardFace(
  model: CenterCardModel,
  side: 'front' | 'back',
  _view?: unknown,
) {
  return downloadCenterCardFace(model, side);
}
