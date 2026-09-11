import { DefaultSession } from 'next-auth';
import type { ScopedRole } from '@/lib/access';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: ScopedRole;
      institutionId: string | null;
      /** @deprecated Use institutionId */
      clubId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: ScopedRole;
    institutionId?: string | null;
    /** @deprecated Use institutionId */
    clubId?: string | null;
  }

  interface JWT {
    id?: string;
    role?: ScopedRole;
    institutionId?: string | null;
    /** @deprecated Use institutionId */
    clubId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: ScopedRole;
    institutionId?: string | null;
    /** @deprecated Use institutionId */
    clubId?: string | null;
  }
}
