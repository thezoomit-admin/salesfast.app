import { memo } from 'react';

import { LeadsListScreen } from '@/features/leads/LeadsListScreen';

/** My Leads — assigned to the signed-in user (`mine=true`). */
function MyLeadsTab() {
  return <LeadsListScreen mode="mine" />;
}

export default memo(MyLeadsTab);
