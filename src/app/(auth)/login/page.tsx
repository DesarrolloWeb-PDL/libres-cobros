import { prisma } from '@/lib/db';
import LoginPageClient from './page.client';

async function getSuperAdminTheme() {
  const config = await prisma.siteConfig.findFirst({
    where: { clubId: null, key: 'theme' },
    select: {
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
    },
  });
  
  return config;
}

export default async function LoginPage() {
  const theme = await getSuperAdminTheme();
  
  return <LoginPageClient primaryColor={theme?.primaryColor} />;
}
