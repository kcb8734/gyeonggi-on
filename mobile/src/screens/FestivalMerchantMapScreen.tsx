import React from 'react';
import MainMap from '../components/map/MainMap';

export default function FestivalMerchantMapScreen({
  festivalId,
  userId,
}: {
  festivalId?: string;
  userId: string;
}) {
  return <MainMap festivalId={festivalId} userId={userId} />;
}
