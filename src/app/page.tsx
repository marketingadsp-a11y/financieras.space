
import { redirect } from 'next/navigation';

export default function SuperAdminPage() {
  // Redirect to the new admin management page under settings
  redirect('/settings/admins');
}
