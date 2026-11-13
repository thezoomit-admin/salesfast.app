import { Redirect } from 'expo-router';
import { memo } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { canViewAllLeads } from '@/features/auth/leadAccess';
import { LeadsListScreen } from '@/features/leads/LeadsListScreen';

/**
 * All Leads — every lead in scope. Hidden from the tab bar when the account
 * lacks All Leads access; deep links then fall back to My Leads.
 */
function AllLeadsTab() {
  const { user } = useAuth();
  if (!canViewAllLeads(user)) {
    return <Redirect href="/(tabs)/my-leads" />;
  }
  return <LeadsListScreen mode="all" />;
}

export default memo(AllLeadsTab);
