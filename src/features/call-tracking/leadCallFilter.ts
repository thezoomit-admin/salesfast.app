import { phoneMatchKey } from '@/features/call-tracking/phoneMatch';

/**
 * Privacy gate for the device call log. Android hands back every call on the
 * phone; only rows whose number belongs to a CRM lead may pass this point.
 * Everything else — personal calls, hidden numbers — is dropped here, so it
 * never reaches the screen, the query cache, or an upload.
 */
export function keepLeadCalls<
  Row extends { number: string },
  Lead extends { phoneKey: string },
>(rows: readonly Row[], leads: readonly Lead[]) {
  const leadByKey = new Map(leads.map((lead) => [lead.phoneKey, lead]));
  const matched: { row: Row; lead: Lead }[] = [];
  for (const row of rows) {
    const key = phoneMatchKey(row.number);
    const lead = key ? leadByKey.get(key) : undefined;
    if (lead) matched.push({ row, lead });
  }
  return matched;
}
