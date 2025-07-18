
import { redirect } from 'next/navigation';

export default function UsersPage() {
  // This page is now consolidated into /settings/users for admins.
  // Redirecting to avoid duplicate content and ensure a single source of truth.
  redirect('/settings/users');
}
