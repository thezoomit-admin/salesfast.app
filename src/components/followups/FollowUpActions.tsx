import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { CompleteFollowUpSheet } from '@/components/home/CompleteFollowUpSheet';
import { FollowUpActionsSheet } from '@/components/home/FollowUpActionsSheet';
import { RescheduleFollowUpSheet } from '@/components/home/RescheduleFollowUpSheet';

/** The follow-up a card's ⋮ menu or check acts on. */
export type FollowUpTarget = {
  followUpId: number;
  leadId: number;
  leadName: string;
  leadPhone: string | null | undefined;
  type: string | null;
  dueAt: string;
  /** Still Pending or Missed — can be marked done. */
  open: boolean;
};

function dialablePhone(raw: string | null | undefined) {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * The ⋮ menu, Mark as done and Reschedule sheets for follow-up cards — one
 * set per screen. Render `sheets` once; call `openMenu` / `openComplete`.
 */
export function useFollowUpActions() {
  const router = useRouter();
  const [menu, setMenu] = useState<FollowUpTarget | null>(null);
  const [complete, setComplete] = useState<FollowUpTarget | null>(null);
  const [reschedule, setReschedule] = useState<FollowUpTarget | null>(null);

  const openMenu = useCallback((target: FollowUpTarget) => setMenu(target), []);
  const openComplete = useCallback((target: FollowUpTarget) => setComplete(target), []);

  const phone = dialablePhone(menu?.leadPhone);
  const sheets = (
    <>
      <FollowUpActionsSheet
        open={!!menu}
        leadName={menu?.leadName ?? ''}
        leadPhone={menu?.leadPhone}
        followUpType={menu?.type ?? null}
        dueAt={menu?.dueAt ?? null}
        onClose={() => setMenu(null)}
        onComplete={menu?.open ? () => setComplete(menu) : undefined}
        onOpenLead={() => {
          if (menu) router.push(`/leads/${menu.leadId}`);
        }}
        onReschedule={() => setReschedule(menu)}
        onCall={phone ? () => void Linking.openURL(`tel:${phone}`) : undefined}
      />

      <CompleteFollowUpSheet
        open={!!complete}
        followUpId={complete?.followUpId ?? 0}
        dueAt={complete?.dueAt ?? ''}
        leadId={complete?.leadId ?? 0}
        leadName={complete?.leadName ?? ''}
        followUpType={complete?.type ?? null}
        onClose={() => setComplete(null)}
      />

      <RescheduleFollowUpSheet
        open={!!reschedule}
        leadId={reschedule?.leadId ?? 0}
        leadName={reschedule?.leadName ?? ''}
        followUpType={reschedule?.type ?? null}
        onClose={() => setReschedule(null)}
      />
    </>
  );

  return { openMenu, openComplete, sheets };
}
