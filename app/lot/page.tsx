import { redirect } from 'next/navigation';

/**
 * Bare `/lot` has no lot to show.
 *
 * The auction engine (scheduling, bidding, closing) belongs to the next phase, so this route does
 * not invent a lot: it goes to the auctions overview, which reports honestly what is prepared and
 * what is not yet open. A real lot will live at `/lot/<lotId>` once Phase 06 defines it.
 */
export default function LotIndexPage() {
  redirect('/auctions');
}
