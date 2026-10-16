import { redirect } from 'next/navigation';

/** Public self-service posting is not approved — consignments go through the team. */
export default function PostPage() {
  redirect('/contact');
}
