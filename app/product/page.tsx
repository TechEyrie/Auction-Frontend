import { redirect } from 'next/navigation';

/**
 * Bare `/product` has no listing to show.
 *
 * Before Phase 05 this route rendered one hard-coded demo vehicle for every card on the site, so
 * every link appeared to work while showing the same record. It now sends the visitor to browse,
 * where real published listings are listed; a real ad lives at `/product/<listingReference>` or its published slug URL.
 */
export default function ProductIndexPage() {
  redirect('/browse');
}
