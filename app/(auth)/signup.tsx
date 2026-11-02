import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { promptContactAdmin } from '@/features/auth/contactAdmin';

/** Self-serve signup is disabled — accounts are admin-provisioned. */
export default function SignUpScreen() {
  const router = useRouter();

  useEffect(() => {
    promptContactAdmin('Contact Us');
    router.replace('/(auth)');
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <BrandSplash mode="blank" />
    </View>
  );
}
